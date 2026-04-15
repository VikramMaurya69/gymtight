/**
 * ETimeTrack Database Bridge Service
 * Real-time sync between ETimeTrack MS Access database and Firebase
 * Handles fingerprint device data through ETimeTrack middleware
 */

const firebaseConfig = require('./firebase-config');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

// For MS Access database connection
const ADODB = require('node-adodb');
// Alternative: use odbc for better performance
// const odbc = require('odbc');

// For MS Access, we'll use ADODB connection through edge-js or similar
// Alternative: Convert Access DB to JSON/CSV exports or use ODBC driver

class ETimeTrackBridge extends EventEmitter {
  constructor() {
    super();
    this.dbPath = '';
    this.connectionString = '';
    this.syncInterval = 5000; // 5 seconds for real-time sync
    this.isRunning = false;
    this.db = null;
    this.connection = null;
    this.lastSyncTimestamp = new Date();
    this.watchedTables = ['AttendanceLog', 'CheckInOut', 'Transactions']; // Common ETimeTrack table names
  }

  /**
   * Initialize Firebase Admin SDK
   */
  async initializeFirebase() {
    try {
      const firebase = await firebaseConfig.initialize();
      if (firebase) {
        this.db = firebase.db;
        console.log('✅ Firebase Admin initialized via shared config');
      } else {
        console.error('❌ Failed to initialize Firebase');
      }
    } catch (error) {
      console.error('Firebase initialization error:', error);
    }
  }

  /**
   * Configure database connection
   */
  configure(config) {
    this.dbPath = config.dbPath || '';
    this.connectionString = config.connectionString || `Provider=Microsoft.ACE.OLEDB.12.0;Data Source=${this.dbPath}`;
    this.syncInterval = config.syncInterval || 30000;
  }

  /**
   * Test connection to ETimeTrack database
   */
  async testConnection() {
    try {
      console.log('🔍 Testing connection to ETimeTrack database...');
      
      // Check if database file exists
      if (!this.dbPath || !fs.existsSync(this.dbPath)) {
        console.log('❌ Database file not found at:', this.dbPath);
        return false;
      }

      // Initialize ADODB connection
      this.connection = ADODB.open(this.connectionString);
      
      // Test query to verify connection
      const testQuery = `SELECT TOP 1 * FROM MSysObjects WHERE Type=1`;
      const result = await this.connection.query(testQuery);
      
      console.log('✅ ETimeTrack database connection successful');
      console.log('📊 Available tables:', await this.getTableNames());
      
      return true;
    } catch (error) {
      console.error('❌ ETimeTrack connection test failed:', error);
      return false;
    }
  }

  /**
   * Get available table names from ETimeTrack database
   */
  async getTableNames() {
    try {
      const query = `SELECT Name FROM MSysObjects WHERE Type=1 AND Name NOT LIKE 'MSys*'`;
      const result = await this.connection.query(query);
      return result.map(row => row.Name);
    } catch (error) {
      console.error('Error getting table names:', error);
      return [];
    }
  }

  /**
   * Read new fingerprint records from ETimeTrack database
   * Supports multiple common ETimeTrack table schemas
   */
  async readNewFingerprintRecords() {
    try {
      const newRecords = [];
      
      // Try common ETimeTrack table structures
      const queries = [
        // Standard ETimeTrack schema
        `SELECT * FROM AttendanceLog 
         WHERE TimeStamp > #${this.formatAccessDate(this.lastSyncTimestamp)}# 
         ORDER BY TimeStamp DESC`,
        
        // Alternative schema
        `SELECT * FROM CheckInOut 
         WHERE DateTime > #${this.formatAccessDate(this.lastSyncTimestamp)}# 
         ORDER BY DateTime DESC`,
         
        // Generic transaction log
        `SELECT * FROM Transactions 
         WHERE TransactionTime > #${this.formatAccessDate(this.lastSyncTimestamp)}# 
         ORDER BY TransactionTime DESC`
      ];

      for (const query of queries) {
        try {
          const result = await this.connection.query(query);
          if (result && result.length > 0) {
            console.log(`📥 Found ${result.length} new records in ETimeTrack`);
            
            // Normalize the data structure
            const normalizedRecords = result.map(record => this.normalizeRecord(record));
            newRecords.push(...normalizedRecords);
            break; // Use first successful query
          }
        } catch (queryError) {
          // Try next query if this one fails
          continue;
        }
      }

      return newRecords;
    } catch (error) {
      console.error('❌ Error reading fingerprint records from ETimeTrack:', error);
      return [];
    }
  }

  /**
   * Normalize different ETimeTrack record formats
   */
  normalizeRecord(record) {
    // Map common field names from different ETimeTrack versions
    const fieldMappings = {
      // Employee ID variations
      employeeId: record.EmployeeID || record.UserID || record.ID || record.PersonID,
      
      // Name variations  
      employeeName: record.EmployeeName || record.UserName || record.Name || record.PersonName,
      
      // Timestamp variations
      punchTime: record.TimeStamp || record.DateTime || record.TransactionTime || record.PunchTime,
      
      // Type variations (IN/OUT)
      punchType: record.Type || record.InOut || record.Direction || 'IN',
      
      // Device info
      device: record.DeviceName || record.TerminalName || record.Location || 'Unknown Device',
      
      // Quality/Confidence
      confidence: record.Quality || record.Confidence || 100
    };

    return {
      employeeId: fieldMappings.employeeId?.toString(),
      employeeName: fieldMappings.employeeName || 'Unknown',
      punchTime: new Date(fieldMappings.punchTime),
      punchType: this.determinePunchType(fieldMappings.punchType),
      device: fieldMappings.device,
      confidence: parseInt(fieldMappings.confidence) || 100,
      rawData: record // Keep original data for debugging
    };
  }

  /**
   * Determine punch type from various formats
   */
  determinePunchType(typeValue) {
    if (!typeValue) return 'IN';
    
    const type = typeValue.toString().toUpperCase();
    
    // Handle numeric types (0=IN, 1=OUT)
    if (type === '0' || type === 'IN' || type === 'CHECK_IN') return 'IN';
    if (type === '1' || type === 'OUT' || type === 'CHECK_OUT') return 'OUT';
    
    return type;
  }

  /**
   * Format date for MS Access queries
   */
  formatAccessDate(date) {
    return date.toISOString().slice(0, 19).replace('T', ' ');
  }

  /**
   * Sync data from ETimeTrack to Firebase
   */
  async syncToFirebase(records) {
    try {
      const batch = this.db.batch();
      
      for (const record of records) {
        const docRef = this.db.collection('attendance').doc();
        const attendanceData = {
          personId: record.employeeId,
          personName: record.employeeName,
          scanTime: admin.firestore.Timestamp.fromDate(record.punchTime),
          punchType: record.punchType,
          deviceInfo: {
            name: record.device,
            location: 'Main Entrance'
          },
          confidence: record.confidence / 100,
          source: 'ETimeTrack',
          syncedAt: admin.firestore.Timestamp.now()
        };
        
        batch.set(docRef, attendanceData);
      }
      
      await batch.commit();
      console.log(`✅ Synced ${records.length} attendance records to Firebase`);
    } catch (error) {
      console.error('Error syncing to Firebase:', error);
    }
  }

  /**
   * Start real-time monitoring of ETimeTrack database
   */
  async startRealTimeMonitoring() {
    if (this.isRunning) {
      console.log('⚠️  Real-time monitoring is already running');
      return;
    }

    console.log('🚀 Starting ETimeTrack real-time fingerprint monitoring...');
    
    if (!await this.testConnection()) {
      console.error('❌ Cannot start monitoring - database connection failed');
      return;
    }

    this.isRunning = true;
    this.lastSyncTimestamp = new Date();

    const monitorLoop = async () => {
      try {
        if (!this.isRunning) return;

        // Check for new fingerprint records
        const newRecords = await this.readNewFingerprintRecords();
        
        if (newRecords.length > 0) {
          console.log(`🔍 Found ${newRecords.length} new fingerprint records`);
          
          // Sync to Firebase immediately
          await this.syncToFirebase(newRecords);
          
          // Emit real-time events for webhooks/websockets
          this.emit('newFingerprints', newRecords);
          
          // Update last sync timestamp
          this.lastSyncTimestamp = new Date();
        }

        // Continue monitoring
        setTimeout(monitorLoop, this.syncInterval);
        
      } catch (error) {
        console.error('❌ Error in monitoring loop:', error);
        
        // Retry after longer interval on error
        setTimeout(monitorLoop, this.syncInterval * 3);
      }
    };

    // Start the monitoring loop
    monitorLoop();
    
    console.log(`✅ Real-time monitoring started (checking every ${this.syncInterval}ms)`);
  }

  /**
   * Legacy sync method for backward compatibility
   */
  async startSync() {
    return this.startRealTimeMonitoring();
  }
        
        const records = await this.readAttendanceRecords(lastHour, now);
        
        if (records.length > 0) {
          await this.syncToFirebase(records);
        }
        
        // Schedule next sync
        setTimeout(syncLoop, this.syncInterval);
      } catch (error) {
        console.error('Sync loop error:', error);
        setTimeout(syncLoop, this.syncInterval);
      }
    };

    syncLoop();
  }

  /**
   * Stop sync process
   */
  stopSync() {
    this.isRunning = false;
    console.log('⏹️ Stopping ETimeTrack sync process...');
  }

  /**
   * Manual sync trigger
   */
  async manualSync() {
    try {
      console.log('🔄 Manual sync triggered...');
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const records = await this.readAttendanceRecords(yesterday, now);
      await this.syncToFirebase(records);
      
      console.log('✅ Manual sync completed');
    } catch (error) {
      console.error('Manual sync error:', error);
    }
  }
}

module.exports = ETimeTrackBridge;

// CLI usage
if (require.main === module) {
  const bridge = new ETimeTrackBridge();
  
  // Initialize Firebase first
  bridge.initializeFirebase().then(() => {
    // Configure with your ETimeTrack database path
    bridge.configure({
      dbPath: process.env.ETIMETRACK_DB_PATH || 'C:\\TimeTrackLite\\TimeTrackLite1.mdb',
      syncInterval: parseInt(process.env.SYNC_INTERVAL_MS) || 30000
    });

    // Test connection and start sync
    bridge.testConnection().then(success => {
      if (success) {
        bridge.startSync();
        console.log('🚀 ETimeTrack Bridge service started');
      } else {
        console.log('❌ Cannot connect to ETimeTrack database');
      }
    });
  }).catch(error => {
    console.error('❌ Failed to start ETimeTrack bridge:', error);
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    bridge.stopSync();
    process.exit(0);
  });
}