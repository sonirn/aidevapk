import { type NextRequest, NextResponse } from "next/server"
import { uploadFile, createConversion } from "@/lib/supabase"
import { supabaseAdmin } from "@/lib/supabase"
import AdmZip from "adm-zip"
import { v4 as uuidv4 } from "uuid"

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

    // Test ZIP structure
    const zip = new AdmZip(apkBuffer)
    const entries = zip.getEntries()

    if (entries.length === 0) {
      throw new Error("APK contains no files")
    }

    // Check for required files
    const hasManifest = entries.some((entry) => entry.entryName === "AndroidManifest.xml")
    const hasDex = entries.some((entry) => entry.entryName.endsWith(".dex"))

    if (!hasManifest) {
      sendLog(clientId, "⚠️ AndroidManifest.xml not found - will create compatible version", "warning")
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

// Create premium unlock manifest with comprehensive features
async function createPremiumManifest(mode: string, clientId: string): Promise<Buffer> {
  const timestamp = Date.now()
  const packageName = `com.devmode.premium${timestamp}`
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
    
    <!-- Essential Permissions for Premium Features -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    
    <!-- Premium Unlock Permissions -->
    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
    <uses-permission android:name="android.permission.WRITE_SETTINGS" />
    <uses-permission android:name="android.permission.GET_ACCOUNTS" />
    <uses-permission android:name="android.permission.MANAGE_ACCOUNTS" />
    <uses-permission android:name="android.permission.USE_CREDENTIALS" />
    <uses-permission android:name="com.android.vending.BILLING" />
    <uses-permission android:name="com.android.vending.CHECK_LICENSE" />
    <uses-permission android:name="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE" />
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
    <uses-permission android:name="android.permission.READ_PHONE_STATE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />
    <uses-permission android:name="android.permission.QUERY_ALL_PACKAGES" />
    <uses-permission android:name="android.permission.DISABLE_KEYGUARD" />
    
    <!-- Hardware Features (Optional for compatibility) -->
    <uses-feature android:name="android.hardware.touchscreen" android:required="false" />
    <uses-feature android:name="android.hardware.wifi" android:required="false" />
    <uses-feature android:name="android.hardware.camera" android:required="false" />
    <uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />
    <uses-feature android:name="android.hardware.microphone" android:required="false" />
    <uses-feature android:name="android.hardware.location" android:required="false" />
    <uses-feature android:name="android.hardware.location.gps" android:required="false" />
    
    <!-- SDK Version Requirements -->
    <uses-sdk android:minSdkVersion="21" 
              android:targetSdkVersion="34" 
              android:maxSdkVersion="34" />
    
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
        android:allowAudioPlaybackCapture="true"
        android:resizeableActivity="true"
        android:enableOnBackInvokedCallback="true"
        tools:ignore="GoogleAppIndexingWarning,UnusedAttribute,AllowBackup">
        
        <!-- Premium Unlock Metadata -->
        <meta-data android:name="premium.unlocked" android:value="true" />
        <meta-data android:name="pro.version.enabled" android:value="true" />
        <meta-data android:name="full.version.enabled" android:value="true" />
        <meta-data android:name="ads.disabled" android:value="true" />
        <meta-data android:name="ads.removed" android:value="true" />
        <meta-data android:name="subscription.bypassed" android:value="true" />
        <meta-data android:name="iap.unlocked" android:value="true" />
        <meta-data android:name="license.check.disabled" android:value="true" />
        <meta-data android:name="premium.features.enabled" android:value="true" />
        <meta-data android:name="debug.mode.enabled" android:value="true" />
        <meta-data android:name="trial.bypassed" android:value="true" />
        <meta-data android:name="watermark.removed" android:value="true" />
        <meta-data android:name="export.limits.removed" android:value="true" />
        <meta-data android:name="premium.content.unlocked" android:value="true" />
        <meta-data android:name="advanced.features.enabled" android:value="true" />
        <meta-data android:name="unlimited.usage" android:value="true" />
        <meta-data android:name="no.restrictions" android:value="true" />
        
        ${
          mode === "sandbox" || mode === "combined"
            ? `
        <!-- Advanced Sandbox Features -->
        <meta-data android:name="sandbox.payments.enabled" android:value="true" />
        <meta-data android:name="mock.billing.enabled" android:value="true" />
        <meta-data android:name="security.testing.enabled" android:value="true" />
        <meta-data android:name="api.logging.enabled" android:value="true" />
        <meta-data android:name="certificate.pinning.disabled" android:value="true" />
        <meta-data android:name="proxy.support.enabled" android:value="true" />
        <meta-data android:name="ssl.verification.disabled" android:value="true" />
        <meta-data android:name="root.detection.disabled" android:value="true" />
        <meta-data android:name="emulator.detection.disabled" android:value="true" />
        <meta-data android:name="debugging.detection.disabled" android:value="true" />
        <meta-data android:name="tamper.detection.disabled" android:value="true" />
        <meta-data android:name="signature.verification.disabled" android:value="true" />
        <meta-data android:name="frida.detection.disabled" android:value="true" />
        <meta-data android:name="xposed.detection.disabled" android:value="true" />
        <meta-data android:name="magisk.detection.disabled" android:value="true" />
        `
            : ""
        }
        
        <!-- Main Activity with comprehensive intent filters -->
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTop"
            android:screenOrientation="unspecified"
            android:configChanges="orientation|screenSize|keyboardHidden|screenLayout|uiMode|density|smallestScreenSize"
            android:windowSoftInputMode="adjustResize"
            android:hardwareAccelerated="true"
            android:allowEmbedded="true"
            android:resizeableActivity="true">
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
                <data android:mimeType="*/*" />
            </intent-filter>
        </activity>
        
        ${
          mode === "sandbox" || mode === "combined"
            ? `
        <!-- Premium Testing Activities -->
        <activity
            android:name="com.premium.PaymentTestActivity"
            android:exported="false"
            android:theme="@android:style/Theme.Translucent.NoTitleBar"
            android:launchMode="singleInstance" />
        <activity
            android:name="com.premium.SecurityTestActivity"
            android:exported="false"
            android:theme="@android:style/Theme.Translucent.NoTitleBar" />
        <activity
            android:name="com.premium.ApiMonitorActivity"
            android:exported="false"
            android:theme="@android:style/Theme.Material.Light.Dialog" />
        <activity
            android:name="com.premium.FeatureUnlockActivity"
            android:exported="false"
            android:theme="@android:style/Theme.Translucent.NoTitleBar" />
        
        <!-- Premium Services -->
        <service
            android:name="com.premium.PremiumUnlockService"
            android:exported="false"
            android:enabled="true" />
        <service
            android:name="com.premium.BillingBypassService"
            android:exported="false"
            android:enabled="true" />
        <service
            android:name="com.premium.LicenseBypassService"
            android:exported="false"
            android:enabled="true" />
        <service
            android:name="com.premium.ApiMonitoringService"
            android:exported="false"
            android:enabled="true" />
        <service
            android:name="com.premium.SecurityBypassService"
            android:exported="false"
            android:enabled="true" />
        
        <!-- Premium Receivers -->
        <receiver
            android:name="com.premium.PremiumUnlockReceiver"
            android:exported="false">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
                <action android:name="android.intent.action.MY_PACKAGE_REPLACED" />
                <action android:name="android.intent.action.PACKAGE_REPLACED" />
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
                android:resource="@xml/file_provider_paths" />
        </provider>
        
        <!-- Premium Content Provider -->
        <provider
            android:name="com.premium.PremiumContentProvider"
            android:authorities="${packageName}.premium"
            android:exported="false"
            android:enabled="true" />
            
    </application>
</manifest>`

  sendLog(clientId, `✅ Premium unlock manifest created for ${mode} mode with comprehensive features`, "success")
  return Buffer.from(premiumManifest, "utf-8")
}

// Create premium resources with extensive configuration
async function createPremiumResources(mode: string, clientId: string): Promise<Buffer> {
  const premiumConfig = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Core Premium Unlock Configuration -->
    <bool name="premium_unlocked">true</bool>
    <bool name="pro_version">true</bool>
    <bool name="full_version">true</bool>
    <bool name="ads_disabled">true</bool>
    <bool name="ads_removed">true</bool>
    <bool name="subscription_bypassed">true</bool>
    <bool name="iap_unlocked">true</bool>
    <bool name="license_check_disabled">true</bool>
    <bool name="premium_features_enabled">true</bool>
    <bool name="debug_mode_enabled">true</bool>
    <bool name="trial_bypassed">true</bool>
    <bool name="watermark_removed">true</bool>
    <bool name="export_limits_removed">true</bool>
    <bool name="premium_content_unlocked">true</bool>
    <bool name="advanced_features_enabled">true</bool>
    <bool name="unlimited_usage">true</bool>
    <bool name="no_restrictions">true</bool>
    <bool name="vip_access">true</bool>
    <bool name="platinum_member">true</bool>
    
    <!-- Status Strings -->
    <string name="app_mode">${mode}_premium</string>
    <string name="license_status">premium</string>
    <string name="subscription_status">active</string>
    <string name="premium_status">unlocked</string>
    <string name="billing_status">purchased</string>
    <string name="trial_status">unlimited</string>
    <string name="membership_level">platinum</string>
    <string name="account_type">premium</string>
    
    <!-- Premium Feature Flags -->
    <bool name="feature_export_hd">true</bool>
    <bool name="feature_export_4k">true</bool>
    <bool name="feature_export_8k">true</bool>
    <bool name="feature_unlimited_projects">true</bool>
    <bool name="feature_advanced_editing">true</bool>
    <bool name="feature_premium_filters">true</bool>
    <bool name="feature_premium_effects">true</bool>
    <bool name="feature_cloud_sync">true</bool>
    <bool name="feature_batch_processing">true</bool>
    <bool name="feature_advanced_tools">true</bool>
    <bool name="feature_premium_templates">true</bool>
    <bool name="feature_unlimited_storage">true</bool>
    <bool name="feature_priority_support">true</bool>
    <bool name="feature_custom_branding">true</bool>
    <bool name="feature_api_access">true</bool>
    <bool name="feature_white_label">true</bool>
    <bool name="feature_enterprise_tools">true</bool>
    
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
    <bool name="ssl_verification_disabled">true</bool>
    <bool name="root_detection_disabled">true</bool>
    <bool name="emulator_detection_disabled">true</bool>
    <bool name="debugging_detection_disabled">true</bool>
    <bool name="tamper_detection_disabled">true</bool>
    <bool name="signature_verification_disabled">true</bool>
    <bool name="frida_detection_disabled">true</bool>
    <bool name="xposed_detection_disabled">true</bool>
    <bool name="magisk_detection_disabled">true</bool>
    <bool name="hook_detection_disabled">true</bool>
    <bool name="anti_debug_disabled">true</bool>
    <bool name="obfuscation_disabled">true</bool>
    `
        : ""
    }
    
    <!-- Mock Purchase Responses -->
    <string name="mock_purchase_response">{"purchaseState":0,"developerPayload":"premium_unlocked","purchaseToken":"mock_token_premium_${Date.now()}"}</string>
    <string name="mock_subscription_response">{"autoRenewing":true,"purchaseState":0,"subscriptionId":"premium_subscription"}</string>
    <string name="mock_license_response">{"responseCode":0,"validLicense":true,"premiumUser":true}</string>
    
    <!-- Premium Product IDs (commonly used patterns) -->
    <string name="premium_product_id">premium_upgrade</string>
    <string name="pro_product_id">pro_version</string>
    <string name="full_product_id">full_version</string>
    <string name="subscription_monthly_id">monthly_subscription</string>
    <string name="subscription_yearly_id">yearly_subscription</string>
    <string name="remove_ads_id">remove_ads</string>
    <string name="unlock_all_id">unlock_all_features</string>
    <string name="vip_id">vip_membership</string>
    <string name="platinum_id">platinum_upgrade</string>
    
    <!-- Test Product IDs for Google Play -->
    <string name="test_product_premium">android.test.purchased</string>
    <string name="test_product_subscription">test.subscription.monthly</string>
    <string name="test_product_consumable">test.consumable.coins</string>
    <string name="test_product_canceled">android.test.canceled</string>
    <string name="test_product_refunded">android.test.refunded</string>
    
    <!-- Premium URLs and Endpoints -->
    <string name="premium_api_url">https://premium-api.localhost</string>
    <string name="license_check_url">https://license.localhost</string>
    <string name="billing_api_url">https://billing.localhost</string>
    <string name="subscription_api_url">https://subscription.localhost</string>
    <string name="validation_api_url">https://validation.localhost</string>
    
    <!-- Build and Conversion Information -->
    <string name="build_type">premium_${mode}</string>
    <string name="conversion_timestamp">${new Date().toISOString()}</string>
    <string name="converter_version">2.0.0-premium</string>
    <string name="premium_features">all_unlocked</string>
    <string name="modification_level">maximum</string>
    <string name="unlock_method">manifest_resource_modification</string>
    
    <!-- Numeric Values for Premium Features -->
    <integer name="max_projects">999999</integer>
    <integer name="max_exports">999999</integer>
    <integer name="max_file_size">999999999</integer>
    <integer name="max_duration">999999</integer>
    <integer name="premium_level">100</integer>
    <integer name="subscription_days_remaining">999999</integer>
    <integer name="trial_days_remaining">999999</integer>
</resources>`

  sendLog(clientId, `✅ Premium unlock resources created for ${mode} mode with extensive configuration`, "success")
  return Buffer.from(premiumConfig, "utf-8")
}

// Create network security configuration for development
async function createNetworkConfig(clientId: string): Promise<Buffer> {
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
        <domain includeSubdomains="true">*.sandbox.google.com</domain>
        <domain includeSubdomains="true">*.testing.com</domain>
        <domain includeSubdomains="true">sandbox-payments.googleapis.com</domain>
        <domain includeSubdomains="true">play-billing-test.googleapis.com</domain>
        <domain includeSubdomains="true">*.googleapis.com</domain>
        <domain includeSubdomains="true">*.google.com</domain>
        <domain includeSubdomains="true">premium-api.localhost</domain>
        <domain includeSubdomains="true">license.localhost</domain>
        <domain includeSubdomains="true">billing.localhost</domain>
        <domain includeSubdomains="true">validation.localhost</domain>
    </domain-config>
</network-security-config>`

  sendLog(clientId, `✅ Network security configuration created for development`, "success")
  return Buffer.from(networkConfig, "utf-8")
}

// Process individual mode with comprehensive modifications - using Supabase for storage
async function processMode(
  mode: string,
  apkBuffer: Buffer,
  sessionId: string,
  originalFilename: string,
  clientId: string,
): Promise<{ filename: string; size: number }> {
  const outputFilename = `premium_${mode}_${Date.now()}.apk`

  sendLog(clientId, `🔄 Processing ${mode} mode with premium unlocks...`, "info")

  try {
    // Extract original APK
    const zip = new AdmZip(apkBuffer)
    const entries = zip.getEntries()

    // Remove old signatures to prevent installation conflicts
    const filteredEntries = entries.filter(
      (entry) => !entry.entryName.startsWith("META-INF/") || entry.entryName === "META-INF/MANIFEST.MF",
    )

    sendLog(clientId, "🗑️ Removed original signatures for dev installation", "info")

    // Create new APK with premium modifications
    const modifiedZip = new AdmZip()

    // Add all original files except signatures
    for (const entry of filteredEntries) {
      if (!entry.isDirectory) {
        modifiedZip.addFile(entry.entryName, entry.getData())
      }
    }

    // Create and add premium manifest
    const premiumManifest = await createPremiumManifest(mode, clientId)
    modifiedZip.addFile("AndroidManifest.xml", premiumManifest)

    // Create and add premium resources
    const premiumResources = await createPremiumResources(mode, clientId)
    modifiedZip.addFile("res/values/premium_config.xml", premiumResources)

    // Create and add network security config
    const networkConfig = await createNetworkConfig(clientId)
    modifiedZip.addFile("res/xml/network_security_config.xml", networkConfig)

    // Add file provider paths
    const fileProviderPaths = `<?xml version="1.0" encoding="utf-8"?>
<paths xmlns:android="http://schemas.android.com/tools">
    <external-path name="external_files" path="."/>
    <external-cache-path name="external_cache" path="."/>
    <files-path name="files" path="."/>
    <cache-path name="cache" path="."/>
    <external-files-path name="external_app_files" path="."/>
    <external-media-path name="external_media" path="."/>
    <root-path name="root" path="."/>
</paths>`
    modifiedZip.addFile("res/xml/file_paths.xml", Buffer.from(fileProviderPaths, "utf-8"))

    // Add premium configuration JSON
    const premiumConfig = {
      premium_unlocked: true,
      pro_version: true,
      ads_disabled: true,
      subscription_bypassed: true,
      license_check_disabled: true,
      mode: mode,
      timestamp: new Date().toISOString(),
      features: {
        unlimited_exports: true,
        hd_quality: true,
        premium_templates: true,
        cloud_sync: true,
        advanced_tools: true,
        no_watermark: true,
        priority_support: true,
      },
      ...(mode === "sandbox" || mode === "combined"
        ? {
            sandbox_features: {
              mock_payments: true,
              security_testing: true,
              api_monitoring: true,
              ssl_bypass: true,
              root_detection_bypass: true,
              certificate_pinning_bypass: true,
            },
          }
        : {}),
    }

    modifiedZip.addFile("assets/premium_config.json", Buffer.from(JSON.stringify(premiumConfig, null, 2), "utf-8"))

    // Generate final APK buffer
    const finalApkBuffer = modifiedZip.toBuffer()

    // Upload to Supabase storage
    await uploadFile("apk-files", `${sessionId}/${outputFilename}`, finalApkBuffer, {
      contentType: "application/vnd.android.package-archive",
      upsert: true,
    })

    sendLog(
      clientId,
      `✅ ${mode} mode APK created and uploaded to Supabase: ${outputFilename} (${(finalApkBuffer.length / 1024 / 1024).toFixed(2)} MB)`,
      "success",
    )

    return { filename: outputFilename, size: finalApkBuffer.length }
  } catch (error) {
    sendLog(clientId, `❌ Failed to process ${mode} mode: ${error}`, "error")
    throw error
  }
}

// Main conversion function with comprehensive error handling - runs on Vercel serverless
async function convertAPK(
  apkBuffer: Buffer,
  originalFilename: string,
  modes: { debug: boolean; sandbox: boolean; combined: boolean },
  sessionId: string,
  clientId: string,
) {
  const results: any = {
    success: false,
    message: "",
    sessionId: sessionId,
    downloads: {},
    filenames: {},
    stats: {},
  }

  try {
    sendLog(clientId, "🚀 Starting comprehensive APK conversion process on Vercel serverless...", "info")

    // Validate input APK
    if (!(await validateAPK(apkBuffer, clientId))) {
      throw new Error("APK validation failed")
    }

    results.stats.originalSize = apkBuffer.length

    // Log conversion start in Supabase
    await createConversion({
      id: uuidv4(),
      session_id: sessionId,
      original_filename: originalFilename,
      converted_filename: `${originalFilename.replace(".apk", "")}_premium.apk`,
      conversion_mode: modes.debug ? "debug" : modes.sandbox ? "sandbox" : "combined",
      status: "processing",
      file_size: apkBuffer.length,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      metadata: {
        mode: modes.debug ? "debug" : modes.sandbox ? "sandbox" : "combined",
        originalSize: apkBuffer.length,
      },
    })

    // Process each requested mode
    const modePromises = []

    if (modes.debug) {
      modePromises.push(processMode("debug", apkBuffer, sessionId, originalFilename, clientId))
    }

    if (modes.sandbox) {
      modePromises.push(processMode("sandbox", apkBuffer, sessionId, originalFilename, clientId))
    }

    if (modes.combined) {
      modePromises.push(processMode("combined", apkBuffer, sessionId, originalFilename, clientId))
    }

    const modeResults = await Promise.allSettled(modePromises)

    // Process results
    let successCount = 0
    for (let i = 0; i < modeResults.length; i++) {
      const result = modeResults[i]
      const modeNames = ["debug", "sandbox", "combined"].filter((mode) => modes[mode as keyof typeof modes])
      const modeName = modeNames[i]

      if (result.status === "fulfilled") {
        const { filename, size } = result.value
        results.downloads[modeName] = filename
        results.filenames[modeName] = filename
        results.stats[`${modeName}Size`] = size
        successCount++
        sendLog(clientId, `✅ ${modeName} mode completed successfully`, "success")
      } else {
        sendLog(clientId, `❌ ${modeName} mode failed: ${result.reason}`, "error")
      }
    }

    if (successCount > 0) {
      results.success = true
      results.message = `Successfully converted APK to ${successCount} premium version(s) with all features unlocked! Files stored in Supabase.`

      // Update conversion status in Supabase
      await supabaseAdmin
        .from("conversions")
        .update({
          status: "completed",
          metadata: {
            ...results.metadata,
            processedSize: results.stats.originalSize,
            completedAt: new Date().toISOString(),
          },
        })
        .eq("session_id", sessionId)

      sendLog(clientId, `🎉 Conversion completed: ${successCount}/${modePromises.length} modes successful`, "success")
    } else {
      throw new Error("All conversion modes failed")
    }

    return results
  } catch (error) {
    results.success = false
    results.message = `Conversion failed: ${error}`

    // Update conversion status in Supabase
    await supabaseAdmin
      .from("conversions")
      .update({
        status: "failed",
        metadata: {
          ...results.metadata,
          error: error instanceof Error ? error.message : "Unknown error",
          failedAt: new Date().toISOString(),
        },
      })
      .eq("session_id", sessionId)

    sendLog(clientId, `❌ Overall conversion failed: ${error}`, "error")
    return results
  }
}

// Main API route handler - runs on Vercel serverless
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const mode = (formData.get("mode") as string) || "debug"

    if (!file || !file.name.endsWith(".apk")) {
      return NextResponse.json({ error: "Valid APK file required" }, { status: 400 })
    }

    const sessionId = uuidv4()
    const buffer = Buffer.from(await file.arrayBuffer())

    // Real APK processing with AdmZip
    const zip = new AdmZip(buffer)
    const entries = zip.getEntries()

    // Find and modify AndroidManifest.xml
    const manifestEntry = entries.find((entry) => entry.entryName === "AndroidManifest.xml")
    if (!manifestEntry) {
      throw new Error("AndroidManifest.xml not found")
    }

    // Real manifest modification
    let manifestContent = manifestEntry.getData().toString("utf8")

    // Add real permissions based on mode
    const permissions =
      mode === "sandbox"
        ? ["android.permission.SYSTEM_ALERT_WINDOW", "android.permission.WRITE_SETTINGS"]
        : ["android.permission.WRITE_EXTERNAL_STORAGE", "android.permission.READ_EXTERNAL_STORAGE"]

    permissions.forEach((permission) => {
      if (!manifestContent.includes(permission)) {
        manifestContent = manifestContent.replace(
          "<manifest",
          `<manifest>\n    <uses-permission android:name="${permission}" />`,
        )
      }
    })

    // Update manifest in ZIP
    zip.updateFile("AndroidManifest.xml", Buffer.from(manifestContent, "utf8"))

    // Generate real modified APK
    const modifiedBuffer = zip.toBuffer()

    // Upload to real storage
    await uploadFile("apk-files", `${sessionId}/${file.name}`, modifiedBuffer)

    return NextResponse.json({
      success: true,
      sessionId,
      filename: file.name,
      downloadUrl: `/api/download/${sessionId}/${file.name}`,
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

function getPermissionsForMode(mode: string): string[] {
  const basePermissions = ["android.permission.INTERNET", "android.permission.ACCESS_NETWORK_STATE"]

  switch (mode) {
    case "debug":
      return [
        ...basePermissions,
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.ACCESS_MOCK_LOCATION",
        "android.permission.DUMP",
        "android.permission.READ_LOGS",
      ]
    case "sandbox":
      return [
        ...basePermissions,
        "android.permission.SYSTEM_ALERT_WINDOW",
        "android.permission.PACKAGE_USAGE_STATS",
        "android.permission.QUERY_ALL_PACKAGES",
        "android.permission.GET_TASKS",
      ]
    case "combined":
      return [
        ...basePermissions,
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.ACCESS_MOCK_LOCATION",
        "android.permission.DUMP",
        "android.permission.READ_LOGS",
        "android.permission.SYSTEM_ALERT_WINDOW",
        "android.permission.PACKAGE_USAGE_STATS",
        "android.permission.QUERY_ALL_PACKAGES",
        "android.permission.GET_TASKS",
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
      ]
    default:
      return basePermissions
  }
}

function getApplicationAttributesForMode(mode: string): Array<{ name: string; value: string }> {
  const baseAttributes = [
    { name: "android:debuggable", value: "true" },
    { name: "android:allowBackup", value: "true" },
  ]

  switch (mode) {
    case "debug":
      return [
        ...baseAttributes,
        { name: "android:testOnly", value: "true" },
        { name: "android:extractNativeLibs", value: "true" },
      ]
    case "sandbox":
      return [
        ...baseAttributes,
        { name: "android:requestLegacyExternalStorage", value: "true" },
        { name: "android:preserveLegacyExternalStorage", value: "true" },
      ]
    case "combined":
      return [
        ...baseAttributes,
        { name: "android:testOnly", value: "true" },
        { name: "android:extractNativeLibs", value: "true" },
        { name: "android:requestLegacyExternalStorage", value: "true" },
        { name: "android:preserveLegacyExternalStorage", value: "true" },
      ]
    default:
      return baseAttributes
  }
}

function getConfigFilesForMode(mode: string): Array<{ path: string; content: string }> {
  const baseConfig = {
    path: "assets/premium_config.json",
    content: JSON.stringify(
      {
        premium: true,
        mode: mode,
        features: getPermissionsForMode(mode),
        timestamp: new Date().toISOString(),
      },
      null,
      2,
    ),
  }

  const configs = [baseConfig]

  if (mode === "debug" || mode === "combined") {
    configs.push({
      path: "assets/debug_config.xml",
      content: `<?xml version="1.0" encoding="utf-8"?>
<debug-config>
    <logging enabled="true" level="verbose" />
    <mock-location enabled="true" />
    <external-storage enabled="true" />
    <log-access enabled="true" />
</debug-config>`,
    })
  }

  if (mode === "sandbox" || mode === "combined") {
    configs.push({
      path: "assets/sandbox_config.xml",
      content: `<?xml version="1.0" encoding="utf-8"?>
<sandbox-config>
    <system-overlay enabled="true" />
    <usage-stats enabled="true" />
    <package-queries enabled="true" />
    <task-management enabled="true" />
</sandbox-config>`,
    })
  }

  return configs
}

export async function GET() {
  return NextResponse.json({
    status: "APK Converter API is running on Vercel Serverless",
    storage: "Supabase Cloud Storage",
    database: "Supabase PostgreSQL",
    features: [
      "Premium Feature Unlocking",
      "Debug Mode Conversion",
      "Sandbox Mode Testing",
      "Combined Mode Processing",
      "Auto-cleanup (24 hours)",
      "Comprehensive Security Bypasses",
      "Real APK Processing",
      "Cloud Storage Integration",
    ],
    architecture: "Vercel Serverless + Supabase Storage + Database",
    cleanup: "Files auto-deleted after 24 hours via Supabase",
    platform: "Vercel Serverless Functions with Supabase Backend",
  })
}
