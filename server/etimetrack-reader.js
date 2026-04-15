/**
 * MS Access Database Reader for ETimeTrack
 * Uses ODBC connection to read from MS Access database
 */

const { Database } = require('node-adodb');
const path = require('path');

class ETimeTrackReader {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this.connection = null;
    this.isConnected = false;
  }

  /**
   * Connect to MS Access database
   */
  async connect() {
    try {
      // Connection string for MS Access
      const connectionString = `Provider=Microsoft.ACE.OLEDB.12.0;Data Source=${this.dbPath};`;
      this.connection = Database.open(connectionString);
      this.isConnected = true;
      console.log('✅ Connected to ETimeTrack database');
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to ETimeTrack database:', error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Get all table names from the database
   */
  async getTables() {
    try {
      if (!this.isConnected) await this.connect();
      
      const query = `
        SELECT Name FROM MSysObjects 
        WHERE Type=1 AND Flags=0 
        ORDER BY Name
      `;
      
      const result = await this.connection.query(query);
      return result.map(row => row.Name);
    } catch (error) {
      console.error('Error getting table names:', error);
      return [];
    }
  }

  /**
   * Get table schema
   */
  async getTableSchema(tableName) {
    try {
      if (!this.isConnected) await this.connect();
      
      const query = `SELECT TOP 1 * FROM [${tableName}]`;
      const result = await this.connection.query(query);
      
      if (result.length > 0) {
        return Object.keys(result[0]);
      }
      return [];
    } catch (error) {
      console.error(`Error getting schema for table ${tableName}:`, error);
      return [];
    }
  }

  /**
   * Read attendance/punch records
   * Common table names: Punches, Attendance, TimeLog, etc.
   */
  async readPunchRecords(startDate, endDate, tableName = 'Punches') {
    try {
      if (!this.isConnected) await this.connect();
      
      // Format dates for SQL query
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      // Common query patterns for time tracking systems
      const queries = [
        // Standard punch table
        `SELECT * FROM [${tableName}] 
         WHERE PunchDate BETWEEN #${startDateStr}# AND #${endDateStr}#
         ORDER BY PunchDate, PunchTime`,
        
        // Alternative with DateTime field
        `SELECT * FROM [${tableName}] 
         WHERE DateTime BETWEEN #${startDateStr}# AND #${endDateStr}#
         ORDER BY DateTime`,
         
        // Another common pattern
        `SELECT * FROM [${tableName}] 
         WHERE Date BETWEEN #${startDateStr}# AND #${endDateStr}#
         ORDER BY Date, Time`
      ];
      
      for (const query of queries) {
        try {
          const result = await this.connection.query(query);
          if (result && result.length > 0) {
            console.log(`✅ Found ${result.length} records using query pattern`);
            return this.normalizeRecords(result);
          }
        } catch (queryError) {
          console.log(`Query pattern failed, trying next...`);
          continue;
        }
      }
      
      console.log('No records found with standard query patterns');
      return [];
    } catch (error) {
      console.error('Error reading punch records:', error);
      return [];
    }
  }

  /**
   * Read employee/user data
   */
  async readEmployees(tableName = 'Employees') {
    try {
      if (!this.isConnected) await this.connect();
      
      const queries = [
        `SELECT * FROM [${tableName}]`,
        `SELECT * FROM [Users]`,
        `SELECT * FROM [Personnel]`,
        `SELECT * FROM [Staff]`
      ];
      
      for (const query of queries) {
        try {
          const result = await this.connection.query(query);
          if (result && result.length > 0) {
            console.log(`✅ Found ${result.length} employees`);
            return result;
          }
        } catch (queryError) {
          continue;
        }
      }
      
      return [];
    } catch (error) {
      console.error('Error reading employees:', error);
      return [];
    }
  }

  /**
   * Normalize records to standard format
   */
  normalizeRecords(records) {
    return records.map(record => {
      // Try to map common field names to standard format
      const normalized = {
        employeeId: record.EmployeeID || record.UserID || record.ID || record.PersonID,
        employeeName: record.EmployeeName || record.Name || record.FullName || record.UserName,
        punchTime: record.DateTime || record.PunchTime || record.Time,
        punchDate: record.PunchDate || record.Date,
        punchType: record.PunchType || record.Type || 'IN',
        device: record.Device || record.Terminal || record.Scanner || 'Unknown',
        confidence: record.Confidence || record.MatchScore || 100,
        rawData: record // Keep original for debugging
      };
      
      // Combine date and time if separate
      if (normalized.punchDate && normalized.punchTime && !normalized.DateTime) {
        const dateStr = normalized.punchDate.toISOString().split('T')[0];
        const timeStr = typeof normalized.punchTime === 'string' 
          ? normalized.punchTime 
          : normalized.punchTime.toTimeString().split(' ')[0];
        normalized.punchTime = new Date(`${dateStr}T${timeStr}`);
      }
      
      return normalized;
    });
  }

  /**
   * Auto-discover database schema
   */
  async discoverSchema() {
    try {
      console.log('🔍 Discovering ETimeTrack database schema...');
      
      const tables = await this.getTables();
      console.log('📋 Available tables:', tables);
      
      const schema = {};
      
      for (const table of tables) {
        const columns = await this.getTableSchema(table);
        schema[table] = columns;
        console.log(`📊 Table ${table}:`, columns);
      }
      
      return schema;
    } catch (error) {
      console.error('Error discovering schema:', error);
      return {};
    }
  }

  /**
   * Close database connection
   */
  async close() {
    try {
      if (this.connection) {
        await this.connection.close();
        this.isConnected = false;
        console.log('🔌 Database connection closed');
      }
    } catch (error) {
      console.error('Error closing connection:', error);
    }
  }
}

module.exports = ETimeTrackReader;

// Test the connection if run directly
if (require.main === module) {
  const dbPath = 'C:\\TimeTrackLite\\TimeTrackLite1.mdb'; // Adjust path
  const reader = new ETimeTrackReader(dbPath);
  
  async function test() {
    try {
      await reader.connect();
      await reader.discoverSchema();
      
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const records = await reader.readPunchRecords(yesterday, now);
      console.log('📝 Sample records:', records.slice(0, 3));
      
      const employees = await reader.readEmployees();
      console.log('👥 Sample employees:', employees.slice(0, 3));
      
    } catch (error) {
      console.error('Test failed:', error);
    } finally {
      await reader.close();
    }
  }
  
  test();
}