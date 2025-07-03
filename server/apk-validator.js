import fs from 'fs-extra';
import path from 'path';
import AdmZip from 'adm-zip';
import xml2js from 'xml2js';

export class APKValidator {
  static async validateAPKStructure(apkPath, clientId, sendLog) {
    sendLog(clientId, '🔍 Validating APK structure...', 'info');
    
    try {
      const zip = new AdmZip(apkPath);
      const entries = zip.getEntries();
      
      // Check for required files
      const requiredFiles = ['AndroidManifest.xml', 'classes.dex'];
      const foundFiles = entries.map(entry => entry.entryName);
      
      const missingFiles = requiredFiles.filter(file => 
        !foundFiles.some(found => found.includes(file))
      );
      
      if (missingFiles.length > 0) {
        throw new Error(`Missing required files: ${missingFiles.join(', ')}`);
      }
      
      // Validate AndroidManifest.xml
      const manifestEntry = entries.find(entry => entry.entryName === 'AndroidManifest.xml');
      if (!manifestEntry) {
        throw new Error('AndroidManifest.xml not found');
      }
      
      // Check if manifest is readable
      try {
        const manifestContent = manifestEntry.getData();
        if (manifestContent.length === 0) {
          throw new Error('AndroidManifest.xml is empty');
        }
      } catch (error) {
        throw new Error(`Cannot read AndroidManifest.xml: ${error.message}`);
      }
      
      // Check APK size
      const stats = await fs.stat(apkPath);
      const sizeInMB = stats.size / (1024 * 1024);
      
      if (sizeInMB > 500) {
        sendLog(clientId, `⚠️ Large APK detected (${sizeInMB.toFixed(2)} MB)`, 'warning');
      }
      
      sendLog(clientId, `✅ APK structure validation passed (${entries.length} files)`, 'success');
      return {
        valid: true,
        fileCount: entries.length,
        sizeInMB: sizeInMB,
        hasManifest: true,
        hasDex: foundFiles.some(file => file.includes('.dex'))
      };
      
    } catch (error) {
      sendLog(clientId, `❌ APK validation failed: ${error.message}`, 'error');
      throw error;
    }
  }
  
  static async validateManifestStructure(manifestPath, clientId, sendLog) {
    sendLog(clientId, '📋 Validating manifest structure...', 'info');
    
    try {
      if (!await fs.pathExists(manifestPath)) {
        throw new Error('AndroidManifest.xml not found after extraction');
      }
      
      const manifestContent = await fs.readFile(manifestPath, 'utf8');
      
      // Check if it's binary (needs aapt to decode)
      if (manifestContent.includes('\x00') || !manifestContent.includes('<?xml')) {
        sendLog(clientId, '⚠️ Binary manifest detected, creating compatible version...', 'warning');
        return { isBinary: true, needsDecoding: true };
      }
      
      // Parse XML structure
      const parser = new xml2js.Parser({ 
        explicitArray: false,
        mergeAttrs: true,
        explicitRoot: true
      });
      
      const result = await parser.parseStringPromise(manifestContent);
      
      if (!result.manifest) {
        throw new Error('Invalid manifest structure - missing manifest root');
      }
      
      sendLog(clientId, '✅ Manifest structure validation passed', 'success');
      return {
        valid: true,
        isBinary: false,
        hasApplication: !!result.manifest.application,
        packageName: result.manifest.package || 'unknown'
      };
      
    } catch (error) {
      if (error.message.includes('Non-whitespace before first tag')) {
        sendLog(clientId, '⚠️ Binary manifest detected, will create compatible version', 'warning');
        return { isBinary: true, needsDecoding: true };
      }
      sendLog(clientId, `❌ Manifest validation failed: ${error.message}`, 'error');
      throw error;
    }
  }
  
  static async checkInstallationCompatibility(extractDir, clientId, sendLog) {
    sendLog(clientId, '📱 Checking installation compatibility...', 'info');
    
    try {
      const manifestPath = path.join(extractDir, 'AndroidManifest.xml');
      const manifestValidation = await this.validateManifestStructure(manifestPath, clientId, sendLog);
      
      // Check for common installation blockers
      const issues = [];
      
      // Check for META-INF signatures that might cause issues
      const metaInfPath = path.join(extractDir, 'META-INF');
      if (await fs.pathExists(metaInfPath)) {
        const metaFiles = await fs.readdir(metaInfPath);
        const signatureFiles = metaFiles.filter(file => 
          file.endsWith('.RSA') || file.endsWith('.DSA') || file.endsWith('.SF')
        );
        
        if (signatureFiles.length > 0) {
          issues.push('Original signatures detected - will be removed for dev installation');
        }
      }
      
      // Check for native libraries
      const libPath = path.join(extractDir, 'lib');
      if (await fs.pathExists(libPath)) {
        const architectures = await fs.readdir(libPath);
        sendLog(clientId, `📚 Native libraries found for: ${architectures.join(', ')}`, 'info');
      }
      
      if (issues.length > 0) {
        issues.forEach(issue => sendLog(clientId, `⚠️ ${issue}`, 'warning'));
      }
      
      sendLog(clientId, '✅ Installation compatibility check passed', 'success');
      return {
        compatible: true,
        issues: issues,
        manifestValid: manifestValidation.valid || manifestValidation.isBinary
      };
      
    } catch (error) {
      sendLog(clientId, `❌ Compatibility check failed: ${error.message}`, 'error');
      throw error;
    }
  }
}
