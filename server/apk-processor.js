import fs from "fs-extra"
import path from "path"
import AdmZip from "adm-zip"
import xml2js from "xml2js"
import { APKValidator } from "./apk-validator.js"

export class APKProcessor {
  static async extractAPKSafely(apkPath, extractDir, clientId, sendLog) {
    sendLog(clientId, "📦 Starting safe APK extraction...", "info")

    try {
      // Validate APK first
      await APKValidator.validateAPKStructure(apkPath, clientId, sendLog)

      const zip = new AdmZip(apkPath)
      const entries = zip.getEntries()

      sendLog(clientId, `📁 Extracting ${entries.length} files...`, "info")

      let extractedCount = 0
      let skippedCount = 0

      // Extract files with error handling
      for (const entry of entries) {
        try {
          if (!entry.isDirectory) {
            const entryPath = path.join(extractDir, entry.entryName)
            const entryDir = path.dirname(entryPath)

            // Ensure directory exists
            await fs.ensureDir(entryDir)

            // Extract file
            const data = entry.getData()
            await fs.writeFile(entryPath, data)
            extractedCount++
          }
        } catch (error) {
          sendLog(clientId, `⚠️ Skipped ${entry.entryName}: ${error.message}`, "warning")
          skippedCount++
        }
      }

      sendLog(
        clientId,
        `✅ Extraction completed: ${extractedCount} files extracted, ${skippedCount} skipped`,
        "success",
      )

      // Validate extraction
      await APKValidator.checkInstallationCompatibility(extractDir, clientId, sendLog)

      return {
        success: true,
        extractedFiles: extractedCount,
        skippedFiles: skippedCount,
      }
    } catch (error) {
      sendLog(clientId, `❌ Extraction failed: ${error.message}`, "error")
      throw error
    }
  }

  static async processManifestSafely(manifestPath, clientId, sendLog, sandboxMode = false) {
    sendLog(clientId, "📋 Processing AndroidManifest.xml safely...", "info")

    try {
      const manifestValidation = await APKValidator.validateManifestStructure(manifestPath, clientId, sendLog)

      if (manifestValidation.isBinary) {
        // Create a new compatible manifest
        await this.createCompatibleManifest(manifestPath, clientId, sendLog, sandboxMode)
        return true
      }

      // Process existing XML manifest
      const manifestContent = await fs.readFile(manifestPath, "utf8")
      const parser = new xml2js.Parser({
        explicitArray: false,
        mergeAttrs: true,
        explicitRoot: true,
        trim: true,
        normalize: true,
      })

      const builder = new xml2js.Builder({
        xmldec: { version: "1.0", encoding: "utf-8" },
        renderOpts: { pretty: true, indent: "  " },
      })

      const result = await parser.parseStringPromise(manifestContent)

      // Ensure proper structure
      if (!result.manifest) {
        result.manifest = {}
      }

      if (!result.manifest.application) {
        result.manifest.application = {}
      }

      // Add development attributes
      const devAttrs = sandboxMode
        ? {
            "android:debuggable": "true",
            "android:testOnly": "true",
            "android:allowBackup": "true",
            "android:extractNativeLibs": "true",
            "android:usesCleartextTraffic": "true",
            "android:networkSecurityConfig": "@xml/network_security_config",
            "android:name": "com.testing.SandboxApplication",
          }
        : {
            "android:debuggable": "true",
            "android:allowBackup": "true",
            "android:testOnly": "false",
            "android:extractNativeLibs": "true",
            "android:usesCleartextTraffic": "true",
            "android:networkSecurityConfig": "@xml/network_security_config",
          }

      Object.assign(result.manifest.application, devAttrs)

      // Add required permissions
      const requiredPermissions = [
        "android.permission.INTERNET",
        "android.permission.ACCESS_NETWORK_STATE",
        "android.permission.ACCESS_WIFI_STATE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.READ_EXTERNAL_STORAGE",
      ]

      if (sandboxMode) {
        requiredPermissions.push(
          "android.permission.SYSTEM_ALERT_WINDOW",
          "android.permission.WRITE_SETTINGS",
          "com.android.vending.BILLING",
          "com.android.vending.CHECK_LICENSE",
        )
      }

      if (!result.manifest["uses-permission"]) {
        result.manifest["uses-permission"] = []
      }

      if (!Array.isArray(result.manifest["uses-permission"])) {
        result.manifest["uses-permission"] = [result.manifest["uses-permission"]]
      }

      let addedPermissions = 0
      requiredPermissions.forEach((permission) => {
        const exists = result.manifest["uses-permission"].some((p) => p && p["android:name"] === permission)
        if (!exists) {
          result.manifest["uses-permission"].push({
            "android:name": permission,
          })
          addedPermissions++
        }
      })

      sendLog(clientId, `✅ Added ${addedPermissions} development permissions`, "success")

      // Write modified manifest
      const modifiedXml = builder.buildObject(result)
      await fs.writeFile(manifestPath, modifiedXml)

      sendLog(clientId, "✅ Manifest processed successfully", "success")
      return true
    } catch (error) {
      sendLog(clientId, `❌ Manifest processing failed: ${error.message}`, "error")

      // Fallback: create basic manifest
      sendLog(clientId, "🔄 Creating fallback manifest...", "info")
      await this.createCompatibleManifest(manifestPath, clientId, sendLog, sandboxMode)
      return true
    }
  }

  static async createCompatibleManifest(manifestPath, clientId, sendLog, sandboxMode = false) {
    sendLog(clientId, "📋 Creating installation-compatible manifest...", "info")

    const packageName = `com.devmode.${Date.now()}`
    const appName = sandboxMode ? "SandboxApp" : "DevModeApp"

    const compatibleManifest = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="${packageName}"
    android:versionCode="1"
    android:versionName="1.0"
    android:installLocation="auto">
    
    <!-- Essential Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    
    ${
      sandboxMode
        ? `
    <!-- Sandbox Testing Permissions -->
    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
    <uses-permission android:name="android.permission.WRITE_SETTINGS" />
    <uses-permission android:name="android.permission.GET_ACCOUNTS" />
    <uses-permission android:name="com.android.vending.BILLING" />
    <uses-permission android:name="com.android.vending.CHECK_LICENSE" />
    `
        : ""
    }
    
    <!-- Hardware Features (Optional) -->
    <uses-feature android:name="android.hardware.touchscreen" android:required="false" />
    <uses-feature android:name="android.hardware.wifi" android:required="false" />
    
    <application
        android:label="${appName}"
        android:debuggable="true"
        android:allowBackup="true"
        android:testOnly="${sandboxMode ? "true" : "false"}"
        android:extractNativeLibs="true"
        android:usesCleartextTraffic="true"
        android:networkSecurityConfig="@xml/network_security_config"
        ${sandboxMode ? 'android:name="com.testing.SandboxApplication"' : ""}
        android:theme="@android:style/Theme.Material.Light">
        
        ${
          sandboxMode
            ? `
        <!-- Sandbox Testing Metadata -->
        <meta-data android:name="testing.mode.enabled" android:value="true" />
        <meta-data android:name="sandbox.payments.enabled" android:value="true" />
        <meta-data android:name="security.testing.enabled" android:value="true" />
        <meta-data android:name="api.logging.enabled" android:value="true" />
        `
            : ""
        }
        
        <!-- Default Activity -->
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTop">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
        
    </application>
</manifest>`

    await fs.writeFile(manifestPath, compatibleManifest)
    sendLog(clientId, "✅ Compatible manifest created successfully", "success")
  }

  static async repackageAPKSafely(extractDir, outputPath, clientId, sendLog) {
    sendLog(clientId, "📦 Starting safe APK repackaging...", "info")

    try {
      const zip = new AdmZip()

      // Remove old signatures to prevent installation conflicts
      const metaInfPath = path.join(extractDir, "META-INF")
      if (await fs.pathExists(metaInfPath)) {
        sendLog(clientId, "🗑️ Removing original signatures for dev installation...", "info")
        await fs.remove(metaInfPath)
      }

      // Add all files recursively
      const addDirectory = async (dirPath, zipPath = "") => {
        const items = await fs.readdir(dirPath)
        let addedFiles = 0

        for (const item of items) {
          try {
            const fullPath = path.join(dirPath, item)
            const zipItemPath = zipPath ? `${zipPath}/${item}` : item
            const stats = await fs.stat(fullPath)

            if (stats.isDirectory()) {
              const subFiles = await addDirectory(fullPath, zipItemPath)
              addedFiles += subFiles
            } else {
              const fileContent = await fs.readFile(fullPath)
              zip.addFile(zipItemPath, fileContent)
              addedFiles++
            }
          } catch (error) {
            sendLog(clientId, `⚠️ Skipped ${item}: ${error.message}`, "warning")
          }
        }

        return addedFiles
      }

      const totalFiles = await addDirectory(extractDir)
      sendLog(clientId, `📁 Added ${totalFiles} files to APK`, "info")

      // Write the new APK
      const buffer = zip.toBuffer()
      await fs.writeFile(outputPath, buffer)

      // Verify the output
      const stats = await fs.stat(outputPath)
      const sizeInMB = (stats.size / 1024 / 1024).toFixed(2)

      sendLog(clientId, `✅ APK repackaged successfully (${sizeInMB} MB)`, "success")
      sendLog(clientId, "📱 APK is ready for installation on development devices", "success")
      sendLog(clientId, "🌐 Visit https://v0-aiapktodev.vercel.app for more information.", "info")

      return {
        success: true,
        outputSize: stats.size,
        outputSizeMB: Number.parseFloat(sizeInMB),
        totalFiles: totalFiles,
      }
    } catch (error) {
      sendLog(clientId, `❌ Repackaging failed: ${error.message}`, "error")
      throw error
    }
  }
}
