/**
 * GymTight Fitness ETimeTrack Quick Diagnostic Tool
 * Run this first at client site to assess integration feasibility
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

class QuickDiagnostic {
  constructor() {
    this.results = {
      system: {},
      etimetrack: {},
      database: {},
      network: {},
      recommendations: []
    };
  }

  async runFullDiagnostic() {
    console.log('ðŸ” GymTight Fitness ETimeTrack Quick Diagnostic');
    console.log('=' .repeat(50));
    console.log('Assessing client site for integration readiness...\n');

    await this.checkSystemInfo();
    await this.checkETimeTrackInstallation();
    await this.checkDatabaseAccess();
    await this.checkNetworkAccess();
    this.generateRecommendations();
    this.printReport();

    return this.results;
  }

  async checkSystemInfo() {
    console.log('ðŸ“Š System Information Check...');
    
    try {
      const os = require('os');
      this.results.system = {
        platform: os.platform(),
        version: os.release(),
        architecture: os.arch(),
        totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024) + ' GB',
        freeMemory: Math.round(os.freemem() / 1024 / 1024 / 1024) + ' GB',
        hostname: os.hostname(),
        networkInterface: Object.keys(os.networkInterfaces())
      };

      console.log(`   OS: ${this.results.system.platform} ${this.results.system.version}`);
      console.log(`   Memory: ${this.results.system.totalMemory} total, ${this.results.system.freeMemory} free`);
      console.log(`   Computer: ${this.results.system.hostname}`);
      console.log('   âœ… System info collected\n');

    } catch (error) {
      console.log('   âŒ System info collection failed\n');
      this.results.system.error = error.message;
    }
  }

  async checkETimeTrackInstallation() {
    console.log('ðŸ•’ ETimeTrack Installation Check...');
    
    const possiblePaths = [
      'C:\\Program Files\\ZKTeco\\ETimeTrack\\',
      'C:\\Program Files (x86)\\ZKTeco\\ETimeTrack\\',
      'C:\\ETimeTrack\\',
      'C:\\ZKTeco\\ETimeTrack\\',
      'D:\\Program Files\\ZKTeco\\ETimeTrack\\',
      'D:\\ETimeTrack\\'
    ];

    this.results.etimetrack = {
      installed: false,
      version: null,
      path: null,
      executable: null,
      database: null,
      passwordProtected: null
    };

    for (const installPath of possiblePaths) {
      if (fs.existsSync(installPath)) {
        console.log(`   âœ… Found ETimeTrack installation: ${installPath}`);
        this.results.etimetrack.installed = true;
        this.results.etimetrack.path = installPath;

        // Look for executable
        const exePaths = ['ETimeTrack.exe', 'zktime.exe', 'timetrack.exe'];
        for (const exe of exePaths) {
          const exePath = path.join(installPath, exe);
          if (fs.existsSync(exePath)) {
            this.results.etimetrack.executable = exePath;
            console.log(`   âœ… Found executable: ${exe}`);
            break;
          }
        }

        // Look for database files
        const dbFiles = ['att2024.mdb', 'att2023.mdb', 'att2025.mdb', 'attendance.mdb'];
        for (const dbFile of dbFiles) {
          const dbPath = path.join(installPath, dbFile);
          if (fs.existsSync(dbPath)) {
            this.results.etimetrack.database = dbPath;
            console.log(`   âœ… Found database: ${dbFile}`);
            break;
          }
        }

        break;
      }
    }

    if (!this.results.etimetrack.installed) {
      console.log('   âŒ ETimeTrack installation not found in standard locations');
      console.log('   ðŸ” Performing system-wide search...');
      await this.deepSearchETimeTrack();
    }

    // Test if ETimeTrack is password protected
    if (this.results.etimetrack.executable) {
      await this.testPasswordProtection();
    }

    console.log('');
  }

  async deepSearchETimeTrack() {
    return new Promise((resolve) => {
      exec('dir "*.exe" /s /b | findstr -i "etimetrack\\|zktime\\|timetrack"', { timeout: 15000 }, (error, stdout) => {
        if (stdout) {
          const files = stdout.split('\n').filter(line => line.trim());
          if (files.length > 0) {
            console.log(`   âœ… Found ETimeTrack executable: ${files[0]}`);
            this.results.etimetrack.installed = true;
            this.results.etimetrack.executable = files[0].trim();
            this.results.etimetrack.path = path.dirname(files[0].trim());
          }
        }
        resolve();
      });
    });
  }

  async testPasswordProtection() {
    console.log('   ðŸ” Testing password protection...');
    
    // Try to run ETimeTrack and see if it prompts for password
    return new Promise((resolve) => {
      exec(`"${this.results.etimetrack.executable}" /?`, { timeout: 5000 }, (error, stdout, stderr) => {
        if (stdout && stdout.toLowerCase().includes('password')) {
          this.results.etimetrack.passwordProtected = true;
          console.log('   âŒ ETimeTrack is password protected');
        } else {
          this.results.etimetrack.passwordProtected = false;
          console.log('   âœ… ETimeTrack may not be password protected');
        }
        resolve();
      });
    });
  }

  async checkDatabaseAccess() {
    console.log('ðŸ—„ï¸ Database Access Check...');
    
    this.results.database = {
      found: false,
      accessible: false,
      path: null,
      size: null,
      records: null,
      error: null
    };

    // First check if we already found database
    if (this.results.etimetrack.database) {
      this.results.database.path = this.results.etimetrack.database;
      this.results.database.found = true;
    } else {
      // Search for database files
      const searchPaths = [
        'C:\\Program Files\\ZKTeco\\ETimeTrack\\att2024.mdb',
        'C:\\Program Files (x86)\\ZKTeco\\ETimeTrack\\att2024.mdb',
        'C:\\ETimeTrack\\att2024.mdb',
        'C:\\Users\\Public\\Documents\\ETimeTrack\\att2024.mdb',
        'C:\\ProgramData\\ZKTeco\\ETimeTrack\\att2024.mdb'
      ];

      for (const dbPath of searchPaths) {
        if (fs.existsSync(dbPath)) {
          this.results.database.path = dbPath;
          this.results.database.found = true;
          console.log(`   âœ… Found database: ${dbPath}`);
          break;
        }
      }
    }

    if (this.results.database.found) {
      try {
        const stats = fs.statSync(this.results.database.path);
        this.results.database.size = Math.round(stats.size / 1024) + ' KB';
        console.log(`   ðŸ“Š Database size: ${this.results.database.size}`);
        console.log(`   ðŸ“… Last modified: ${stats.mtime.toLocaleDateString()}`);

        // Test database connection (requires node-adodb)
        try {
          const ADODB = require('node-adodb');
          const connectionString = `Provider=Microsoft.Jet.OLEDB.4.0;Data Source=${this.results.database.path};`;
          const connection = ADODB.open(connectionString);
          
          const result = await connection.query('SELECT COUNT(*) as count FROM USERINFO');
          this.results.database.accessible = true;
          this.results.database.records = result[0].count;
          
          await connection.close();
          
          console.log(`   âœ… Database accessible - ${this.results.database.records} users found`);
          
        } catch (dbError) {
          console.log(`   âŒ Database connection failed: ${dbError.message}`);
          this.results.database.error = dbError.message;
        }

      } catch (error) {
        console.log(`   âŒ Database file access error: ${error.message}`);
        this.results.database.error = error.message;
      }
    } else {
      console.log('   âŒ No database files found');
    }

    console.log('');
  }

  async checkNetworkAccess() {
    console.log('ðŸŒ Network Connectivity Check...');
    
    this.results.network = {
      internetAccess: false,
      GymTight FitnessPanelAccess: false,
      localIp: null,
      firewallStatus: null
    };

    // Check internet connectivity
    await this.testInternetConnection();
    
    // Get local IP
    try {
      const os = require('os');
      const interfaces = os.networkInterfaces();
      for (const interfaceName in interfaces) {
        for (const iface of interfaces[interfaceName]) {
          if (iface.family === 'IPv4' && !iface.internal) {
            this.results.network.localIp = iface.address;
            console.log(`   ðŸŒ Local IP: ${this.results.network.localIp}`);
            break;
          }
        }
      }
    } catch (error) {
      console.log('   âŒ Could not determine local IP');
    }

    console.log('');
  }

  async testInternetConnection() {
    return new Promise((resolve) => {
      exec('ping google.com -n 1', { timeout: 5000 }, (error, stdout) => {
        if (error) {
          console.log('   âŒ No internet connectivity');
          this.results.network.internetAccess = false;
        } else {
          console.log('   âœ… Internet connectivity confirmed');
          this.results.network.internetAccess = true;
        }
        resolve();
      });
    });
  }

  generateRecommendations() {
    console.log('ðŸ’¡ Generating Integration Recommendations...');
    
    // Database access recommendations
    if (this.results.database.accessible) {
      this.results.recommendations.push({
        priority: 'HIGH',
        type: 'SUCCESS',
        message: 'Direct database access available - proceed with standard integration'
      });
    } else if (this.results.database.found && !this.results.database.accessible) {
      this.results.recommendations.push({
        priority: 'HIGH',
        type: 'ACTION',
        message: 'Database found but not accessible - try running as Administrator'
      });
    } else if (!this.results.database.found && this.results.etimetrack.installed) {
      this.results.recommendations.push({
        priority: 'MEDIUM',
        type: 'SEARCH',
        message: 'ETimeTrack installed but database not in standard location - manual search required'
      });
    } else {
      this.results.recommendations.push({
        priority: 'HIGH',
        type: 'INSTALL',
        message: 'No ETimeTrack installation found - fresh installation recommended'
      });
    }

    // Password protection recommendations
    if (this.results.etimetrack.passwordProtected) {
      this.results.recommendations.push({
        priority: 'HIGH',
        type: 'BYPASS',
        message: 'ETimeTrack is password protected - use direct database access method'
      });
    }

    // Network recommendations
    if (!this.results.network.internetAccess) {
      this.results.recommendations.push({
        priority: 'MEDIUM',
        type: 'NETWORK',
        message: 'No internet access - admin panel will work locally only'
      });
    }

    console.log('');
  }

  printReport() {
    console.log('ðŸ“‹ INTEGRATION FEASIBILITY REPORT');
    console.log('=' .repeat(50));
    console.log('');

    // Overall Status
    const canIntegrate = this.results.database.accessible || 
                        (this.results.etimetrack.installed && this.results.database.found);
    
    if (canIntegrate) {
      console.log('ðŸŽ‰ INTEGRATION STATUS: FEASIBLE');
      console.log('âœ… GymTight Fitness can be integrated with existing ETimeTrack system');
    } else {
      console.log('âš ï¸ INTEGRATION STATUS: REQUIRES SETUP');
      console.log('ðŸ”§ Additional steps needed before integration can proceed');
    }
    console.log('');

    // Detailed Findings
    console.log('ðŸ” DETAILED FINDINGS:');
    console.log(`   System: ${this.results.system.platform} ${this.results.system.version}`);
    console.log(`   ETimeTrack: ${this.results.etimetrack.installed ? 'Installed' : 'Not Found'}`);
    console.log(`   Database: ${this.results.database.accessible ? 'Accessible' : 'Issues Found'}`);
    console.log(`   Network: ${this.results.network.internetAccess ? 'Connected' : 'Limited'}`);
    console.log('');

    // Recommendations
    console.log('ðŸ“‹ RECOMMENDED ACTIONS:');
    this.results.recommendations.forEach((rec, index) => {
      const icon = rec.priority === 'HIGH' ? 'ðŸ”´' : rec.priority === 'MEDIUM' ? 'ðŸŸ¡' : 'ðŸŸ¢';
      console.log(`${index + 1}. ${icon} [${rec.type}] ${rec.message}`);
    });
    console.log('');

    // Next Steps
    console.log('ðŸš€ NEXT STEPS:');
    if (this.results.database.accessible) {
      console.log('1. Run: deploy-client-integration.bat');
      console.log('2. Configure admin panel URL');
      console.log('3. Test fingerprint device connectivity');
    } else if (this.results.database.found) {
      console.log('1. Run this diagnostic as Administrator');
      console.log('2. If still blocked, use manual database path setup');
      console.log('3. Run: deploy-client-integration.bat');
    } else {
      console.log('1. Install fresh ETimeTrack software');
      console.log('2. Connect fingerprint device');
      console.log('3. Re-run diagnostic');
      console.log('4. Run: deploy-client-integration.bat');
    }
    console.log('');

    console.log('ðŸ“ž SUPPORT: If issues persist, contact technical team');
    console.log('ðŸ“§ Email: support@GymTight Fitness.com');
  }
}

// Main function
async function runQuickDiagnostic() {
  const diagnostic = new QuickDiagnostic();
  
  try {
    await diagnostic.runFullDiagnostic();
    
    // Save results to file
    fs.writeFileSync('diagnostic-report.json', JSON.stringify(diagnostic.results, null, 2));
    console.log('ðŸ’¾ Diagnostic report saved to: diagnostic-report.json');
    
    return diagnostic.results;
  } catch (error) {
    console.log(`âŒ Diagnostic failed: ${error.message}`);
    return null;
  }
}

// Export for use in other scripts
module.exports = { QuickDiagnostic, runQuickDiagnostic };

// Run if called directly
if (require.main === module) {
  runQuickDiagnostic();
}