#!/usr/bin/env node

/**
 * ETimeTrack Integration Setup Script
 * Helps configure and test the integration
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise(resolve => {
    rl.question(question, resolve);
  });
}

async function setup() {
  console.log('🚀 ETimeTrack Integration Setup\n');
  
  // Check if ETimeTrack database exists
  const defaultPath = 'C:\\TimeTrackLite\\TimeTrackLite1.mdb';
  console.log('📋 Checking for ETimeTrack database...');
  
  let dbPath = await ask(`Enter ETimeTrack database path [${defaultPath}]: `);
  if (!dbPath.trim()) {
    dbPath = defaultPath;
  }
  
  // Verify file exists
  if (!fs.existsSync(dbPath)) {
    console.log('❌ Database file not found at:', dbPath);
    console.log('Please check the path and try again.');
    process.exit(1);
  }
  
  console.log('✅ Database file found');
  
  // Get sync interval
  const syncInterval = await ask('Enter sync interval in seconds [30]: ') || '30';
  
  // Get Firebase project details
  console.log('\n🔥 Firebase Configuration:');
  const firebaseProjectId = await ask('Enter Firebase Project ID: ');
  const firebaseDatabaseUrl = await ask('Enter Firebase Database URL: ');
  
  // Create .env file
  const envContent = `# ETimeTrack Integration Configuration
# Generated on ${new Date().toISOString()}

# Database Settings
ETIMETRACK_DB_PATH=${dbPath.replace(/\\/g, '\\\\')}
ETIMETRACK_CONNECTION_STRING=Provider=Microsoft.ACE.OLEDB.12.0;Data Source=${dbPath.replace(/\\/g, '\\\\')};

# Sync Settings
SYNC_INTERVAL_MS=${parseInt(syncInterval) * 1000}
BATCH_SIZE=100
MAX_RETRIES=3

# Firebase Settings
FIREBASE_PROJECT_ID=${firebaseProjectId}
FIREBASE_DATABASE_URL=${firebaseDatabaseUrl}
FIREBASE_SERVICE_ACCOUNT_PATH=./firebase-service-account.json

# Logging
LOG_LEVEL=info
LOG_FILE=etimetrack-sync.log

# API Settings
API_PORT=3001
API_HOST=localhost

# Data Mapping
PUNCH_TABLE_NAME=Punches
EMPLOYEE_TABLE_NAME=Employees
DEVICE_TABLE_NAME=Devices

# Field Mappings
EMPLOYEE_ID_FIELDS=EmployeeID,UserID,ID,PersonID
EMPLOYEE_NAME_FIELDS=EmployeeName,Name,FullName,UserName
PUNCH_TIME_FIELDS=DateTime,PunchTime,Time
PUNCH_DATE_FIELDS=PunchDate,Date
PUNCH_TYPE_FIELDS=PunchType,Type
DEVICE_FIELDS=Device,Terminal,Scanner
`;

  fs.writeFileSync('.env', envContent);
  console.log('✅ Configuration saved to .env');
  
  // Test connection
  console.log('\n🔍 Testing database connection...');
  
  try {
    const ETimeTrackReader = require('./etimetrack-reader');
    const reader = new ETimeTrackReader(dbPath);
    
    const connected = await reader.connect();
    if (connected) {
      console.log('✅ Database connection successful');
      
      // Discover schema
      console.log('📊 Discovering database schema...');
      const schema = await reader.discoverSchema();
      
      console.log('\n📋 Available tables:');
      Object.keys(schema).forEach(table => {
        console.log(`  - ${table} (${schema[table].length} columns)`);
      });
      
      await reader.close();
      
    } else {
      console.log('❌ Database connection failed');
    }
  } catch (error) {
    console.log('❌ Connection test error:', error.message);
  }
  
  // Next steps
  console.log('\n🎉 Setup complete!');
  console.log('\nNext steps:');
  console.log('1. Place your Firebase service account JSON file as "firebase-service-account.json"');
  console.log('2. Run "npm install" to install dependencies');
  console.log('3. Run "npm start" to start the bridge service');
  console.log('4. Test the API at http://localhost:3001/health');
  
  rl.close();
}

setup().catch(error => {
  console.error('Setup failed:', error);
  rl.close();
  process.exit(1);
});