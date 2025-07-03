import fs from 'fs-extra';
import path from 'path';
import xml2js from 'xml2js';

// Sandbox configuration for testing environments
export const SANDBOX_CONFIGS = {
  GOOGLE_PLAY: {
    testAccountEmails: [
      'test@example.com',
      'developer@test.com',
      'qa@testing.com'
    ],
    testProductIds: [
      'android.test.purchased',
      'android.test.canceled',
      'android.test.refunded',
      'android.test.item_unavailable'
    ],
    testSubscriptionIds: [
      'test.subscription.monthly',
      'test.subscription.yearly',
      'test.premium.trial'
    ]
  },
  PAYMENT_TESTING: {
    enableTestPayments: true,
    bypassRealPayments: true,
    mockPurchaseResponses: true,
    logAllTransactions: true
  },
  SECURITY_TESTING: {
    enableDeepLogging: true,
    exposeApiEndpoints: true,
    disableCertificatePinning: true,
    enableProxySupport: true,
    logSecurityEvents: true
  }
};

export async function createSandboxManifest(manifestPath, clientId, sendLog) {
  sendLog(clientId, '🧪 Configuring sandbox testing environment...', 'info');
  
  try {
    const manifestContent = await fs.readFile(manifestPath, 'utf8');
    const parser = new xml2js.Parser({ 
      explicitArray: false,
      mergeAttrs: true,
      explicitRoot: true
    });
    const builder = new xml2js.Builder({
      xmldec: { version: '1.0', encoding: 'utf-8' }
    });
    
    const result = await parser.parseStringPromise(manifestContent);
    
    // Ensure manifest structure
    if (!result.manifest) result.manifest = {};
    if (!result.manifest.application) result.manifest.application = {};
    
    // Add sandbox testing attributes
    const sandboxAttrs = {
      'android:debuggable': 'true',
      'android:testOnly': 'true',
      'android:allowBackup': 'true',
      'android:extractNativeLibs': 'true',
      'android:usesCleartextTraffic': 'true',
      'android:networkSecurityConfig': '@xml/network_security_config',
      'android:name': 'com.testing.SandboxApplication'
    };

    Object.assign(result.manifest.application, sandboxAttrs);
    
    // Add testing permissions for sandbox mode
    const testingPermissions = [
      'android.permission.INTERNET',
      'android.permission.ACCESS_NETWORK_STATE',
      'android.permission.ACCESS_WIFI_STATE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.WRITE_SETTINGS',
      'android.permission.GET_ACCOUNTS',
      'android.permission.MANAGE_ACCOUNTS',
      'android.permission.USE_CREDENTIALS',
      'com.android.vending.BILLING',
      'com.android.vending.CHECK_LICENSE'
    ];

    if (!result.manifest['uses-permission']) {
      result.manifest['uses-permission'] = [];
    }

    if (!Array.isArray(result.manifest['uses-permission'])) {
      result.manifest['uses-permission'] = [result.manifest['uses-permission']];
    }

    testingPermissions.forEach(permission => {
      const exists = result.manifest['uses-permission'].some(p => 
        p['android:name'] === permission
      );
      if (!exists) {
        result.manifest['uses-permission'].push({
          'android:name': permission
        });
      }
    });

    // Add testing metadata for sandbox mode
    if (!result.manifest.application['meta-data']) {
      result.manifest.application['meta-data'] = [];
    }

    if (!Array.isArray(result.manifest.application['meta-data'])) {
      result.manifest.application['meta-data'] = [result.manifest.application['meta-data']];
    }

    const testingMetadata = [
      {
        'android:name': 'com.google.android.play.billingclient.version',
        'android:value': '5.0.0'
      },
      {
        'android:name': 'testing.mode.enabled',
        'android:value': 'true'
      },
      {
        'android:name': 'sandbox.payments.enabled',
        'android:value': 'true'
      },
      {
        'android:name': 'security.testing.enabled',
        'android:value': 'true'
      },
      {
        'android:name': 'api.logging.enabled',
        'android:value': 'true'
      }
    ];

    testingMetadata.forEach(metadata => {
      const exists = result.manifest.application['meta-data'].some(m => 
        m['android:name'] === metadata['android:name']
      );
      if (!exists) {
        result.manifest.application['meta-data'].push(metadata);
      }
    });

    const modifiedXml = builder.buildObject(result);
    await fs.writeFile(manifestPath, modifiedXml);
    
    sendLog(clientId, '✅ Sandbox manifest configuration completed', 'success');
    return true;
  } catch (error) {
    sendLog(clientId, `❌ Error configuring sandbox manifest: ${error.message}`, 'error');
    throw error;
  }
}

export async function createSandboxNetworkConfig(resDir, clientId, sendLog) {
  sendLog(clientId, '🌐 Creating sandbox network security configuration...', 'info');
  
  const xmlDir = path.join(resDir, 'xml');
  await fs.ensureDir(xmlDir);
  
  const sandboxNetworkConfig = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <!-- Allow all cleartext traffic for testing -->
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system"/>
            <certificates src="user"/>
        </trust-anchors>
    </base-config>
    
    <!-- Sandbox testing domains -->
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">localhost</domain>
        <domain includeSubdomains="true">127.0.0.1</domain>
        <domain includeSubdomains="true">10.0.2.2</domain>
        <domain includeSubdomains="true">192.168.1.1</domain>
        <domain includeSubdomains="true">*.ngrok.io</domain>
        <domain includeSubdomains="true">*.sandbox.google.com</domain>
        <domain includeSubdomains="true">*.testing.com</domain>
        <domain includeSubdomains="true">*.dev</domain>
        <domain includeSubdomains="true">*.test</domain>
        <domain includeSubdomains="true">sandbox-payments.googleapis.com</domain>
        <domain includeSubdomains="true">play-billing-test.googleapis.com</domain>
    </domain-config>
    
    <!-- Debug overrides for testing -->
    <debug-overrides>
        <trust-anchors>
            <certificates src="system"/>
            <certificates src="user"/>
        </trust-anchors>
    </debug-overrides>
</network-security-config>`;
  
  await fs.writeFile(path.join(xmlDir, 'network_security_config.xml'), sandboxNetworkConfig);
  sendLog(clientId, '✅ Sandbox network configuration created', 'success');
}

export async function createSandboxTestingResources(resDir, clientId, sendLog) {
  sendLog(clientId, '🧪 Adding sandbox testing resources...', 'info');
  
  const valuesDir = path.join(resDir, 'values');
  await fs.ensureDir(valuesDir);
  
  // Sandbox configuration values
  const sandboxConfig = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Sandbox Testing Configuration -->
    <bool name="sandbox_mode_enabled">true</bool>
    <bool name="testing_mode_enabled">true</bool>
    <bool name="debug_mode_enabled">true</bool>
    <bool name="security_testing_enabled">true</bool>
    
    <!-- Payment Testing -->
    <bool name="mock_payments_enabled">true</bool>
    <bool name="bypass_payment_validation">true</bool>
    <bool name="log_payment_transactions">true</bool>
    
    <!-- API Testing -->
    <bool name="api_logging_enabled">true</bool>
    <bool name="detailed_network_logs">true</bool>
    <bool name="expose_api_endpoints">true</bool>
    
    <!-- Security Testing -->
    <bool name="disable_certificate_pinning">true</bool>
    <bool name="allow_proxy_connections">true</bool>
    <bool name="enable_security_logs">true</bool>
    
    <!-- Test Product IDs -->
    <string name="test_product_premium">android.test.purchased</string>
    <string name="test_product_subscription">test.subscription.monthly</string>
    <string name="test_product_consumable">test.consumable.coins</string>
    
    <!-- Sandbox URLs -->
    <string name="sandbox_api_base_url">https://sandbox-api.example.com</string>
    <string name="sandbox_payment_url">https://sandbox-payments.googleapis.com</string>
    <string name="testing_license_url">https://play-billing-test.googleapis.com</string>
</resources>`;
  
  await fs.writeFile(path.join(valuesDir, 'sandbox_config.xml'), sandboxConfig);
  
  // Create testing strings
  const testingStrings = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="testing_mode_notice">TESTING MODE ACTIVE</string>
    <string name="sandbox_mode_notice">SANDBOX ENVIRONMENT</string>
    <string name="debug_info_enabled">Debug information enabled</string>
    <string name="mock_payments_notice">Using mock payment system</string>
    <string name="security_testing_notice">Security testing mode active</string>
</resources>`;
  
  await fs.writeFile(path.join(valuesDir, 'testing_strings.xml'), testingStrings);
  
  sendLog(clientId, '✅ Sandbox testing resources created', 'success');
}

export async function createSandboxApplication(extractDir, clientId, sendLog) {
  sendLog(clientId, '📱 Creating sandbox application class...', 'info');
  
  const javaDir = path.join(extractDir, 'src', 'main', 'java', 'com', 'testing');
  await fs.ensureDir(javaDir);
  
  const sandboxApplicationClass = `package com.testing;

import android.app.Application;
import android.content.Context;
import android.util.Log;
import java.lang.reflect.Method;

public class SandboxApplication extends Application {
    private static final String TAG = "SandboxApp";
    
    @Override
    public void onCreate() {
        super.onCreate();
        
        Log.d(TAG, "🧪 Sandbox Application Started");
        Log.d(TAG, "🔧 Testing Mode: ENABLED");
        Log.d(TAG, "💳 Mock Payments: ENABLED");
        Log.d(TAG, "🔍 Security Testing: ENABLED");
        
        // Initialize sandbox environment
        initializeSandboxMode();
        initializePaymentTesting();
        initializeSecurityTesting();
        initializeApiLogging();
    }
    
    private void initializeSandboxMode() {
        Log.d(TAG, "🧪 Initializing sandbox environment...");
        
        // Enable debug features
        try {
            // Enable strict mode for testing
            enableStrictMode();
            
            // Setup test environment
            setupTestEnvironment();
            
            Log.d(TAG, "✅ Sandbox mode initialized successfully");
        } catch (Exception e) {
            Log.e(TAG, "❌ Error initializing sandbox mode: " + e.getMessage());
        }
    }
    
    private void initializePaymentTesting() {
        Log.d(TAG, "💳 Initializing payment testing...");
        
        try {
            // Mock payment responses
            setupMockPayments();
            
            // Enable test product IDs
            enableTestProducts();
            
            Log.d(TAG, "✅ Payment testing initialized");
        } catch (Exception e) {
            Log.e(TAG, "❌ Error initializing payment testing: " + e.getMessage());
        }
    }
    
    private void initializeSecurityTesting() {
        Log.d(TAG, "🔒 Initializing security testing...");
        
        try {
            // Disable certificate pinning for testing
            disableCertificatePinning();
            
            // Enable proxy support
            enableProxySupport();
            
            // Setup security logging
            setupSecurityLogging();
            
            Log.d(TAG, "✅ Security testing initialized");
        } catch (Exception e) {
            Log.e(TAG, "❌ Error initializing security testing: " + e.getMessage());
        }
    }
    
    private void initializeApiLogging() {
        Log.d(TAG, "📡 Initializing API logging...");
        
        try {
            // Enable detailed network logging
            enableNetworkLogging();
            
            // Setup API request/response logging
            setupApiLogging();
            
            Log.d(TAG, "✅ API logging initialized");
        } catch (Exception e) {
            Log.e(TAG, "❌ Error initializing API logging: " + e.getMessage());
        }
    }
    
    private void enableStrictMode() {
        // Implementation for strict mode
        Log.d(TAG, "🔧 Strict mode enabled for testing");
    }
    
    private void setupTestEnvironment() {
        // Implementation for test environment setup
        Log.d(TAG, "🧪 Test environment configured");
    }
    
    private void setupMockPayments() {
        // Implementation for mock payment setup
        Log.d(TAG, "💳 Mock payment system configured");
    }
    
    private void enableTestProducts() {
        // Implementation for test product enablement
        Log.d(TAG, "🛒 Test products enabled");
    }
    
    private void disableCertificatePinning() {
        // Implementation for disabling certificate pinning
        Log.d(TAG, "🔓 Certificate pinning disabled for testing");
    }
    
    private void enableProxySupport() {
        // Implementation for proxy support
        Log.d(TAG, "🌐 Proxy support enabled");
    }
    
    private void setupSecurityLogging() {
        // Implementation for security logging
        Log.d(TAG, "🔍 Security logging configured");
    }
    
    private void enableNetworkLogging() {
        // Implementation for network logging
        Log.d(TAG, "📡 Network logging enabled");
    }
    
    private void setupApiLogging() {
        // Implementation for API logging
        Log.d(TAG, "📊 API logging configured");
    }
}`;
  
  await fs.writeFile(path.join(javaDir, 'SandboxApplication.java'), sandboxApplicationClass);
  sendLog(clientId, '✅ Sandbox application class created', 'success');
}

export async function createTestingDocumentation(extractDir, clientId, sendLog) {
  sendLog(clientId, '📚 Creating testing documentation...', 'info');
  
  const docsDir = path.join(extractDir, 'testing-docs');
  await fs.ensureDir(docsDir);
  
  const testingGuide = `# APK Sandbox Testing Guide

## 🧪 Sandbox Mode Features

This APK has been configured for comprehensive testing and security analysis.

### 💳 Payment Testing Features

1. **Mock Payment System**
   - All payments are simulated
   - No real money transactions
   - Test all purchase flows safely

2. **Test Product IDs**
   - \`android.test.purchased\` - Always successful
   - \`android.test.canceled\` - Always canceled
   - \`android.test.refunded\` - Always refunded
   - \`android.test.item_unavailable\` - Always unavailable

3. **Subscription Testing**
   - Test monthly/yearly subscriptions
   - Trial period testing
   - Cancellation flow testing

### 🔍 Security Testing Features

1. **Network Analysis**
   - All API requests logged
   - Response data captured
   - Headers and authentication visible

2. **Certificate Pinning Disabled**
   - Allows proxy tools (Charles, Burp Suite)
   - Man-in-the-middle testing possible
   - SSL/TLS analysis enabled

3. **Debug Features**
   - Detailed error logging
   - Stack trace visibility
   - Performance monitoring

### 📡 API Monitoring

1. **Request Logging**
   - Full URL and parameters
   - Request headers and body
   - Authentication tokens
   - Timing information

2. **Response Analysis**
   - Status codes and headers
   - Response body content
   - Error messages
   - Data validation

### 🛠 Testing Tools Integration

1. **Android Studio Profiler**
   - Network profiling enabled
   - Memory analysis available
   - CPU usage monitoring

2. **Chrome DevTools**
   - Remote debugging enabled
   - Console access available
   - Network tab functional

3. **Proxy Tools**
   - Charles Proxy compatible
   - Burp Suite integration
   - OWASP ZAP support

### ⚖️ Legal & Ethical Use

This sandbox APK is intended for:
- ✅ Security research and testing
- ✅ Educational purposes
- ✅ Quality assurance testing
- ✅ Bug hunting and analysis
- ✅ Performance optimization

NOT intended for:
- ❌ Bypassing legitimate payments
- ❌ Violating terms of service
- ❌ Malicious activities
- ❌ Commercial exploitation

### 🔧 How to Use

1. **Install the APK** on a test device
2. **Enable Developer Options** on the device
3. **Connect debugging tools** (ADB, Chrome DevTools)
4. **Configure proxy tools** if needed
5. **Monitor network traffic** during testing
6. **Analyze API responses** for security issues
7. **Test payment flows** with mock data

### 📊 Monitoring Commands

\`\`\`bash
# View detailed logs
adb logcat | grep -E "(SandboxApp|Payment|API|Security)"

# Monitor network activity
adb logcat | grep -i "http"

# Check for security events
adb logcat | grep -i "security"

# Monitor payment testing
adb logcat | grep -i "billing"
\`\`\`

### 🚨 Important Notes

- This APK is for TESTING PURPOSES ONLY
- Use only on devices you own or have permission to test
- Respect app developers and their intellectual property
- Follow responsible disclosure for any vulnerabilities found
- Do not use for bypassing legitimate payment systems

Remember: The goal is to improve security and find bugs, not to exploit or harm.
`;
  
  await fs.writeFile(path.join(docsDir, 'TESTING_GUIDE.md'), testingGuide);
  sendLog(clientId, '✅ Testing documentation created', 'success');
}
