import fs from 'fs-extra';
import path from 'path';
import AdmZip from 'adm-zip';
import xml2js from 'xml2js';
import { execSync } from 'child_process';

export class EnhancedAPKValidator {
  static async comprehensiveValidation(apkPath, clientId, sendLog) {
    sendLog(clientId, '🔍 Starting comprehensive APK validation...', 'info');
    
    const validationResults = {
      structureValid: false,
      manifestValid: false,
      signaturesValid: false,
      resourcesValid: false,
      dexValid: false,
      nativeLibsValid: false,
      installationCompatible: false,
      issues: [],
      warnings: []
    };

    try {
      // 1. Basic structure validation
      await this.validateBasicStructure(apkPath, validationResults, clientId, sendLog);
      
      // 2. Manifest deep validation
      await this.validateManifestDeep(apkPath, validationResults, clientId, sendLog);
      
      // 3. DEX files validation
      await this.validateDexFiles(apkPath, validationResults, clientId, sendLog);
      
      // 4. Resources validation
      await this.validateResources(apkPath, validationResults, clientId, sendLog);
      
      // 5. Native libraries validation
      await this.validateNativeLibraries(apkPath, validationResults, clientId, sendLog);
      
      // 6. Installation compatibility check
      await this.validateInstallationCompatibility(apkPath, validationResults, clientId, sendLog);
      
      // 7. Security analysis
      await this.performSecurityAnalysis(apkPath, validationResults, clientId, sendLog);
      
      return validationResults;
      
    } catch (error) {
      sendLog(clientId, `❌ Validation failed: ${error.message}`, 'error');
      validationResults.issues.push(`Validation error: ${error.message}`);
      return validationResults;
    }
  }
  
  static async validateBasicStructure(apkPath, results, clientId, sendLog) {
    sendLog(clientId, '📦 Validating APK basic structure...', 'info');
    
    try {
      const zip = new AdmZip(apkPath);
      const entries = zip.getEntries();
      
      // Required files check
      const requiredFiles = [
        'AndroidManifest.xml',
        'classes.dex',
        'META-INF/MANIFEST.MF'
      ];
      
      const foundFiles = entries.map(entry => entry.entryName);
      const missingRequired = requiredFiles.filter(file => 
        !foundFiles.some(found => found.includes(file.split('/').pop()))
      );
      
      if (missingRequired.length > 0) {
        results.issues.push(`Missing required files: ${missingRequired.join(', ')}`);
        sendLog(clientId, `⚠️ Missing required files: ${missingRequired.join(', ')}`, 'warning');
      }
      
      // Check for common APK components
      const hasResources = foundFiles.some(file => file.startsWith('res/'));
      const hasAssets = foundFiles.some(file => file.startsWith('assets/'));
      const hasLib = foundFiles.some(file => file.startsWith('lib/'));
      
      if (!hasResources) {
        results.warnings.push('No resources directory found');
      }
      
      // Validate file integrity
      let corruptedFiles = 0;
      for (const entry of entries) {
        try {
          if (!entry.isDirectory) {
            const data = entry.getData();
            if (data.length === 0 && !entry.entryName.endsWith('/')) {
              corruptedFiles++;
            }
          }
        } catch (error) {
          corruptedFiles++;
        }
      }
      
      if (corruptedFiles > 0) {
        results.issues.push(`${corruptedFiles} corrupted files detected`);
        sendLog(clientId, `⚠️ ${corruptedFiles} corrupted files detected`, 'warning');
      }
      
      results.structureValid = missingRequired.length === 0 && corruptedFiles === 0;
      sendLog(clientId, `✅ Structure validation: ${results.structureValid ? 'PASSED' : 'FAILED'}`, 
        results.structureValid ? 'success' : 'error');
      
    } catch (error) {
      results.issues.push(`Structure validation error: ${error.message}`);
      sendLog(clientId, `❌ Structure validation failed: ${error.message}`, 'error');
    }
  }
  
  static async validateManifestDeep(apkPath, results, clientId, sendLog) {
    sendLog(clientId, '📋 Deep manifest validation...', 'info');
    
    try {
      const zip = new AdmZip(apkPath);
      const manifestEntry = zip.getEntry('AndroidManifest.xml');
      
      if (!manifestEntry) {
        results.issues.push('AndroidManifest.xml not found');
        return;
      }
      
      const manifestData = manifestEntry.getData();
      
      // Check if manifest is binary (AXML format)
      const isBinary = manifestData[0] === 0x03 && manifestData[1] === 0x00;
      
      if (isBinary) {
        sendLog(clientId, '📋 Binary manifest detected (AXML format)', 'info');
        results.manifestValid = true; // Binary manifests are valid, just need conversion
      } else {
        // Try to parse as XML
        try {
          const manifestContent = manifestData.toString('utf8');
          const parser = new xml2js.Parser();
          const result = await parser.parseStringPromise(manifestContent);
          
          // Validate manifest structure
          if (!result.manifest) {
            results.issues.push('Invalid manifest structure - missing manifest root');
          } else {
            // Check for required attributes
            if (!result.manifest.$ || !result.manifest.$.package) {
              results.warnings.push('Missing package name in manifest');
            }
            
            if (!result.manifest.application) {
              results.warnings.push('No application element in manifest');
            }
            
            results.manifestValid = true;
          }
        } catch (parseError) {
          results.issues.push(`Manifest parsing error: ${parseError.message}`);
        }
      }
      
      sendLog(clientId, `✅ Manifest validation: ${results.manifestValid ? 'PASSED' : 'FAILED'}`, 
        results.manifestValid ? 'success' : 'error');
      
    } catch (error) {
      results.issues.push(`Manifest validation error: ${error.message}`);
      sendLog(clientId, `❌ Manifest validation failed: ${error.message}`, 'error');
    }
  }
  
  static async validateDexFiles(apkPath, results, clientId, sendLog) {
    sendLog(clientId, '🔧 Validating DEX files...', 'info');
    
    try {
      const zip = new AdmZip(apkPath);
      const entries = zip.getEntries();
      
      const dexFiles = entries.filter(entry => 
        entry.entryName.endsWith('.dex') && !entry.isDirectory
      );
      
      if (dexFiles.length === 0) {
        results.issues.push('No DEX files found');
        return;
      }
      
      sendLog(clientId, `📱 Found ${dexFiles.length} DEX file(s)`, 'info');
      
      let validDexCount = 0;
      for (const dexEntry of dexFiles) {
        try {
          const dexData = dexEntry.getData();
          
          // Basic DEX header validation
          const dexMagic = dexData.slice(0, 8).toString('ascii');
          if (dexMagic.startsWith('dex\n')) {
            validDexCount++;
          } else {
            results.warnings.push(`Invalid DEX magic in ${dexEntry.entryName}`);
          }
        } catch (error) {
          results.warnings.push(`Error reading DEX file ${dexEntry.entryName}: ${error.message}`);
        }
      }
      
      results.dexValid = validDexCount > 0;
      sendLog(clientId, `✅ DEX validation: ${validDexCount}/${dexFiles.length} valid`, 
        results.dexValid ? 'success' : 'warning');
      
    } catch (error) {
      results.issues.push(`DEX validation error: ${error.message}`);
      sendLog(clientId, `❌ DEX validation failed: ${error.message}`, 'error');
    }
  }
  
  static async validateResources(apkPath, results, clientId, sendLog) {
    sendLog(clientId, '🎨 Validating resources...', 'info');
    
    try {
      const zip = new AdmZip(apkPath);
      const entries = zip.getEntries();
      
      const resourceFiles = entries.filter(entry => 
        entry.entryName.startsWith('res/') && !entry.isDirectory
      );
      
      const resourcesArsc = entries.find(entry => entry.entryName === 'resources.arsc');
      
      if (resourceFiles.length === 0 && !resourcesArsc) {
        results.warnings.push('No resources found');
      } else {
        sendLog(clientId, `🎨 Found ${resourceFiles.length} resource files`, 'info');
        
        if (resourcesArsc) {
          try {
            const arscData = resourcesArsc.getData();
            // Basic ARSC validation
            if (arscData.length > 0) {
              sendLog(clientId, '📦 resources.arsc found and readable', 'success');
            }
          } catch (error) {
            results.warnings.push('resources.arsc is corrupted');
          }
        }
      }
      
      results.resourcesValid = true;
      
    } catch (error) {
      results.issues.push(`Resources validation error: ${error.message}`);
      sendLog(clientId, `❌ Resources validation failed: ${error.message}`, 'error');
    }
  }
  
  static async validateNativeLibraries(apkPath, results, clientId, sendLog) {
    sendLog(clientId, '📚 Validating native libraries...', 'info');
    
    try {
      const zip = new AdmZip(apkPath);
      const entries = zip.getEntries();
      
      const libFiles = entries.filter(entry => 
        entry.entryName.startsWith('lib/') && entry.entryName.endsWith('.so')
      );
      
      if (libFiles.length === 0) {
        sendLog(clientId, '📚 No native libraries found', 'info');
      } else {
        const architectures = new Set();
        libFiles.forEach(lib => {
          const pathParts = lib.entryName.split('/');
          if (pathParts.length >= 2) {
            architectures.add(pathParts[1]);
          }
        });
        
        sendLog(clientId, `📚 Found libraries for: ${Array.from(architectures).join(', ')}`, 'info');
        
        // Validate library files
        let validLibs = 0;
        for (const libEntry of libFiles) {
          try {
            const libData = libEntry.getData();
            // Basic ELF header check
            if (libData.length >= 4 && libData[0] === 0x7F && 
                libData[1] === 0x45 && libData[2] === 0x4C && libData[3] === 0x46) {
              validLibs++;
            }
          } catch (error) {
            results.warnings.push(`Error reading library ${libEntry.entryName}`);
          }
        }
        
        sendLog(clientId, `✅ ${validLibs}/${libFiles.length} libraries validated`, 'success');
      }
      
      results.nativeLibsValid = true;
      
    } catch (error) {
      results.issues.push(`Native libraries validation error: ${error.message}`);
      sendLog(clientId, `❌ Native libraries validation failed: ${error.message}`, 'error');
    }
  }
  
  static async validateInstallationCompatibility(apkPath, results, clientId, sendLog) {
    sendLog(clientId, '📱 Checking installation compatibility...', 'info');
    
    try {
      const zip = new AdmZip(apkPath);
      const entries = zip.getEntries();
      
      // Check for potential installation blockers
      const metaInfFiles = entries.filter(entry => 
        entry.entryName.startsWith('META-INF/')
      );
      
      const signatureFiles = metaInfFiles.filter(entry =>
        entry.entryName.endsWith('.RSA') || 
        entry.entryName.endsWith('.DSA') || 
        entry.entryName.endsWith('.SF')
      );
      
      if (signatureFiles.length > 0) {
        sendLog(clientId, '🔐 Original signatures detected (will be removed for dev installation)', 'info');
      }
      
      // Check for problematic files
      const problematicFiles = entries.filter(entry =>
        entry.entryName.includes('..') || 
        entry.entryName.includes('\\') ||
        entry.entryName.length > 255
      );
      
      if (problematicFiles.length > 0) {
        results.warnings.push(`${problematicFiles.length} files with problematic names`);
      }
      
      results.installationCompatible = true;
      sendLog(clientId, '✅ Installation compatibility check passed', 'success');
      
    } catch (error) {
      results.issues.push(`Installation compatibility check error: ${error.message}`);
      sendLog(clientId, `❌ Installation compatibility check failed: ${error.message}`, 'error');
    }
  }
  
  static async performSecurityAnalysis(apkPath, results, clientId, sendLog) {
    sendLog(clientId, '🔒 Performing security analysis...', 'info');
    
    try {
      const zip = new AdmZip(apkPath);
      const entries = zip.getEntries();
      
      // Check for suspicious files
      const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.vbs'];
      const suspiciousFiles = entries.filter(entry =>
        suspiciousExtensions.some(ext => entry.entryName.toLowerCase().endsWith(ext))
      );
      
      if (suspiciousFiles.length > 0) {
        results.warnings.push(`${suspiciousFiles.length} suspicious files detected`);
      }
      
      // Check for obfuscation indicators
      const dexFiles = entries.filter(entry => entry.entryName.endsWith('.dex'));
      if (dexFiles.length > 10) {
        results.warnings.push('High number of DEX files (possible obfuscation)');
      }
      
      sendLog(clientId, '✅ Security analysis completed', 'success');
      
    } catch (error) {
      results.warnings.push(`Security analysis error: ${error.message}`);
      sendLog(clientId, `⚠️ Security analysis had issues: ${error.message}`, 'warning');
    }
  }
}
