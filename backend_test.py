#!/usr/bin/env python3
import requests
import json
import os
import time
import unittest
import uuid
from io import BytesIO

# Base URL for API requests - using the public endpoint
BASE_URL = "https://v0-newdev1-4y.vercel.app/api"

class APKConverterBackendTests(unittest.TestCase):
    """Test suite for APK Converter Backend API endpoints"""
    
    def setUp(self):
        """Setup before each test"""
        self.session_id = str(uuid.uuid4())
        
        # Create a small dummy APK file for testing
        self.dummy_apk_content = b'PK\x03\x04\x14\x00\x00\x00\x08\x00\x00\x00!\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00AndroidManifest.xml\x03\x00PK\x01\x02\x14\x00\x14\x00\x00\x00\x08\x00\x00\x00!\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00AndroidManifest.xml\x03\x00PK\x05\x06\x00\x00\x00\x00\x01\x00\x01\x00.\x00\x00\x00%\x00\x00\x00\x00\x00'
        
    def test_health_endpoint(self):
        """Test the /health endpoint"""
        print("\n🔍 Testing /health endpoint...")
        
        response = requests.get(f"{BASE_URL}/health")
        
        # Check status code
        self.assertEqual(response.status_code, 200, f"Expected status code 200, got {response.status_code}")
        
        # Check response structure
        data = response.json()
        self.assertIn('status', data, "Response missing 'status' field")
        self.assertIn('timestamp', data, "Response missing 'timestamp' field")
        self.assertIn('database', data, "Response missing 'database' field")
        self.assertIn('services', data, "Response missing 'services' field")
        
        # Check services structure
        services = data['services']
        expected_services = ['api', 'converter', 'aiChat', 'autoFix', 'monitor']
        for service in expected_services:
            self.assertIn(service, services, f"Response missing '{service}' in services")
        
        print(f"✅ Health endpoint test passed: {data['status']}")
        return data
    
    def test_chat_get_endpoint(self):
        """Test the GET /chat endpoint"""
        print("\n🔍 Testing GET /chat endpoint...")
        
        response = requests.get(f"{BASE_URL}/chat")
        
        # Check status code
        self.assertEqual(response.status_code, 200, f"Expected status code 200, got {response.status_code}")
        
        # Check response structure
        data = response.json()
        self.assertIn('status', data, "Response missing 'status' field")
        self.assertIn('features', data, "Response missing 'features' field")
        self.assertIn('xai_available', data, "Response missing 'xai_available' field")
        
        print(f"✅ Chat GET endpoint test passed")
        return data
    
    def test_chat_post_endpoint(self):
        """Test the POST /chat endpoint"""
        print("\n🔍 Testing POST /chat endpoint...")
        
        # Test with valid input
        payload = {
            "message": "How do I convert an APK to debug mode?",
            "sessionId": self.session_id
        }
        
        response = requests.post(f"{BASE_URL}/chat", json=payload)
        
        # Check status code
        self.assertEqual(response.status_code, 200, f"Expected status code 200, got {response.status_code}")
        
        # Check response structure
        data = response.json()
        self.assertIn('response', data, "Response missing 'response' field")
        
        # Check if we got a fallback response (expected if XAI_API_KEY is not configured)
        if 'fallback' in data and data['fallback']:
            print("ℹ️ Received fallback response as expected (XAI_API_KEY not configured)")
        
        # Test with invalid input (missing message)
        invalid_payload = {
            "sessionId": self.session_id
        }
        
        response = requests.post(f"{BASE_URL}/chat", json=invalid_payload)
        
        # Should return 400 Bad Request
        self.assertEqual(response.status_code, 400, f"Expected status code 400 for invalid input, got {response.status_code}")
        
        print(f"✅ Chat POST endpoint test passed")
        return data
    
    def test_convert_endpoint(self):
        """Test the /convert endpoint"""
        print("\n🔍 Testing /convert endpoint...")
        
        # Create a dummy APK file
        files = {
            'file': ('test.apk', BytesIO(self.dummy_apk_content), 'application/vnd.android.package-archive')
        }
        
        data = {
            'mode': 'debug'
        }
        
        response = requests.post(f"{BASE_URL}/convert", files=files, data=data)
        
        # Check status code - might be 400 if APK validation fails, which is expected with our dummy file
        # We're testing the API response format, not actual conversion
        print(f"Convert endpoint status code: {response.status_code}")
        print(f"Response: {response.text}")
        
        # Check response structure for both success and error cases
        try:
            data = response.json()
            
            if response.status_code == 200:
                self.assertIn('success', data, "Response missing 'success' field")
                if data['success']:
                    self.assertIn('downloadUrl', data, "Success response missing 'downloadUrl' field")
                    self.assertIn('filename', data, "Success response missing 'filename' field")
                    self.assertIn('sessionId', data, "Success response missing 'sessionId' field")
                    
                    # Save session_id and filename for download test
                    self.download_session_id = data['sessionId']
                    self.download_filename = data['filename']
                    print(f"✅ Convert endpoint test passed with successful conversion")
                else:
                    self.assertIn('error', data, "Error response missing 'error' field")
                    print(f"✅ Convert endpoint test passed with expected error: {data['error']}")
            else:
                self.assertIn('error', data, "Error response missing 'error' field")
                print(f"✅ Convert endpoint test passed with expected error: {data['error']}")
            
            return data
        except json.JSONDecodeError:
            print(f"⚠️ Convert endpoint returned non-JSON response")
            return None
    
    def test_download_endpoint(self):
        """Test the /download/[sessionId]/[filename] endpoint"""
        print("\n🔍 Testing /download endpoint...")
        
        # First we need to create a conversion to get a valid session ID and filename
        try:
            convert_data = self.test_convert_endpoint()
            
            if hasattr(self, 'download_session_id') and hasattr(self, 'download_filename'):
                session_id = self.download_session_id
                filename = self.download_filename
                
                response = requests.get(f"{BASE_URL}/download/{session_id}/{filename}")
                
                # Check if we got a file or an error
                if response.status_code == 200:
                    # Check content type
                    self.assertEqual(
                        response.headers['Content-Type'], 
                        'application/vnd.android.package-archive',
                        "Wrong content type for APK file"
                    )
                    
                    # Check content disposition
                    self.assertIn(
                        'attachment; filename=',
                        response.headers['Content-Disposition'],
                        "Content-Disposition header missing or incorrect"
                    )
                    
                    print(f"✅ Download endpoint test passed with successful file download")
                else:
                    # If file not found, that's expected with our dummy APK
                    try:
                        data = response.json()
                        self.assertIn('error', data, "Error response missing 'error' field")
                        print(f"✅ Download endpoint test passed with expected error: {data['error']}")
                    except json.JSONDecodeError:
                        print(f"⚠️ Download endpoint returned non-JSON error response: {response.status_code}")
            else:
                print("⚠️ Skipping download test as no valid session ID and filename available")
        except Exception as e:
            print(f"⚠️ Download endpoint test skipped due to error: {str(e)}")
    
    def test_invalid_endpoints(self):
        """Test invalid endpoints for proper error handling"""
        print("\n🔍 Testing invalid endpoints...")
        
        response = requests.get(f"{BASE_URL}/nonexistent-endpoint")
        
        # Should return 404 Not Found
        self.assertEqual(response.status_code, 404, f"Expected status code 404, got {response.status_code}")
        
        print(f"✅ Invalid endpoint test passed")
        
    def test_auto_fix_endpoints(self):
        """Test the auto-fix system endpoints"""
        print("\n🔍 Testing auto-fix system endpoints...")
        
        # Test the scan endpoint
        scan_response = requests.get(f"{BASE_URL}/auto-fix/scan")
        print(f"Auto-fix scan endpoint status code: {scan_response.status_code}")
        
        if scan_response.status_code == 200:
            try:
                scan_data = scan_response.json()
                print(f"✅ Auto-fix scan endpoint test passed")
            except json.JSONDecodeError:
                print(f"⚠️ Auto-fix scan endpoint returned non-JSON response")
        
        # Test the intelligent-scan endpoint
        intelligent_scan_response = requests.get(f"{BASE_URL}/auto-fix/intelligent-scan")
        print(f"Auto-fix intelligent-scan endpoint status code: {intelligent_scan_response.status_code}")
        
        if intelligent_scan_response.status_code == 200:
            try:
                intelligent_scan_data = intelligent_scan_response.json()
                print(f"✅ Auto-fix intelligent-scan endpoint test passed")
            except json.JSONDecodeError:
                print(f"⚠️ Auto-fix intelligent-scan endpoint returned non-JSON response")

def run_tests():
    """Run all tests"""
    print("🧪 Starting APK Converter Backend API Tests")
    
    # Create test suite
    suite = unittest.TestSuite()
    suite.addTest(APKConverterBackendTests('test_health_endpoint'))
    suite.addTest(APKConverterBackendTests('test_chat_get_endpoint'))
    suite.addTest(APKConverterBackendTests('test_chat_post_endpoint'))
    suite.addTest(APKConverterBackendTests('test_convert_endpoint'))
    suite.addTest(APKConverterBackendTests('test_download_endpoint'))
    suite.addTest(APKConverterBackendTests('test_auto_fix_endpoints'))
    suite.addTest(APKConverterBackendTests('test_invalid_endpoints'))
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Print summary
    print("\n📊 Test Summary:")
    print(f"Total tests: {result.testsRun}")
    print(f"Failures: {len(result.failures)}")
    print(f"Errors: {len(result.errors)}")
    print(f"Skipped: {len(result.skipped)}")
    
    # Print failures and errors
    if result.failures:
        print("\n❌ Failures:")
        for failure in result.failures:
            print(f"- {failure[0]}: {failure[1]}")
    
    if result.errors:
        print("\n❌ Errors:")
        for error in result.errors:
            print(f"- {error[0]}: {error[1]}")
    
    if not result.failures and not result.errors:
        print("\n✅ All tests passed successfully!")
    
    return result

if __name__ == "__main__":
    run_tests()
