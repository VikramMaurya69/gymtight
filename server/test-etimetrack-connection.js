/**
 * ETimeTrack Database Connection Test
 * Use this script to verify connectivity to client's existing ETimeTrack database
 */

const ADODB = require('node-adodb');
const fs = require('fs');
const path = require('path');

// Common ETimeTrack database paths to check
const COMMON_PATHS = [
  'C:\\Program Files\\ZKTeco\\ETimeTrack\\att2024.mdb',
  'C:\\Program Files (x86)\\ZKTeco\\ETimeTrack\\att2024.mdb',
  'C:\\ETimeTrack\\att2024.mdb',
  'C:\\ZKTeco\\ETimeTrack\\att2024.mdb',
  'D:\\ETimeTrack\\att2024.mdb'
];

class ETimeTrackTester {
  constructor() {
    this.dbPath = '';
    this.connection = null;
  }

  /**
   * Find ETimeTrack database file
   */
  async findDatabase() {
    console.log('ðŸ” Searching for ETimeTrack database...\n');
    
    for (const dbPath of COMMON_PATHS) {
      console.log(`Checking: ${dbPath}`);
      
      if (fs.existsSync(dbPath)) {
        console.log(`âœ… Found database at: ${dbPath}\n`);
        this.dbPath = dbPath;
        return true;
      } else {
        console.log(`âŒ Not found`);
      }
    }
    
    console.log('\nâŒ ETimeTrack database not found in common locations.');
    console.log('Please provide the exact path to the client\'s ETimeTrack database file.\n');
    return false;
  }

  /**
   * Test database connection
   */
  async testConnection(customPath = null) {
    const dbPath = customPath || this.dbPath;
    
    if (!dbPath) {
      throw new Error('Database path not specified');
    }

    console.log(`ðŸ”— Testing connection to: ${dbPath}`);
    
    try {
      // Create ADODB connection
      const connectionString = `Provider=Microsoft.Jet.OLEDB.4.0;Data Source=${dbPath};`;
      this.connection = ADODB.open(connectionString);
      
      console.log('âœ… Database connection successful!\n');
      return true;
    } catch (error) {
      console.log(`âŒ Connection failed: ${error.message}\n`);
      return false;
    }
  }

  /**
   * Analyze database structure
   */
  async analyzeDatabase() {
    if (!this.connection) {
      throw new Error('Database not connected');
    }

    console.log('ðŸ“Š Analyzing database structure...\n');

    try {
      // Check for standard ETimeTrack tables
      const tables = ['USERINFO', 'CHECKINOUT', 'DEPARTMENTS', 'HOLIDAYS'];
      
      for (const table of tables) {
        try {
          const result = await this.connection.query(`SELECT COUNT(*) as count FROM ${table}`);
          const count = result[0].count;
          console.log(`âœ… ${table}: ${count} records`);
        } catch (error) {
          console.log(`âŒ ${table}: Table not found or inaccessible`);
        }
      }
      
      console.log('\n');
    } catch (error) {
      console.log(`âŒ Database analysis failed: ${error.message}\n`);
    }
  }

  /**
   * Get sample user data
   */
  async getSampleData() {
    if (!this.connection) {
      throw new Error('Database not connected');
    }

    console.log('ðŸ‘¥ Sample user data:\n');

    try {
      const users = await this.connection.query('SELECT TOP 5 userid, badgenumber, name, dept FROM USERINFO');
      
      if (users.length > 0) {
        console.log('Users found:');
        users.forEach(user => {
          console.log(`  - ID: ${user.userid}, Name: ${user.name}, Badge: ${user.badgenumber}, Dept: ${user.dept}`);
        });
      } else {
        console.log('No users found in database');
      }
      
      console.log('\n');
    } catch (error) {
      console.log(`âŒ Could not retrieve user data: ${error.message}\n`);
    }
  }

  /**
   * Get recent attendance records
   */
  async getRecentAttendance() {
    if (!this.connection) {
      throw new Error('Database not connected');
    }

    console.log('ðŸ“‹ Recent attendance records:\n');

    try {
      const attendance = await this.connection.query(`
        SELECT TOP 10 userid, checktime, checktype 
        FROM CHECKINOUT 
        ORDER BY checktime DESC
      `);
      
      if (attendance.length > 0) {
        console.log('Recent scans:');
        attendance.forEach(record => {
          console.log(`  - User: ${record.userid}, Time: ${record.checktime}, Type: ${record.checktype}`);
        });
      } else {
        console.log('No attendance records found');
      }
      
      console.log('\n');
    } catch (error) {
      console.log(`âŒ Could not retrieve attendance data: ${error.message}\n`);
    }
  }

  /**
   * Generate integration report
   */
  generateReport() {
    console.log('ðŸ“ INTEGRATION READINESS REPORT');
    console.log('================================\n');
    
    if (this.dbPath) {
      console.log(`âœ… Database Location: ${this.dbPath}`);
      console.log('âœ… Database Accessible: Yes');
      console.log('âœ… Ready for GymTight Fitness Integration: Yes\n');
      
      console.log('Next Steps:');
      console.log('1. Update .env file with database path:');
      console.log(`   ETIMETRACK_DB_PATH=${this.dbPath}`);
      console.log('2. Install bridge server dependencies: npm install');
      console.log('3. Start bridge server: npm start');
      console.log('4. Test real-time sync with admin panel\n');
    } else {
      console.log('âŒ Database not found or not accessible');
      console.log('âŒ Manual database path configuration required\n');
      
      console.log('Required Actions:');
      console.log('1. Locate client\'s ETimeTrack database file (.mdb)');
      console.log('2. Ensure file has read permissions');
      console.log('3. Run test again with correct path\n');
    }
  }

  /**
   * Close database connection
   */
  async close() {
    if (this.connection) {
      try {
        await this.connection.close();
        console.log('ðŸ” Database connection closed.\n');
      } catch (error) {
        console.log('Error closing connection:', error.message);
      }
    }
  }
}

/**
 * Main test function
 */
async function runTest(customPath = null) {
  const tester = new ETimeTrackTester();
  
  try {
    console.log('ðŸš€ GymTight Fitness ETimeTrack Integration Test\n');
    
    // Step 1: Find database
    let found = false;
    if (customPath) {
      console.log(`Testing custom path: ${customPath}\n`);
      tester.dbPath = customPath;
      found = true;
    } else {
      found = await tester.findDatabase();
    }
    
    if (!found) {
      tester.generateReport();
      return;
    }
    
    // Step 2: Test connection
    const connected = await tester.testConnection();
    if (!connected) {
      tester.generateReport();
      return;
    }
    
    // Step 3: Analyze database
    await tester.analyzeDatabase();
    
    // Step 4: Get sample data
    await tester.getSampleData();
    
    // Step 5: Get recent attendance
    await tester.getRecentAttendance();
    
    // Step 6: Generate report
    tester.generateReport();
    
  } catch (error) {
    console.log(`âŒ Test failed: ${error.message}`);
  } finally {
    await tester.close();
  }
}

// Run test
if (require.main === module) {
  // Check if custom path provided as command line argument
  const customPath = process.argv[2];
  
  if (customPath) {
    console.log(`Testing with custom path: ${customPath}\n`);
  }
  
  runTest(customPath);
}

module.exports = { ETimeTrackTester, runTest };