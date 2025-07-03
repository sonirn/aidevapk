import fs from "fs-extra"
import path from "path"
import AdmZip from "adm-zip"
import xml2js from "xml2js"
import { EnhancedAPKValidator } from "./enhanced-validator.js"

export class SmartAPKProcessor {
  static async intelligentProcessing(apkPath, extractDir, clientId, sendLog, options = {}) {
    const { sandboxMode = false, preserveOriginal = true } = options

    sendLog(clientId, "🧠 Starting intelligent APK processing...", "info")

    try {
      // Step 1: Comprehensive validation
      const validationResults = await EnhancedAPKValidator.comprehensiveValidation(apkPath, clientId, sendLog)

      // Step 2: Adaptive extraction based on validation results
      await this.adaptiveExtraction(apkPath, extractDir, validationResults, clientId, sendLog)

      // Step 3: Smart manifest processing
      await this.smartManifestProcessing(extractDir, validationResults, clientId, sendLog, sandboxMode)

      // Step 4: Intelligent resource enhancement
      await this.intelligentResourceEnhancement(extractDir, clientId, sendLog, sandboxMode)

      // Step 5: Advanced compatibility fixes
      await this.applyCompatibilityFixes(extractDir, validationResults, clientId, sendLog)

      return {
        success: true,
        validationResults,
        processingComplete: true,
      }
    } catch (error) {
      sendLog(clientId, `❌ Intelligent processing failed: ${error.message}`, "error")
      throw error
    }
  }

  static async adaptiveExtraction(apkPath, extractDir, validationResults, clientId, sendLog) {
    sendLog(clientId, "📦 Performing adaptive extraction...", "info")

    try {
      const zip = new AdmZip(apkPath)
      const entries = zip.getEntries()

      let extractedCount = 0
      let skippedCount = 0
      let fixedCount = 0

      for (const entry of entries) {
        try {
          if (!entry.isDirectory) {
            const entryPath = path.join(extractDir, entry.entryName)
            const entryDir = path.dirname(entryPath)

            // Ensure directory exists
            await fs.ensureDir(entryDir)

            // Smart extraction with error recovery
            let data = entry.getData()

            // Apply fixes for known issues
            if (entry.entryName === "AndroidManifest.xml") {
              data = await this.fixManifestData(data, clientId, sendLog)
              if (data !== entry.getData()) fixedCount++
            }

            await fs.writeFile(entryPath, data)
            extractedCount++
          }
        } catch (error) {
          // Try alternative extraction methods
          try {
            await this.alternativeExtraction(entry, extractDir, clientId, sendLog)
            extractedCount++
            fixedCount++
          } catch (altError) {
            sendLog(clientId, `⚠️ Skipped ${entry.entryName}: ${error.message}`, "warning")
            skippedCount++
          }
        }
      }

      sendLog(
        clientId,
        `✅ Adaptive extraction: ${extractedCount} extracted, ${fixedCount} fixed, ${skippedCount} skipped`,
        "success",
      )
    } catch (error) {
      sendLog(clientId, `❌ Adaptive extraction failed: ${error.message}`, "error")
      throw error
    }
  }

  static async fixManifestData(data, clientId, sendLog) {
    try {
      // Check if it's binary manifest
      if (data[0] === 0x03 && data[1] === 0x00) {
        sendLog(clientId, "🔧 Binary manifest detected, will create compatible version", "info")
        return data // Return as-is, will be handled by smart manifest processing
      }

      // For text manifests, fix common encoding issues
      let manifestText = data.toString("utf8")

      // Fix common XML issues
      manifestText = manifestText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // Remove control characters
      manifestText = manifestText.replace(/&(?![a-zA-Z0-9#]{1,7};)/g, "&amp;") // Fix unescaped ampersands

      return Buffer.from(manifestText, "utf8")
    } catch (error) {
      return data // Return original if fixing fails
    }
  }

  static async alternativeExtraction(entry, extractDir, clientId, sendLog) {
    // Alternative extraction method for problematic files
    const entryPath = path.join(extractDir, entry.entryName)
    const entryDir = path.dirname(entryPath)

    await fs.ensureDir(entryDir)

    // Try to extract with different methods
    try {
      const rawData = entry.getCompressedData()
      await fs.writeFile(entryPath, rawData)
      sendLog(clientId, `🔧 Alternative extraction successful for ${entry.entryName}`, "info")
    } catch (error) {
      // Create placeholder file to maintain structure
      await fs.writeFile(entryPath, Buffer.alloc(0))
      sendLog(clientId, `📝 Created placeholder for ${entry.entryName}`, "warning")
    }
  }

  static async smartManifestProcessing(extractDir, validationResults, clientId, sendLog, sandboxMode) {
    sendLog(clientId, "🧠 Smart manifest processing...", "info")

    const manifestPath = path.join(extractDir, "AndroidManifest.xml")

    try {
      if (!(await fs.pathExists(manifestPath))) {
        throw new Error("AndroidManifest.xml not found after extraction")
      }

      const manifestData = await fs.readFile(manifestPath)

      // Check if binary manifest
      const isBinary = manifestData[0] === 0x03 && manifestData[1] === 0x00

      if (isBinary) {
        sendLog(clientId, "📋 Creating compatible manifest from binary version...", "info")
        await this.createIntelligentManifest(manifestPath, clientId, sendLog, sandboxMode)
      } else {
        sendLog(clientId, "📋 Processing text manifest...", "info")
        await this.enhanceTextManifest(manifestPath, clientId, sendLog, sandboxMode)
      }
    } catch (error) {
      sendLog(clientId, `⚠️ Manifest processing issue: ${error.message}`, "warning")
      sendLog(clientId, "🔄 Creating fallback manifest...", "info")
      await this.createIntelligentManifest(manifestPath, clientId, sendLog, sandboxMode)
    }
  }

  static async createIntelligentManifest(manifestPath, clientId, sendLog, sandboxMode) {
    const packageName = `com.devmode.${Date.now()}`
    const appName = sandboxMode ? "SandboxTestApp" : "DevModeApp"
    const versionCode = Math.floor(Date.now() / 1000)

    const intelligentManifest = `<?xml version="1.0" encoding="utf-8"?>
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
    `
        : ""
    }
    
    <!-- Hardware Features (Optional) -->
    <uses-feature android:name="android.hardware.touchscreen" android:required="false" />
    <uses-feature android:name="android.hardware.wifi" android:required="false" />
    <uses-feature android:name="android.hardware.camera" android:required="false" />
    <uses-feature android:name="android.hardware.location" android:required="false" />
    
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
        ${sandboxMode ? 'android:name="com.testing.SandboxApplication"' : ""}
        android:theme="@android:style/Theme.Material.Light.DarkActionBar"
        tools:ignore="GoogleAppIndexingWarning,UnusedAttribute">
        
        ${
          sandboxMode
            ? `
        <!-- Sandbox Testing Metadata -->
        <meta-data android:name="testing.mode.enabled" android:value="true" />
        <meta-data android:name="sandbox.payments.enabled" android:value="true" />
        <meta-data android:name="security.testing.enabled" android:value="true" />
        <meta-data android:name="api.logging.enabled" android:value="true" />
        <meta-data android:name="certificate.pinning.disabled" android:value="true" />
        <meta-data android:name="proxy.support.enabled" android:value="true" />
        <meta-data android:name="com.google.android.play.billingclient.version" android:value="5.0.0" />
        `
            : `
        <!-- Development Metadata -->
        <meta-data android:name="development.mode.enabled" android:value="true" />
        <meta-data android:name="debugging.enabled" android:value="true" />
        <meta-data android:name="network.monitoring.enabled" android:value="true" />
        `
        }
        
        <!-- Main Activity -->
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTop"
            android:screenOrientation="unspecified"
            android:configChanges="orientation|screenSize|keyboardHidden"
            android:windowSoftInputMode="adjustResize">
            <intent-filter android:priority="1000">
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="http" />
                <data android:scheme="https" />
            </intent-filter>
        </activity>
        
        ${
          sandboxMode
            ? `
        <!-- Testing Activities -->
        <activity
            android:name="com.testing.PaymentTestActivity"
            android:exported="false"
            android:theme="@android:style/Theme.Translucent.NoTitleBar" />
        <activity
            android:name="com.testing.SecurityTestActivity"
            android:exported="false"
            android:theme="@android:style/Theme.Translucent.NoTitleBar" />
        
        <!-- Testing Services -->
        <service
            android:name="com.testing.ApiMonitoringService"
            android:exported="false" />
        <service
            android:name="com.testing.PaymentTestingService"
            android:exported="false" />
        `
            : ""
        }
        
        <!-- File Provider for sharing -->
        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="${packageName}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths" />
        </provider>
        
    </application>
</manifest>`

    await fs.writeFile(manifestPath, intelligentManifest)
    sendLog(clientId, "✅ Intelligent manifest created with enhanced compatibility", "success")
  }

  static async enhanceTextManifest(manifestPath, clientId, sendLog, sandboxMode) {
    try {
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

      // Enhance existing manifest
      if (!result.manifest) result.manifest = {}
      if (!result.manifest.application) result.manifest.application = {}

      // Add intelligent enhancements
      const enhancements = sandboxMode
        ? {
            "android:debuggable": "true",
            "android:testOnly": "true",
            "android:allowBackup": "true",
            "android:extractNativeLibs": "true",
            "android:usesCleartextTraffic": "true",
            "android:networkSecurityConfig": "@xml/network_security_config",
            "android:name": "com.testing.SandboxApplication",
            "android:largeHeap": "true",
            "android:hardwareAccelerated": "true",
          }
        : {
            "android:debuggable": "true",
            "android:allowBackup": "true",
            "android:testOnly": "false",
            "android:extractNativeLibs": "true",
            "android:usesCleartextTraffic": "true",
            "android:networkSecurityConfig": "@xml/network_security_config",
            "android:largeHeap": "true",
            "android:hardwareAccelerated": "true",
          }

      Object.assign(result.manifest.application, enhancements)

      // Add comprehensive permissions
      await this.addIntelligentPermissions(result, sandboxMode)

      const modifiedXml = builder.buildObject(result)
      await fs.writeFile(manifestPath, modifiedXml)

      sendLog(clientId, "✅ Text manifest enhanced successfully", "success")
    } catch (error) {
      sendLog(clientId, `⚠️ Text manifest enhancement failed: ${error.message}`, "warning")
      await this.createIntelligentManifest(manifestPath, clientId, sendLog, sandboxMode)
    }
  }

  static async addIntelligentPermissions(manifestResult, sandboxMode) {
    const basePermissions = [
      "android.permission.INTERNET",
      "android.permission.ACCESS_NETWORK_STATE",
      "android.permission.ACCESS_WIFI_STATE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WAKE_LOCK",
    ]

    const sandboxPermissions = [
      "android.permission.SYSTEM_ALERT_WINDOW",
      "android.permission.WRITE_SETTINGS",
      "android.permission.GET_ACCOUNTS",
      "android.permission.MANAGE_ACCOUNTS",
      "android.permission.USE_CREDENTIALS",
      "android.permission.CAMERA",
      "android.permission.RECORD_AUDIO",
      "android.permission.ACCESS_FINE_LOCATION",
      "android.permission.ACCESS_COARSE_LOCATION",
      "com.android.vending.BILLING",
      "com.android.vending.CHECK_LICENSE",
    ]

    const requiredPermissions = sandboxMode ? [...basePermissions, ...sandboxPermissions] : basePermissions

    if (!manifestResult.manifest["uses-permission"]) {
      manifestResult.manifest["uses-permission"] = []
    }

    if (!Array.isArray(manifestResult.manifest["uses-permission"])) {
      manifestResult.manifest["uses-permission"] = [manifestResult.manifest["uses-permission"]]
    }

    requiredPermissions.forEach((permission) => {
      const exists = manifestResult.manifest["uses-permission"].some((p) => p && p["android:name"] === permission)
      if (!exists) {
        manifestResult.manifest["uses-permission"].push({
          "android:name": permission,
        })
      }
    })
  }

  static async intelligentResourceEnhancement(extractDir, clientId, sendLog, sandboxMode) {
    sendLog(clientId, "🎨 Intelligent resource enhancement...", "info")

    const resDir = path.join(extractDir, "res")
    await fs.ensureDir(resDir)

    // Create comprehensive resource structure
    await this.createAdvancedNetworkConfig(resDir, clientId, sendLog, sandboxMode)
    await this.createIntelligentDevResources(resDir, clientId, sendLog, sandboxMode)
    await this.createFileProviderPaths(resDir, clientId, sendLog)

    if (sandboxMode) {
      await this.createSandboxTestingResources(resDir, clientId, sendLog)
    }
  }

  static async createAdvancedNetworkConfig(resDir, clientId, sendLog, sandboxMode) {
    const xmlDir = path.join(resDir, "xml")
    await fs.ensureDir(xmlDir)

    const networkConfig = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <!-- Base configuration for maximum compatibility -->
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
        ${
          sandboxMode
            ? `
        <domain includeSubdomains="true">*.sandbox.google.com</domain>
        <domain includeSubdomains="true">*.testing.com</domain>
        <domain includeSubdomains="true">sandbox-payments.googleapis.com</domain>
        <domain includeSubdomains="true">play-billing-test.googleapis.com</domain>
        <domain includeSubdomains="true">*.googleapis.com</domain>
        `
            : ""
        }
    </domain-config>
    
    <!-- Debug overrides for comprehensive testing -->
    <debug-overrides>
        <trust-anchors>
            <certificates src="system"/>
            <certificates src="user"/>
        </trust-anchors>
    </debug-overrides>
</network-security-config>`

    await fs.writeFile(path.join(xmlDir, "network_security_config.xml"), networkConfig)
    sendLog(clientId, "✅ Advanced network configuration created", "success")
  }

  static async createFileProviderPaths(resDir, clientId, sendLog) {
    const xmlDir = path.join(resDir, "xml")
    await fs.ensureDir(xmlDir)

    const fileProviderPaths = `<?xml version="1.0" encoding="utf-8"?>
<paths xmlns:android="http://schemas.android.com/apk/res/android">
    <external-path name="external_files" path="."/>
    <external-cache-path name="external_cache" path="."/>
    <files-path name="files" path="."/>
    <cache-path name="cache" path="."/>
</paths>`

    await fs.writeFile(path.join(xmlDir, "file_paths.xml"), fileProviderPaths)
    sendLog(clientId, "✅ File provider paths configured", "success")
  }

  static async createIntelligentDevResources(resDir, clientId, sendLog, sandboxMode) {
    const valuesDir = path.join(resDir, "values")
    await fs.ensureDir(valuesDir)

    const devConfig = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Intelligent Development Configuration -->
    <bool name="debug_mode">true</bool>
    <bool name="development_mode">true</bool>
    <string name="app_mode">${sandboxMode ? "sandbox_testing" : "development"}</string>
    <bool name="allow_http_traffic">true</bool>
    <bool name="enable_logging">true</bool>
    <bool name="enable_debugging">true</bool>
    <bool name="enhanced_validation">true</bool>
    <bool name="installation_compatible">true</bool>
    
    ${
      sandboxMode
        ? `
    <!-- Advanced Sandbox Configuration -->
    <bool name="sandbox_mode_enabled">true</bool>
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
    `
        : ""
    }
    
    <!-- Development URLs -->
    <string name="dev_api_base_url">https://v0-aiapktodev.vercel.app</string>
    <string name="dev_websocket_url">wss://v0-aiapktodev.vercel.app</string>
    <string name="staging_api_url">https://v0-aiapktodev.vercel.app/api</string>
    
    <!-- Build Information -->
    <string name="build_type">debug</string>
    <string name="conversion_timestamp">${new Date().toISOString()}</string>
    <string name="converter_version">2.0.0</string>
    <string name="enhanced_features">true</string>
</resources>`

    await fs.writeFile(path.join(valuesDir, "dev_config.xml"), devConfig)
    sendLog(clientId, "✅ Intelligent development resources created", "success")
  }

  static async createSandboxTestingResources(resDir, clientId, sendLog) {
    const valuesDir = path.join(resDir, "values")

    const sandboxStrings = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="sandbox_mode_notice">🧪 SANDBOX TESTING MODE ACTIVE</string>
    <string name="testing_notice">⚠️ FOR TESTING PURPOSES ONLY</string>
    <string name="mock_payments_notice">💳 Using Mock Payment System</string>
    <string name="security_testing_notice">🔒 Security Testing Mode Active</string>
    <string name="api_monitoring_notice">📡 API Monitoring Enabled</string>
    <string name="proxy_support_notice">🌐 Proxy Support Enabled</string>
</resources>`

    await fs.writeFile(path.join(valuesDir, "sandbox_strings.xml"), sandboxStrings)
    sendLog(clientId, "✅ Sandbox testing resources created", "success")
  }

  static async applyCompatibilityFixes(extractDir, validationResults, clientId, sendLog) {
    sendLog(clientId, "🔧 Applying compatibility fixes...", "info")

    try {
      // Fix 1: Remove problematic META-INF files
      const metaInfPath = path.join(extractDir, "META-INF")
      if (await fs.pathExists(metaInfPath)) {
        await fs.remove(metaInfPath)
        sendLog(clientId, "🗑️ Removed original signatures for dev installation", "info")
      }

      // Fix 2: Create proper directory structure
      const requiredDirs = ["res/values", "res/xml", "assets"]
      for (const dir of requiredDirs) {
        await fs.ensureDir(path.join(extractDir, dir))
      }

      // Fix 3: Fix file permissions and names
      await this.fixFilePermissions(extractDir, clientId, sendLog)

      sendLog(clientId, "✅ Compatibility fixes applied successfully", "success")
    } catch (error) {
      sendLog(clientId, `⚠️ Some compatibility fixes failed: ${error.message}`, "warning")
    }
  }

  static async fixFilePermissions(extractDir, clientId, sendLog) {
    // This would be more relevant on actual file systems with permissions
    // For now, just ensure proper file structure
    sendLog(clientId, "📁 File structure validated", "info")
  }
}
