/**
 * ETimeTrack Database Finder & Direct Access Tool
 * Bypasses password-protected ETimeTrack software to access database directly
 */

const fs = require('fs');
const path = require('path');
const ADODB = require('node-adodb');

class ETimeTrackDatabaseFinder {
  constructor() {
    this.foundDatabases = [];
    this.accessibleDatabases = [];
    this.databaseInfo = {};
  }

  /**
   * Comprehensive search for ETimeTrack database files
   */
  async findAllDatabases() {
    console.log('ðŸ” Searching for ETimeTrack database files...\n');
    
    const searchPaths = [
      // Standard ETimeTrack locations
      'C:\\Program Files\\ZKTeco\\ETimeTrack\\',
      'C:\\Program Files (x86)\\ZKTeco\\ETimeTrack\\',
      'C:\\ETimeTrack\\',
      'C:\\ZKTeco\\ETimeTrack\\',
      'D:\\Program Files\\ZKTeco\\ETimeTrack\\',
      'D:\\ETimeTrack\\',
      
      // Common backup locations
      'C:\\Users\\Public\\Documents\\ETimeTrack\\',
      'C:\\ProgramData\\ZKTeco\\ETimeTrack\\',
      'C:\\Backup\\ETimeTrack\\',
      'C:\\Data\\ETimeTrack\\',
      
      // User document folders
      'C:\\Users\\Administrator\\Documents\\ETimeTrack\\',
      'C:\\Users\\Admin\\Documents\\ETimeTrack\\',
      'C:\\Users\\User\\Documents\\ETimeTrack\\',
    ];

    const databaseFiles = [
      'att2024.mdb',
      'att2023.mdb',
      'att2025.mdb',
      'attendance.mdb',
      'etimetrack.mdb',
      'database.mdb',
      'zktime.mdb',
      'access.mdb'
    ];

    // Search in standard locations
    for (const searchPath of searchPaths) {
      for (const dbFile of databaseFiles) {
        const fullPath = path.join(searchPath, dbFile);
        await this.checkDatabase(fullPath);
      }
      
      // Also search for backup folders
      await this.searchBackupFolders(searchPath);
    }

    // Search entire C: drive for .mdb files (if nothing found above)
    if (this.foundDatabases.length === 0) {
      console.log('ðŸ” Performing deep search for .mdb files...');
      await this.deepSearchMdbFiles('C:\\');
    }

    return this.foundDatabases;
  }

  /**
   * Check if a specific database file exists and is accessible
   */
  async checkDatabase(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        
        console.log(`âœ… Found: ${filePath}`);
        console.log(`   Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   Modified: ${stats.mtime.toLocaleDateString()}`);
        
        this.foundDatabases.push(filePath);
        
        // Test if we can read the file
        const isAccessible = await this.testDatabaseAccess(filePath);
        if (isAccessible) {
          this.accessibleDatabases.push(filePath);
          console.log(`   âœ… ACCESSIBLE - Can connect without password!`);
        } else {
          console.log(`   âŒ ACCESS DENIED - File permissions issue`);
        }
        
        console.log('');
      }
    } catch (error) {
      // Silently continue searching
    }
  }

  /**
   * Search for backup folders in ETimeTrack directories
   */
  async searchBackupFolders(basePath) {
    try {
      if (fs.existsSync(basePath)) {
        const backupFolders = ['Backup', 'backup', 'Bak', 'Data', 'Database'];
        
        for (const folder of backupFolders) {
          const backupPath = path.join(basePath, folder);
          if (fs.existsSync(backupPath)) {
            const files = fs.readdirSync(backupPath);
            for (const file of files) {
              if (file.toLowerCase().endsWith('.mdb')) {
                await this.checkDatabase(path.join(backupPath, file));
              }
            }
          }
        }
      }
    } catch (error) {
      // Continue searching
    }
  }

  /**
   * Deep search for .mdb files (when standard locations fail)
   */
  async deepSearchMdbFiles(rootPath) {
    try {
      const searchCommand = `dir "${rootPath}*.mdb" /s /b`;
      const { exec } = require('child_process');
      
      return new Promise((resolve) => {
        exec(searchCommand, { timeout: 30000 }, async (error, stdout, stderr) => {
          if (stdout) {
            const files = stdout.split('\n').filter(line => line.trim());
            console.log(`Found ${files.length} .mdb files on system`);
            
            for (const filePath of files) {
              if (filePath.includes('ETimeTrack') || 
                  filePath.includes('ZKTeco') || 
                  filePath.includes('att') ||
                  filePath.includes('attendance')) {
                await this.checkDatabase(filePath.trim());
              }
            }
          }
          resolve();
        });
      });
    } catch (error) {
      console.log('Deep search failed, continuing with found databases...');
    }
  }

  /**
   * Test direct database connection without password
   */
  async testDatabaseAccess(filePath) {
    try {
      const connectionString = `Provider=Microsoft.Jet.OLEDB.4.0;Data Source=${filePath};`;
      const connection = ADODB.open(connectionString);
      
      // Try to query a simple table
      const result = await connection.query('SELECT COUNT(*) as count FROM USERINFO');
      await connection.close();
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Analyze accessible database structure and content
   */
  async analyzeDatabases() {
    console.log('ðŸ“Š Analyzing accessible databases...\n');
    
    for (const dbPath of this.accessibleDatabases) {
      console.log(`Analyzing: ${dbPath}`);
      console.log('=' .repeat(50));
      
      try {
        const connectionString = `Provider=Microsoft.Jet.OLEDB.4.0;Data Source=${dbPath};`;
        const connection = ADODB.open(connectionString);
        
        const analysis = {
          users: 0,
          attendance: 0,
          departments: 0,
          recentActivity: null,
          tables: []
        };

        // Check USERINFO table
        try {
          const userResult = await connection.query('SELECT COUNT(*) as count FROM USERINFO');
          analysis.users = userResult[0].count;
          console.log(`ðŸ‘¥ Users: ${analysis.users}`);
        } catch (e) {
          console.log('âŒ USERINFO table not accessible');
        }

        // Check CHECKINOUT table
        try {
          const attendanceResult = await connection.query('SELECT COUNT(*) as count FROM CHECKINOUT');
          analysis.attendance = attendanceResult[0].count;
          console.log(`ðŸ“‹ Attendance Records: ${analysis.attendance}`);
          
          // Get most recent activity
          const recentResult = await connection.query('SELECT TOP 1 checktime FROM CHECKINOUT ORDER BY checktime DESC');
          if (recentResult.length > 0) {
            analysis.recentActivity = recentResult[0].checktime;
            console.log(`â° Last Activity: ${analysis.recentActivity}`);
          }
        } catch (e) {
          console.log('âŒ CHECKINOUT table not accessible');
        }

        // Check DEPARTMENTS table
        try {
          const deptResult = await connection.query('SELECT COUNT(*) as count FROM DEPARTMENTS');
          analysis.departments = deptResult[0].count;
          console.log(`ðŸ¢ Departments: ${analysis.departments}`);
        } catch (e) {
          console.log('â„¹ï¸ DEPARTMENTS table not found (optional)');
        }

        // Sample user data
        try {
          const sampleUsers = await connection.query('SELECT TOP 3 userid, name, badgenumber FROM USERINFO');
          if (sampleUsers.length > 0) {
            console.log('\nðŸ‘¥ Sample Users:');
            sampleUsers.forEach(user => {
              console.log(`   - ID: ${user.userid}, Name: ${user.name}, Badge: ${user.badgenumber}`);
            });
          }
        } catch (e) {
          console.log('Could not retrieve sample user data');
        }

        await connection.close();
        this.databaseInfo[dbPath] = analysis;
        
        console.log('\nâœ… DATABASE IS FULLY ACCESSIBLE!\n');
        
      } catch (error) {
        console.log(`âŒ Analysis failed: ${error.message}\n`);
      }
    }
  }

  /**
   * Generate integration readiness report
   */
  generateReport() {
    console.log('ðŸ“‹ ETIMETRACK DATABASE ACCESS REPORT');
    console.log('=' .repeat(50));
    console.log('');

    if (this.accessibleDatabases.length === 0) {
      console.log('âŒ NO ACCESSIBLE DATABASES FOUND');
      console.log('');
      console.log('Recommended Actions:');
      console.log('1. Run as Administrator to access protected files');
      console.log('2. Check if ETimeTrack is installed in custom location');
      console.log('3. Contact client to locate database file manually');
      console.log('4. Use fresh ETimeTrack installation as backup plan');
      return false;
    }

    console.log(`âœ… FOUND ${this.accessibleDatabases.length} ACCESSIBLE DATABASE(S):`);
    console.log('');

    // Show accessible databases
    this.accessibleDatabases.forEach((dbPath, index) => {
      const info = this.databaseInfo[dbPath];
      console.log(`Database ${index + 1}: ${dbPath}`);
      if (info) {
        console.log(`   - Users: ${info.users}`);
        console.log(`   - Attendance Records: ${info.attendance}`);
        console.log(`   - Last Activity: ${info.recentActivity || 'Unknown'}`);
      }
      console.log('');
    });

    console.log('ðŸš€ INTEGRATION STATUS: READY!');
    console.log('');
    console.log('Next Steps:');
    console.log('1. Configure GymTight Fitness bridge server with database path:');
    console.log(`   ETIMETRACK_DB_PATH=${this.accessibleDatabases[0]}`);
    console.log('2. Install bridge server: npm install');
    console.log('3. Start bridge server: npm start');
    console.log('4. Test admin panel connectivity');
    console.log('');

    return true;
  }

  /**
   * Test GymTight Fitness bridge connection
   */
  async testBridgeConnection() {
    if (this.accessibleDatabases.length === 0) {
      console.log('âŒ No accessible databases to test');
      return false;
    }

    const dbPath = this.accessibleDatabases[0];
    console.log(`ðŸ”— Testing GymTight Fitness bridge connection to: ${dbPath}`);
    
    try {
      // Simulate bridge server connection test
      const connectionString = `Provider=Microsoft.Jet.OLEDB.4.0;Data Source=${dbPath};`;
      const connection = ADODB.open(connectionString);
      
      // Test queries that bridge server will use
      const userCount = await connection.query('SELECT COUNT(*) as count FROM USERINFO');
      const attendanceCount = await connection.query('SELECT COUNT(*) as count FROM CHECKINOUT');
      
      await connection.close();
      
      console.log('âœ… Bridge connection test successful!');
      console.log(`   Users ready for sync: ${userCount[0].count}`);
      console.log(`   Attendance records ready: ${attendanceCount[0].count}`);
      console.log('');
      console.log('ðŸŽ‰ Ready for GymTight Fitness Admin Panel integration!');
      
      return true;
    } catch (error) {
      console.log(`âŒ Bridge connection failed: ${error.message}`);
      return false;
    }
  }
}

/**
 * Main execution function
 */
async function findAndAnalyzeETimeTrack() {
  console.log('ðŸš€ GymTight Fitness ETimeTrack Database Finder');
  console.log('Bypassing password protection - accessing database directly\n');
  
  const finder = new ETimeTrackDatabaseFinder();
  
  try {
    // Step 1: Find all databases
    await finder.findAllDatabases();
    
    // Step 2: Analyze accessible databases
    if (finder.accessibleDatabases.length > 0) {
      await finder.analyzeDatabases();
    }
    
    // Step 3: Generate report
    const success = finder.generateReport();
    
    // Step 4: Test bridge connection
    if (success) {
      await finder.testBridgeConnection();
    }
    
    return finder.accessibleDatabases;
    
  } catch (error) {
    console.log(`âŒ Search failed: ${error.message}`);
    console.log('Try running as Administrator or check system permissions');
    return [];
  }
}

// Export for use in other scripts
module.exports = { ETimeTrackDatabaseFinder, findAndAnalyzeETimeTrack };

// Run if called directly
if (require.main === module) {
  findAndAnalyzeETimeTrack();
}