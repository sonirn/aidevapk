import { type NextRequest, NextResponse } from "next/server"
import { uploadFile, createConversion } from "@/lib/supabase"
import { supabaseAdmin } from "@/lib/supabase"
import AdmZip from "adm-zip"
import { v4 as uuidv4 } from "uuid"
import xml2js from 'xml2js'
import { parseString, Builder } from 'xml2js'

// Enhanced logging function
function sendLog(clientId: string, message: string, logType = "info") {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] [${clientId?.slice(0, 8) || "UNKNOWN"}] ${message}`)
}

// APK Validation with comprehensive checks
async function validateAPK(apkBuffer: Buffer, clientId: string): Promise<boolean> {
  try {
    sendLog(clientId, "🔍 Validating APK structure...", "info")

    if (apkBuffer.length === 0) {
      throw new Error("APK file is empty")
    }

    if (apkBuffer.length > 500 * 1024 * 1024) {
      throw new Error("APK file is too large (>500MB)")
    }

    const zip = new AdmZip(apkBuffer)
    const entries = zip.getEntries()

    if (entries.length === 0) {
      throw new Error("APK contains no files")
    }

    // Check for required files
    const hasManifest = entries.some((entry) => entry.entryName === "AndroidManifest.xml")
    const hasDex = entries.some((entry) => entry.entryName.endsWith(".dex"))

    if (!hasManifest) {
      throw new Error("AndroidManifest.xml not found")
    }

    if (!hasDex) {
      sendLog(clientId, "⚠️ No DEX files found - APK may not be standard", "warning")
    }

    sendLog(
      clientId,
      `✅ APK validation passed (${entries.length} files, ${(apkBuffer.length / 1024 / 1024).toFixed(2)} MB)`,
      "success",
    )
    return true
  } catch (error) {
    sendLog(clientId, `❌ APK validation failed: ${error}`, "error")
    return false
  }
}

async function modifyManifest(manifestXml: string, mode: string): Promise<string> {
  return new Promise((resolve, reject) => {
    parseString(manifestXml, (err, result) => {
      if (err) return reject(err)

      // Add premium permissions
      if (!result.manifest['uses-permission']) {
        result.manifest['uses-permission'] = []
      }

      // Add basic premium permissions
      const premiumPermissions = [
        { '$': { 'android:name': 'android.permission.INTERNET' } },
        { '$': { 'android:name': 'android.permission.ACCESS_NETWORK_STATE' } }
      ]

      result.manifest['uses-permission'] = [
        ...result.manifest['uses-permission'],
        ...premiumPermissions
      ]

      // Add premium metadata to application
      if (!result.manifest.application) {
        result.manifest.application = [{}]
      }

      if (!result.manifest.application[0]['meta-data']) {
        result.manifest.application[0]['meta-data'] = []
      }

      result.manifest.application[0]['meta-data'].push(
        { '$': { 'android:name': 'premium.unlocked', 'android:value': 'true' } },
        { '$': { 'android:name': 'pro.version', 'android:value': 'true' } }
      )

      // Add sandbox components if needed
      if (mode === "sandbox" || mode === "combined") {
        if (!result.manifest.application[0]['service']) {
          result.manifest.application[0]['service'] = []
        }

        result.manifest.application[0]['service'].push({
          '$': {
            'android:name': 'com.premium.BillingBypassService',
            'android:enabled': 'true',
            'android:exported': 'false'
          }
        })
      }

      const builder = new Builder()
      resolve(builder.buildObject(result))
    })
  })
}

async function modifyResources(resourcesXml: string, mode: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!resourcesXml.trim()) {
      resourcesXml = '<resources></resources>'
    }

    parseString(resourcesXml, (err, result) => {
      if (err) return reject(err)

      if (!result.resources) {
        result.resources = {}
      }

      if (!result.resources['bool']) {
        result.resources['bool'] = []
      }

      // Add premium flags
      result.resources['bool'].push(
        { '$': { 'name': 'premium_unlocked' }, '_': 'true' },
        { '$': { 'name': 'pro_version' }, '_': 'true' }
      )

      if (!result.resources['string']) {
        result.resources['string'] = []
      }

      result.resources['string'].push(
        { '$': { 'name': 'premium_mode' }, '_': mode }
      )

      const builder = new Builder()
      resolve(builder.buildObject(result))
    })
  })
}

async function processAPK(apkBuffer: Buffer, mode: string, clientId: string): Promise<Buffer> {
  const zip = new AdmZip(apkBuffer)

  // 1. Process AndroidManifest.xml
  const manifestEntry = zip.getEntry("AndroidManifest.xml")
  if (!manifestEntry) {
    throw new Error("AndroidManifest.xml not found in APK")
  }

  const manifestXml = manifestEntry.getData().toString()
  const modifiedManifest = await modifyManifest(manifestXml, mode)
  zip.deleteFile("AndroidManifest.xml")
  zip.addFile("AndroidManifest.xml", Buffer.from(modifiedManifest))

  // 2. Process resources
  const resPath = "res/values/strings.xml"
  const resEntry = zip.getEntry(resPath)
  
  const resourcesXml = resEntry ? resEntry.getData().toString() : '<resources></resources>'
  const modifiedResources = await modifyResources(resourcesXml, mode)
  
  if (resEntry) {
    zip.deleteFile(resPath)
  }
  zip.addFile(resPath, Buffer.from(modifiedResources))

  return zip.toBuffer()
}

export async function POST(req: NextRequest) {
  const clientId = uuidv4()
  
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File
    const mode = formData.get("mode") as string || "standard"

    if (!file) {
      sendLog(clientId, "❌ No file uploaded", "error")
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    sendLog(clientId, `📥 Received file: ${file.name} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`, "info")

    // Validate APK
    const isValid = await validateAPK(buffer, clientId)
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid APK file" },
        { status: 400 }
      )
    }

    // Process APK
    sendLog(clientId, "🛠 Processing APK...", "info")
    const modifiedBuffer = await processAPK(buffer, mode, clientId)

    // Upload to storage
    sendLog(clientId, "📤 Uploading modified APK...", "info")
    const outputFilename = `${file.name.replace('.apk', '')}_premium.apk`
    const { data, error } = await uploadFile(outputFilename, modifiedBuffer)

    if (error) {
      sendLog(clientId, `❌ Upload failed: ${error.message}`, "error")
      throw error
    }

    // Create conversion record
    await createConversion({
      client_id: clientId,
      original_filename: file.name,
      converted_filename: outputFilename,
      file_size: file.size,
      mode: mode,
      download_url: data.path
    })

    sendLog(clientId, `✅ Conversion successful: ${outputFilename}`, "success")
    return NextResponse.json({
      downloadUrl: data.path,
      filename: outputFilename
    })

  } catch (error) {
    sendLog(clientId, `❌ Conversion failed: ${error}`, "error")
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
