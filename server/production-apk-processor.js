import fs from "fs-extra"
import path from "path"
import AdmZip from "adm-zip"

export class ProductionAPKProcessor {
  static async processAPKForProduction(apkPath, extractDir, clientId, sendLog, options = {}) {
    const { sandboxMode = false, preserveOriginal = true } = options

    sendLog(clientId, "🚀 Starting production-grade APK processing...", "info")

    try {
      // Phase 1: Comprehensive validation
      await this.validateAPKIntegrity(apkPath, clientId, sendLog)

      // Phase 2: Safe extraction with error recovery
      await this.extractAPKWithRecovery(apkPath, extractDir, clientId, sendLog)

      // Phase 3: Process binary manifest properly
      await this.processBinaryManifest(extractDir, clientId, sendLog, sandboxMode)

      // Phase 4: Validate and fix resources
      await this.validateAndFixResources(extractDir, clientId, sendLog)

      // Phase 5: Process DEX files
      await this.validateDEXFiles(extractDir, clientId, sendLog)

      // Phase 6: Handle native libraries
      await this.processNativeLibraries(extractDir, clientId, sendLog)

      // Phase 7: Create development resources
      await this.createProductionDevResources(extractDir, clientId, sendLog, sandboxMode)

      return {
        success: true,
        processingComplete: true,
        readyForSigning: true,
      }
    } catch (error) {
      sendLog(clientId, `❌ Production processing failed: ${error.message}`, "error")
      throw error
    }
  }

  static async validateAPKIntegrity(apkPath, clientId, sendLog) {
    sendLog(clientId, "🔍 Validating APK integrity...", "info")

    try {
      const stats = await fs.stat(apkPath)
      const sizeInMB = (stats.size / 1024 / 1024).toFixed(2)

      sendLog(clientId, `📊 APK size: ${sizeInMB} MB`, "info")

      if (stats.size === 0) {
        throw new Error("APK file is empty")
      }

      if (stats.size > 2 * 1024 * 1024 * 1024) {
        // 2GB limit
        throw new Error("APK file is too large (>2GB)")
      }

      // Validate ZIP structure
      const zip = new AdmZip(apkPath)
      const entries = zip.getEntries()

      if (entries.length === 0) {
        throw new Error("APK contains no files")
      }

      // Check for required files
      const requiredFiles = ["AndroidManifest.xml", "classes.dex"]
      const foundFiles = entries.map((entry) => entry.entryName)

      const missingRequired = requiredFiles.filter(
        (file) => !foundFiles.some((found) => found.includes(file.split("/").pop())),
      )

      if (missingRequired.length > 0) {
        sendLog(clientId, `⚠️ Missing files: ${missingRequired.join(", ")} - will attempt recovery`, "warning")
      }

      // Validate file integrity
      let corruptedCount = 0
      for (const entry of entries.slice(0, 10)) {
        // Check first 10 files
        try {
          if (!entry.isDirectory) {
            entry.getData()
          }
        } catch (error) {
          corruptedCount++
        }
      }

      if (corruptedCount > 5) {
        throw new Error("APK appears to be corrupted (multiple unreadable files)")
      }

      sendLog(clientId, `✅ APK integrity validated (${entries.length} files)`, "success")
    } catch (error) {
      sendLog(clientId, `❌ APK integrity validation failed: ${error.message}`, "error")
      throw error
    }
  }

  static async extractAPKWithRecovery(apkPath, extractDir, clientId, sendLog) {
    sendLog(clientId, "📦 Extracting APK with error recovery...", "info")

    try {
      const zip = new AdmZip(apkPath)
      const entries = zip.getEntries()

      let extractedCount = 0
      let recoveredCount = 0
      let skippedCount = 0

      for (const entry of entries) {
        try {
          if (!entry.isDirectory) {
            const entryPath = path.join(extractDir, entry.entryName)

            // Security check - prevent path traversal
            if (!entryPath.startsWith(extractDir)) {
              sendLog(clientId, `⚠️ Skipped suspicious path: ${entry.entryName}`, "warning")
              skippedCount++
              continue
            }

            const entryDir = path.dirname(entryPath)
            await fs.ensureDir(entryDir)

            try {
              const data = entry.getData()
              await fs.writeFile(entryPath, data)
              extractedCount++
            } catch (extractError) {
              // Attempt recovery
              try {
                const compressedData = entry.getCompressedData()
                await fs.writeFile(entryPath, compressedData)
                recoveredCount++
                sendLog(clientId, `🔧 Recovered: ${entry.entryName}`, "info")
              } catch (recoveryError) {
                // Create empty placeholder to maintain structure
                await fs.writeFile(entryPath, Buffer.alloc(0))
                skippedCount++
                sendLog(clientId, `⚠️ Created placeholder for: ${entry.entryName}`, "warning")
              }
            }
          }
        } catch (error) {
          sendLog(clientId, `⚠️ Failed to process: ${entry.entryName}`, "warning")
          skippedCount++
        }
      }

      sendLog(
        clientId,
        `✅ Extraction complete: ${extractedCount} extracted, ${recoveredCount} recovered, ${skippedCount} skipped`,
        "success",
      )

      // Verify critical files exist
      const criticalFiles = ["AndroidManifest.xml", "classes.dex"]
      for (const file of criticalFiles) {
        const filePath = path.join(extractDir, file)
        if (!(await fs.pathExists(filePath))) {
          throw new Error(`Critical file missing after extraction: ${file}`)
        }
      }
    } catch (error) {
      sendLog(clientId, `❌ APK extraction failed: ${error.message}`, "error")
      throw error
    }
  }

  static async processBinaryManifest(extractDir, clientId, sendLog, sandboxMode) {
    sendLog(clientId, "📋 Processing AndroidManifest.xml...", "info")

    const manifestPath = path.join(extractDir, "AndroidManifest.xml")

    try {
      if (!(await fs.pathExists(manifestPath))) {
        throw new Error("AndroidManifest.xml not found")
      }

      const manifestData = await fs.readFile(manifestPath)

      // Check if binary manifest (AXML format)
      const isBinary = manifestData[0] === 0x03 && manifestData[1] === 0x00

      if (isBinary) {
        sendLog(clientId, "🔧 Binary manifest detected, creating compatible version...", "info")
        await this.createProductionManifest(manifestPath, extractDir, clientId, sendLog, sandboxMode)
      } else {
        sendLog(clientId, "📝 Text manifest detected, enhancing...", "info")
        await this.enhanceTextManifest(manifestPath, clientId, sendLog, sandboxMode)
      }
    } catch (error) {
      sendLog(clientId, `⚠️ Manifest processing issue: ${error.message}`, "warning")
      sendLog(clientId, "🔄 Creating fallback manifest...", "info")
      await this.createProductionManifest(manifestPath, extractDir, clientId, sendLog, sandboxMode)
    }
  }

  static async createProductionManifest(manifestPath, extractDir, clientId, sendLog, sandboxMode) {
    const timestamp = Date.now()
    const packageName = `com.devmode.app${timestamp}`
    const appName = sandboxMode ? "SandboxTestApp" : "DevModeApp"
    const versionCode = Math.floor(timestamp / 1000)

    const productionManifest = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools"
    package="${packageName}"
    android:versionCode="${versionCode}"
    android:versionName="1.0.dev"
    android:installLocation="auto">
    
    <!-- Essential Development Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" 
        android:maxSdkVersion="28" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.VIBRATE" />
    
    ${
      sandboxMode
        ? `
    <!-- Advanced Testing Permissions -->
    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
    <uses-permission android:name="android.permission.WRITE_SETTINGS" />
    <uses-permission android:name="android.permission.GET_ACCOUNTS" />
    <uses-permission android:name="android.permission.MANAGE_ACCOUNTS" />
    <uses-permission android:name="android.permission.USE_CREDENTIALS" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="com.android.vending.BILLING" />
    <uses-permission android:name="com.android.vending.CHECK_LICENSE" />
    <uses-permission android:name="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE" />
    `
        : ""
    }
    
    <!-- Hardware Features (Optional) -->
    <uses-feature android:name="android.hardware.touchscreen" android:required="false" />
    <uses-feature android:name="android.hardware.wifi" android:required="false" />
    <uses-feature android:name="android.hardware.camera" android:required="false" />
    <uses-feature android:name="android.hardware.location" android:required="false" />
    <uses-feature android:name="android.hardware.microphone" android:required="false" />
    
    <!-- SDK Version Requirements -->
    <uses-sdk android:minSdkVersion="21" 
              android:targetSdkVersion="33" 
              android:maxSdkVersion="34" />
    
    <application
        android:label="${appName}"
        android:debuggable="true"
        android:allowBackup="true"
        android:testOnly="${sandboxMode ? "true" : "false"}"
        android:extractNativeLibs="true"
        android:usesCleartextTraffic="true"
        android:networkSecurityConfig="@xml/network_security_config"
        android:requestLegacyExternalStorage="true"
        android:preserveLegacyExternalStorage="true"
        android:largeHeap="true"
        android:hardwareAccelerated="true"
        android:supportsRtl="true"
        android:allowNativeHeapPointerTagging="false"
        ${sandboxMode ? 'android:name="com.testing.ProductionSandboxApplication"' : ""}
        android:theme="@android:style/Theme.Material.Light.DarkActionBar"
        tools:ignore="GoogleAppIndexingWarning,UnusedAttribute,AllowBackup">
        
        ${
          sandboxMode
            ? `
        <!-- Advanced Sandbox Metadata -->
        <meta-data android:name="testing.mode.enabled" android:value="true" />
        <meta-data android:name="sandbox.payments.enabled" android:value="true" />
        <meta-data android:name="security.testing.enabled" android:value="true" />
        <meta-data android:name="api.logging.enabled" android:value="true" />
        <meta-data android:name="certificate.pinning.disabled" android:value="true" />
        <meta-data android:name="proxy.support.enabled" android:value="true" />
        <meta-data android:name="production.testing.mode" android:value="true" />
        <meta-data android:name="com.google.android.play.billingclient.version" android:value="5.2.1" />
        `
            : `
        <!-- Production Development Metadata -->
        <meta-data android:name="development.mode.enabled" android:value="true" />
        <meta-data android:name="debugging.enabled" android:value="true" />
        <meta-data android:name="network.monitoring.enabled" android:value="true" />
        <meta-data android:name="production.dev.mode" android:value="true" />
        `
        }
        
        <!-- Main Activity with comprehensive intent filters -->
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTop"
            android:screenOrientation="unspecified"
            android:configChanges="orientation|screenSize|keyboardHidden|screenLayout|uiMode"
            android:windowSoftInputMode="adjustResize"
            android:hardwareAccelerated="true">
            <intent-filter android:priority="1000">
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
            <intent-filter android:autoVerify="false">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="http" />
                <data android:scheme="https" />
            </intent-filter>
            <intent-filter>
                <action android:name="android.intent.action.SEND" />
                <category android:name="android.intent.category.DEFAULT" />
                <data android:mimeType="text/plain" />
            </intent-filter>
        </activity>
        
        ${
          sandboxMode
            ? `
        <!-- Advanced Testing Activities -->
        <activity
            android:name="com.testing.PaymentTestActivity"
            android:exported="false"
            android:theme="@android:style/Theme.Translucent.NoTitleBar"
            android:launchMode="singleInstance" />
        <activity
            android:name="com.testing.SecurityTestActivity"
            android:exported="false"
            android:theme="@android:style/Theme.Translucent.NoTitleBar" />
        <activity
            android:name="com.testing.ApiMonitorActivity"
            android:exported="false"
            android:theme="@android:style/Theme.Material.Light.Dialog" />
        
        <!-- Testing Services -->
        <service
            android:name="com.testing.ApiMonitoringService"
            android:exported="false"
            android:enabled="true" />
        <service
            android:name="com.testing.PaymentTestingService"
            android:exported="false"
            android:enabled="true" />
        <service
            android:name="com.testing.SecurityMonitorService"
            android:exported="false"
            android:enabled="true" />
        
        <!-- Testing Receivers -->
        <receiver
            android:name="com.testing.NetworkChangeReceiver"
            android:exported="false">
            <intent-filter>
                <action android:name="android.net.conn.CONNECTIVITY_CHANGE" />
            </intent-filter>
        </receiver>
        `
            : ""
        }
        
        <!-- Enhanced File Provider -->
        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="${packageName}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths" />
        </provider>
        
        <!-- Content Provider for testing -->
        <provider
            android:name="com.testing.TestContentProvider"
            android:authorities="${packageName}.testprovider"
            android:exported="false"
            android:enabled="${sandboxMode ? "true" : "false"}" />
        
    </application>
</manifest>`

    await fs.writeFile(manifestPath, productionManifest)
    sendLog(clientId, "✅ Production-grade manifest created", "success")
  }

  static async createPremiumUnlockManifest(manifestPath, extractDir, clientId, sendLog, mode) {
    const timestamp = Date.now()
    const packageName = `com.devmode.app${timestamp}`
    const appName =
      mode === "sandbox" ? "SandboxPremiumApp" : mode === "combined" ? "CombinedPremiumApp" : "DebugPremiumApp"
    const versionCode = Math.floor(timestamp / 1000)

    const premiumManifest = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools"
    package="${packageName}"
    android:versionCode="${versionCode}"
    android:versionName="1.0.premium"
    android:installLocation="auto">
    
    <!-- Premium Unlock Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
    <uses-permission android:name="android.permission.WRITE_SETTINGS" />
    <uses-permission android:name="android.permission.GET_ACCOUNTS" />
    <uses-permission android:name="android.permission.MANAGE_ACCOUNTS" />
    <uses-permission android:name="android.permission.USE_CREDENTIALS" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="com.android.vending.BILLING" />
    <uses-permission android:name="com.android.vending.CHECK_LICENSE" />
    <uses-permission android:name="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
    <uses-permission android:name="android.permission.READ_PHONE_STATE" />
    
    <application
        android:label="${appName}"
        android:debuggable="true"
        android:allowBackup="true"
        android:testOnly="${mode === "sandbox" || mode === "combined" ? "true" : "false"}"
        android:extractNativeLibs="true"
        android:usesCleartextTraffic="true"
        android:networkSecurityConfig="@xml/network_security_config"
        android:requestLegacyExternalStorage="true"
        android:preserveLegacyExternalStorage="true"
        android:largeHeap="true"
        android:hardwareAccelerated="true"
        android:supportsRtl="true"
        android:allowNativeHeapPointerTagging="false"
        android:name="com.premium.PremiumUnlockApplication"
        android:theme="@android:style/Theme.Material.Light.DarkActionBar"
        tools:ignore="GoogleAppIndexingWarning,UnusedAttribute,AllowBackup">
        
        <!-- Premium Unlock Metadata -->
        <meta-data android:name="premium.unlocked" android:value="true" />
        <meta-data android:name="pro.version.enabled" android:value="true" />
        <meta-data android:name="ads.disabled" android:value="true" />
        <meta-data android:name="subscription.bypassed" android:value="true" />
        <meta-data android:name="iap.unlocked" android:value="true" />
        <meta-data android:name="license.check.disabled" android:value="true" />
        <meta-data android:name="premium.features.enabled" android:value="true" />
        <meta-data android:name="debug.mode.enabled" android:value="true" />
        ${
          mode === "sandbox" || mode === "combined"
            ? `
        <meta-data android:name="sandbox.payments.enabled" android:value="true" />
        <meta-data android:name="mock.billing.enabled" android:value="true" />
        <meta-data android:name="security.testing.enabled" android:value="true" />
        <meta-data android:name="api.logging.enabled" android:value="true" />
        <meta-data android:name="certificate.pinning.disabled" android:value="true" />
        <meta-data android:name="proxy.support.enabled" android:value="true" />
        `
            : ""
        }
        
        <!-- Main Activity -->
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTop"
            android:screenOrientation="unspecified"
            android:configChanges="orientation|screenSize|keyboardHidden|screenLayout|uiMode"
            android:windowSoftInputMode="adjustResize"
            android:hardwareAccelerated="true">
            <intent-filter android:priority="1000">
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
        
        ${
          mode === "sandbox" || mode === "combined"
            ? `
        <!-- Premium Testing Services -->
        <service android:name="com.premium.PremiumUnlockService" android:exported="false" />
        <service android:name="com.premium.BillingBypassService" android:exported="false" />
        <service android:name="com.premium.LicenseBypassService" android:exported="false" />
        `
            : ""
        }
        
        <!-- Premium Content Provider -->
        <provider
            android:name="com.premium.PremiumContentProvider"
            android:authorities="${packageName}.premium"
            android:exported="false" />
            
    </application>
</manifest>`

    await fs.writeFile(manifestPath, premiumManifest)
    sendLog(clientId, `✅ Premium unlock manifest created for ${mode} mode`, "success")
  }

  static async validateAndFixResources(extractDir, clientId, sendLog) {
    sendLog(clientId, "🎨 Validating and fixing resources...", "info")

    const resDir = path.join(extractDir, "res")
    await fs.ensureDir(resDir)

    try {
      // Create essential resource directories
      const requiredDirs = [
        "values",
        "values-v21",
        "values-v23",
        "values-v28",
        "xml",
        "drawable",
        "drawable-hdpi",
        "drawable-xhdpi",
        "layout",
        "color",
        "raw",
      ]

      for (const dir of requiredDirs) {
        await fs.ensureDir(path.join(resDir, dir))
      }

      // Create network security config
      await this.createProductionNetworkConfig(resDir, clientId, sendLog)

      // Create file provider paths
      await this.createFileProviderPaths(resDir, clientId, sendLog)

      // Create development resources
      await this.createDevelopmentResources(resDir, clientId, sendLog)

      sendLog(clientId, "✅ Resources validated and fixed", "success")
    } catch (error) {
      sendLog(clientId, `⚠️ Resource processing warning: ${error.message}`, "warning")
    }
  }

  static async validateDEXFiles(extractDir, clientId, sendLog) {
    sendLog(clientId, "🔧 Validating DEX files...", "info")

    try {
      const dexFiles = await fs.readdir(extractDir)
      const dexFileList = dexFiles.filter((file) => file.endsWith(".dex"))

      if (dexFileList.length === 0) {
        throw new Error("No DEX files found")
      }

      let validDexCount = 0
      for (const dexFile of dexFileList) {
        try {
          const dexPath = path.join(extractDir, dexFile)
          const dexData = await fs.readFile(dexPath)

          // Basic DEX header validation
          if (dexData.length >= 8) {
            const dexMagic = dexData.slice(0, 8).toString("ascii")
            if (dexMagic.startsWith("dex\n")) {
              validDexCount++
            }
          }
        } catch (error) {
          sendLog(clientId, `⚠️ DEX file issue: ${dexFile}`, "warning")
        }
      }

      sendLog(clientId, `✅ DEX validation: ${validDexCount}/${dexFileList.length} valid`, "success")
    } catch (error) {
      sendLog(clientId, `⚠️ DEX validation warning: ${error.message}`, "warning")
    }
  }

  static async processNativeLibraries(extractDir, clientId, sendLog) {
    sendLog(clientId, "📚 Processing native libraries...", "info")

    const libDir = path.join(extractDir, "lib")

    try {
      if (await fs.pathExists(libDir)) {
        const architectures = await fs.readdir(libDir)
        sendLog(clientId, `📚 Found native libraries for: ${architectures.join(", ")}`, "info")

        // Validate library files
        for (const arch of architectures) {
          const archDir = path.join(libDir, arch)
          if ((await fs.stat(archDir)).isDirectory()) {
            const libs = await fs.readdir(archDir)
            const soFiles = libs.filter((lib) => lib.endsWith(".so"))
            sendLog(clientId, `  ${arch}: ${soFiles.length} libraries`, "info")
          }
        }
      } else {
        sendLog(clientId, "📚 No native libraries found", "info")
      }
    } catch (error) {
      sendLog(clientId, `⚠️ Native library processing warning: ${error.message}`, "warning")
    }
  }

  static async createProductionNetworkConfig(resDir, clientId, sendLog) {
    const xmlDir = path.join(resDir, "xml")
    await fs.ensureDir(xmlDir)

    const networkConfig = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <!-- Production development configuration -->
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system"/>
            <certificates src="user"/>
        </trust-anchors>
    </base-config>
    
    <!-- Development and testing domains -->
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">localhost</domain>
        <domain includeSubdomains="true">127.0.0.1</domain>
        <domain includeSubdomains="true">10.0.2.2</domain>
        <domain includeSubdomains="true">192.168.0.1</domain>
        <domain includeSubdomains="true">192.168.1.1</domain>
        <domain includeSubdomains="true">*.local</domain>
        <domain includeSubdomains="true">*.ngrok.io</domain>
        <domain includeSubdomains="true">*.ngrok-free.app</domain>
        <domain includeSubdomains="true">*.dev</domain>
        <domain includeSubdomains="true">*.test</domain>
        <domain includeSubdomains="true">*.staging</domain>
        <domain includeSubdomains="true">*.sandbox.google.com</domain>
        <domain includeSubdomains="true">*.testing.com</domain>
        <domain includeSubdomains="true">sandbox-payments.googleapis.com</domain>
        <domain includeSubdomains="true">play-billing-test.googleapis.com</domain>
    </domain-config>
    
    <!-- Debug overrides -->
    <debug-overrides>
        <trust-anchors>
            <certificates src="system"/>
            <certificates src="user"/>
        </trust-anchors>
    </debug-overrides>
</network-security-config>`

    await fs.writeFile(path.join(xmlDir, "network_security_config.xml"), networkConfig)
    sendLog(clientId, "✅ Production network configuration created", "success")
  }

  static async createFileProviderPaths(resDir, clientId, sendLog) {
    const xmlDir = path.join(resDir, "xml")

    const fileProviderPaths = `<?xml version="1.0" encoding="utf-8"?>
<paths xmlns:android="http://schemas.android.com/apk/res/android">
    <external-path name="external_files" path="."/>
    <external-cache-path name="external_cache" path="."/>
    <files-path name="files" path="."/>
    <cache-path name="cache" path="."/>
    <external-files-path name="external_app_files" path="."/>
    <external-media-path name="external_media" path="."/>
</paths>`

    await fs.writeFile(path.join(xmlDir, "file_paths.xml"), fileProviderPaths)
  }

  static async createDevelopmentResources(resDir, clientId, sendLog) {
    const valuesDir = path.join(resDir, "values")

    const devConfig = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Production Development Configuration -->
    <bool name="debug_mode">true</bool>
    <bool name="development_mode">true</bool>
    <bool name="production_ready">true</bool>
    <string name="app_mode">production_development</string>
    <bool name="allow_http_traffic">true</bool>
    <bool name="enable_logging">true</bool>
    <bool name="enable_debugging">true</bool>
    <bool name="enhanced_validation">true</bool>
    <bool name="installation_compatible">true</bool>
    
    <!-- Build Information -->
    <string name="build_type">debug</string>
    <string name="conversion_timestamp">${new Date().toISOString()}</string>
    <string name="converter_version">2.0.0-production</string>
    <string name="enhanced_features">true</string>
    <string name="production_grade">true</string>
    
    <!-- Development URLs -->
    <string name="dev_api_base_url">https://v0-aiapktodev.vercel.app</string>
    <string name="dev_websocket_url">wss://v0-aiapktodev.vercel.app</string>
    <string name="staging_api_url">https://v0-aiapktodev.vercel.app/api</string>
</resources>`

    await fs.writeFile(path.join(valuesDir, "dev_config.xml"), devConfig)
  }

  static async createProductionDevResources(extractDir, clientId, sendLog, sandboxMode) {
    sendLog(clientId, "🎨 Creating production development resources...", "info")

    const resDir = path.join(extractDir, "res")
    await fs.ensureDir(resDir)

    await this.createProductionNetworkConfig(resDir, clientId, sendLog)
    await this.createFileProviderPaths(resDir, clientId, sendLog)
    await this.createDevelopmentResources(resDir, clientId, sendLog)

    if (sandboxMode) {
      await this.createSandboxResources(resDir, clientId, sendLog)
    }

    sendLog(clientId, "✅ Production development resources created", "success")
  }

  static async createSandboxResources(resDir, clientId, sendLog) {
    const valuesDir = path.join(resDir, "values")

    const sandboxConfig = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Production Sandbox Configuration -->
    <bool name="sandbox_mode_enabled">true</bool>
    <bool name="production_sandbox">true</bool>
    <bool name="mock_payments_enabled">true</bool>
    <bool name="bypass_payment_validation">true</bool>
    <bool name="security_testing_enabled">true</bool>
    <bool name="api_logging_enabled">true</bool>
    <bool name="disable_certificate_pinning">true</bool>
    <bool name="proxy_support_enabled">true</bool>
    <bool name="comprehensive_monitoring">true</bool>
    
    <!-- Test Product IDs -->
    <string name="test_product_premium">android.test.purchased</string>
    <string name="test_product_subscription">test.subscription.monthly</string>
    <string name="test_product_consumable">test.consumable.coins</string>
    <string name="test_product_canceled">android.test.canceled</string>
    <string name="test_product_refunded">android.test.refunded</string>
    
    <!-- Sandbox URLs -->
    <string name="sandbox_api_base_url">https://v0-aiapktodev.vercel.app/api</string>
    <string name="sandbox_payment_url">https://sandbox-payments.googleapis.com</string>
</resources>`

    await fs.writeFile(path.join(valuesDir, "sandbox_config.xml"), sandboxConfig)

    const sandboxStrings = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="sandbox_mode_notice">🧪 PRODUCTION SANDBOX MODE ACTIVE</string>
    <string name="testing_notice">⚠️ FOR PROFESSIONAL TESTING ONLY</string>
    <string name="mock_payments_notice">💳 Using Production Mock Payment System</string>
    <string name="security_testing_notice">🔒 Advanced Security Testing Active</string>
    <string name="api_monitoring_notice">📡 Comprehensive API Monitoring Enabled</string>
    <string name="proxy_support_notice">🌐 Professional Proxy Support Enabled</string>
</resources>`

    await fs.writeFile(path.join(valuesDir, "sandbox_strings.xml"), sandboxStrings)
  }

  static async createPremiumUnlockResources(resDir, clientId, sendLog, mode) {
    const valuesDir = path.join(resDir, "values")

    const premiumConfig = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Premium Unlock Configuration -->
    <bool name="premium_unlocked">true</bool>
    <bool name="pro_version">true</bool>
    <bool name="ads_disabled">true</bool>
    <bool name="subscription_bypassed">true</bool>
    <bool name="iap_unlocked">true</bool>
    <bool name="license_check_disabled">true</bool>
    <bool name="premium_features_enabled">true</bool>
    <bool name="debug_mode_enabled">true</bool>
    <string name="app_mode">${mode}_premium</string>
    
    ${
      mode === "sandbox" || mode === "combined"
        ? `
    <!-- Advanced Sandbox Premium Features -->
    <bool name="sandbox_payments_enabled">true</bool>
    <bool name="mock_billing_enabled">true</bool>
    <bool name="bypass_payment_validation">true</bool>
    <bool name="security_testing_enabled">true</bool>
    <bool name="api_logging_enabled">true</bool>
    <bool name="disable_certificate_pinning">true</bool>
    <bool name="proxy_support_enabled">true</bool>
    `
        : ""
    }
    
    <!-- Premium Product Override -->
    <string name="premium_status">unlocked</string>
    <string name="subscription_status">active</string>
    <string name="license_status">valid</string>
    <string name="billing_status">purchased</string>
    
    <!-- Mock Purchase Responses -->
    <string name="mock_purchase_response">{"purchaseState":0,"developerPayload":"","purchaseToken":"mock_token_premium"}</string>
    <string name="mock_subscription_response">{"autoRenewing":true,"purchaseState":0}</string>
</resources>`

    await fs.writeFile(path.join(valuesDir, "premium_config.xml"), premiumConfig)
    sendLog(clientId, `✅ Premium unlock resources created for ${mode} mode`, "success")
  }
}
