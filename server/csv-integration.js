/**
 * ETimeTrack CSV Integration Service
 * Simple approach to read CSV exports from ETimeTrack
 */

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const firebaseConfig = require('./firebase-config');

class ETimeTrackCSVIntegration {
  constructor() {
    this.watchFolder = process.env.CSV_WATCH_FOLDER || './etimetrack-exports';
    this.processedFolder = path.join(this.watchFolder, 'processed');
    this.db = null;
    this.ensureFolders();
  }

  async initializeFirebase() {
    try {
      const firebase = await firebaseConfig.initialize();
      if (firebase) {
        this.db = firebase.db;
        console.log('✅ Firebase initialized via shared config');
      } else {
        console.error('❌ Failed to initialize Firebase');
      }
    } catch (error) {
      console.error('Firebase initialization error:', error);
    }
  }

  ensureFolders() {
    [this.watchFolder, this.processedFolder].forEach(folder => {
      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
        console.log(`📁 Created folder: ${folder}`);
      }
    });
  }

  /**
   * Process CSV file from ETimeTrack export
   */
  async processCSVFile(filePath) {
    return new Promise((resolve, reject) => {
      const results = [];
      
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => {
          // Auto-detect column names and map to standard format
          const normalized = this.normalizeCSVRow(data);
          if (normalized) {
            results.push(normalized);
          }
        })
        .on('end', () => {
          console.log(`✅ Processed ${results.length} records from ${path.basename(filePath)}`);
          resolve(results);
        })
        .on('error', reject);
    });
  }

  /**
   * Normalize CSV row to standard format
   */
  normalizeCSVRow(row) {
    // Convert all keys to lowercase for easier matching
    const lowerRow = {};
    Object.keys(row).forEach(key => {
      lowerRow[key.toLowerCase().trim()] = row[key];
    });

    // Try to map common field variations
    const employeeId = this.findValue(lowerRow, ['employeeid', 'userid', 'id', 'personid', 'empid', 'employee_id']);
    const employeeName = this.findValue(lowerRow, ['employeename', 'name', 'fullname', 'username', 'employee_name', 'emp_name']);
    const dateTime = this.findValue(lowerRow, ['datetime', 'timestamp', 'punchtime', 'time', 'date_time', 'punch_time']);
    const date = this.findValue(lowerRow, ['date', 'punchdate', 'day', 'punch_date']);
    const time = this.findValue(lowerRow, ['time', 'punchtime', 'clock_time']);
    const punchType = this.findValue(lowerRow, ['punchtype', 'type', 'in_out', 'direction', 'punch_type']);
    const device = this.findValue(lowerRow, ['device', 'terminal', 'scanner', 'machine', 'reader']);

    if (!employeeId || !employeeName) {
      return null; // Skip rows without essential data
    }

    // Parse date/time
    let punchDateTime;
    if (dateTime) {
      punchDateTime = new Date(dateTime);
    } else if (date && time) {
      punchDateTime = new Date(`${date} ${time}`);
    } else if (date) {
      punchDateTime = new Date(date);
    } else {
      return null; // Skip without valid date
    }

    if (isNaN(punchDateTime.getTime())) {
      return null; // Skip invalid dates
    }

    return {
      personId: employeeId,
      personName: employeeName,
      scanTime: punchDateTime,
      punchType: punchType || 'IN',
      deviceInfo: {
        name: device || 'ETimeTrack Import',
        location: 'Main Entrance'
      },
      confidence: 1.0,
      source: 'ETimeTrack-CSV',
      rawData: row
    };
  }

  /**
   * Find value from multiple possible field names
   */
  findValue(row, fieldNames) {
    for (const field of fieldNames) {
      if (row[field] !== undefined && row[field] !== '') {
        return row[field];
      }
    }
    return null;
  }

  /**
   * Sync records to Firebase
   */
  async syncToFirebase(records) {
    if (!this.db) {
      console.log('❌ Firebase not initialized');
      return;
    }

    try {
      const admin = require('firebase-admin');
      const batch = this.db.batch();
      let count = 0;

      for (const record of records) {
        // Create unique ID based on person, date, and time to avoid duplicates
        const dateStr = record.scanTime.toISOString().split('T')[0];
        const timeStr = record.scanTime.toTimeString().split(' ')[0].replace(/:/g, '');
        const docId = `${record.personId}_${dateStr}_${timeStr}`;
        
        const docRef = this.db.collection('fingerprint_logs').doc(docId);
        
        const data = {
          personId: record.personId,
          personName: record.personName,
          personType: 'member', // Default, can be updated later
          scanTime: admin.firestore.Timestamp.fromDate(record.scanTime),
          deviceInfo: record.deviceInfo,
          confidence: record.confidence,
          source: record.source,
          syncedAt: admin.firestore.Timestamp.now(),
          punchType: record.punchType
        };

        batch.set(docRef, data, { merge: true });
        count++;

        // Commit in batches of 500 (Firestore limit)
        if (count % 500 === 0) {
          await batch.commit();
          console.log(`📝 Synced ${count} records...`);
        }
      }

      // Commit remaining records
      if (count % 500 !== 0) {
        await batch.commit();
      }

      console.log(`✅ Successfully synced ${count} records to Firebase`);
    } catch (error) {
      console.error('❌ Error syncing to Firebase:', error);
    }
  }

  /**
   * Watch folder for new CSV files
   */
  startWatching() {
    console.log(`👀 Watching folder: ${this.watchFolder}`);
    
    fs.watch(this.watchFolder, async (eventType, filename) => {
      if (eventType === 'rename' && filename && filename.endsWith('.csv')) {
        const filePath = path.join(this.watchFolder, filename);
        
        // Wait a bit to ensure file is fully written
        setTimeout(async () => {
          if (fs.existsSync(filePath)) {
            console.log(`📄 New CSV file detected: ${filename}`);
            await this.processFile(filePath);
          }
        }, 2000);
      }
    });
  }

  /**
   * Process a single file
   */
  async processFile(filePath) {
    try {
      const records = await this.processCSVFile(filePath);
      
      if (records.length > 0) {
        await this.syncToFirebase(records);
        
        // Move processed file
        const processedPath = path.join(this.processedFolder, `processed_${Date.now()}_${path.basename(filePath)}`);
        fs.renameSync(filePath, processedPath);
        console.log(`📦 Moved processed file to: ${processedPath}`);
      } else {
        console.log('⚠️ No valid records found in CSV file');
      }
    } catch (error) {
      console.error('❌ Error processing file:', error);
    }
  }

  /**
   * Process all existing CSV files
   */
  async processExistingFiles() {
    const files = fs.readdirSync(this.watchFolder)
      .filter(file => file.endsWith('.csv'))
      .map(file => path.join(this.watchFolder, file));

    console.log(`📂 Found ${files.length} existing CSV files`);

    for (const file of files) {
      await this.processFile(file);
    }
  }

  /**
   * Generate sample CSV file for testing
   */
  generateSampleCSV() {
    const sampleData = [
      ['EmployeeID', 'EmployeeName', 'DateTime', 'PunchType', 'Device'],
      ['EMP001', 'John Doe', '2024-01-15 09:00:00', 'IN', 'Main Scanner'],
      ['EMP001', 'John Doe', '2024-01-15 17:30:00', 'OUT', 'Main Scanner'],
      ['EMP002', 'Jane Smith', '2024-01-15 09:15:00', 'IN', 'Main Scanner'],
      ['EMP002', 'Jane Smith', '2024-01-15 17:45:00', 'OUT', 'Main Scanner']
    ];

    const csvContent = sampleData.map(row => row.join(',')).join('\n');
    const samplePath = path.join(this.watchFolder, 'sample_attendance.csv');
    
    fs.writeFileSync(samplePath, csvContent);
    console.log(`📄 Sample CSV created: ${samplePath}`);
  }
}

module.exports = ETimeTrackCSVIntegration;

// CLI usage
if (require.main === module) {
  const integration = new ETimeTrackCSVIntegration();
  
  // Initialize Firebase first
  integration.initializeFirebase().then(() => {
    // Generate sample if no files exist
    const csvFiles = fs.readdirSync(integration.watchFolder).filter(f => f.endsWith('.csv'));
    if (csvFiles.length === 0) {
      console.log('📝 No CSV files found, generating sample...');
      integration.generateSampleCSV();
    }
    
    // Process existing files
    integration.processExistingFiles().then(() => {
      // Start watching for new files
      integration.startWatching();
      console.log('🚀 CSV Integration service started');
    });
  }).catch(error => {
    console.error('❌ Failed to start CSV integration:', error);
  });
}