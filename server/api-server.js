/**
 * ETimeTrack Bridge API Server
 * Provides REST API endpoints for the admin panel to interact with ETimeTrack data
 */

// Handle command line arguments for service management
const args = process.argv.slice(2);
if (args.includes('--install-service')) {
  console.log('Installing GymTight Fitness Bridge Server as Windows Service...');
  require('./service-manager').install();
  return;
}
if (args.includes('--uninstall-service')) {
  console.log('Uninstalling GymTight Fitness Bridge Server Windows Service...');
  require('./service-manager').uninstall();
  return;
}

const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const { config } = require('dotenv');

// Conditionally load ETimeTrack components
let ETimeTrackBridge, getInstance, bridge;
try {
  const etimetrackModule = require('./etimetrack-bridge');
  ETimeTrackBridge = etimetrackModule.ETimeTrackBridge;
  getInstance = etimetrackModule.getInstance;
  bridge = getInstance();
} catch (error) {
  console.warn('âš ï¸  ETimeTrack integration not available:', error.message);
  console.log('ðŸ’¡ SMS functionality will work without ETimeTrack integration');
}

const smsService = require('./smsService');

// Load environment variables - try multiple paths for flexibility
const path = require('path');
const fs = require('fs');

// Try different .env file locations for executable deployment
const envPaths = [
  path.join(__dirname, '.env'),
  path.join(__dirname, 'config', '.env'),
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), 'config', '.env'),
  '../.env.local'
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    config({ path: envPath });
    console.log(`âœ… Loaded environment from: ${envPath}`);
    break;
  }
}

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize bridge singleton (only if ETimeTrack is available)
if (bridge) {
  // Configure bridge for client's existing ETimeTrack database
  bridge.configure({
    dbPath: process.env.ETIMETRACK_DB_PATH,
    syncInterval: parseInt(process.env.SYNC_INTERVAL_MS) || 5000
  });

  // Setup real-time event handlers
  bridge.on('newFingerprints', (records) => {
    console.log(`ðŸ“¡ Broadcasting ${records.length} new fingerprint records to clients`);
    io.emit('fingerprintData', {
      type: 'new_scans',
      data: records,
      timestamp: new Date().toISOString()
    });
  });

  bridge.on('dataSynced', (records) => {
    console.log(`ðŸ“¡ Broadcasting sync confirmation for ${records.length} records`);
    io.emit('syncUpdate', {
      type: 'sync_complete',
      count: records.length,
      timestamp: new Date().toISOString()
    });
  });
}

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`ðŸ“± Client connected: ${socket.id}`);
  
  socket.emit('connected', {
    message: bridge ? 'Connected to ETimeTrack Bridge' : 'Connected to SMS Server',
    bridgeStatus: bridge ? bridge.getStats() : null
  });
  
  socket.on('disconnect', () => {
    console.log(`ðŸ“± Client disconnected: ${socket.id}`);
  });
  
  // Client can request current status
  if (bridge) {
    socket.on('getStatus', () => {
      socket.emit('status', bridge.getStats());
    });
  }
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'ETimeTrack Bridge API',
    timestamp: new Date().toISOString()
  });
});

/**
 * Test database connection
 */
app.get('/api/test-connection', async (req, res) => {
  try {
    const isConnected = await bridge.testConnection();
    res.json({
      success: isConnected,
      message: isConnected ? 'Connection successful' : 'Connection failed',
      dbPath: process.env.ETIMETRACK_DB_PATH
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Connection test failed',
      error: error.message
    });
  }
});

/**
 * Discover database schema
 */
app.get('/api/discover-schema', async (req, res) => {
  try {
    await reader.connect();
    const schema = await reader.discoverSchema();
    await reader.close();
    
    res.json({
      success: true,
      schema: schema
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get attendance records from ETimeTrack
 */
app.get('/api/attendance', async (req, res) => {
  try {
    const { startDate, endDate, tableName } = req.query;
    
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    
    await reader.connect();
    const records = await reader.readPunchRecords(start, end, tableName);
    await reader.close();
    
    res.json({
      success: true,
      count: records.length,
      records: records
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get employee list from ETimeTrack
 */
app.get('/api/employees', async (req, res) => {
  try {
    const { tableName } = req.query;
    
    await reader.connect();
    const employees = await reader.readEmployees(tableName);
    await reader.close();
    
    res.json({
      success: true,
      count: employees.length,
      employees: employees
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Trigger manual sync to Firebase
 */
app.post('/api/sync', async (req, res) => {
  try {
    await bridge.manualSync();
    res.json({
      success: true,
      message: 'Manual sync completed'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Webhook endpoint for ETimeTrack to push new data
 */
app.post('/api/webhook/fingerprint', async (req, res) => {
  try {
    const { employeeId, timestamp, punchType, deviceId } = req.body;
    
    console.log('ðŸ“¥ Received fingerprint webhook:', { employeeId, timestamp, punchType, deviceId });
    
    // Create normalized record
    const record = {
      employeeId: employeeId,
      employeeName: 'Unknown', // Will be resolved from database
      punchTime: new Date(timestamp),
      punchType: punchType || 'IN',
      device: deviceId || 'Unknown Device',
      confidence: 100,
      source: 'ETimeTrack Webhook'
    };
    
    // Sync to Firebase immediately
    await bridge.syncToFirebase([record]);
    
    // Emit real-time event
    io.emit('fingerprintData', {
      type: 'webhook_scan',
      data: [record],
      timestamp: new Date().toISOString()
    });
    
    res.json({
      success: true,
      message: 'Fingerprint data processed',
      record: record
    });
    
  } catch (error) {
    console.error('âŒ Webhook processing error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get bridge status and statistics
 */
app.get('/api/status', (req, res) => {
  const stats = bridge.getStats();
  res.json({
    success: true,
    status: stats,
    connectedClients: io.sockets.sockets.size
  });
});

/**
 * Start real-time monitoring
 */
app.post('/api/start-monitoring', async (req, res) => {
  try {
    await bridge.initializeFirebase();
    await bridge.startRealTimeMonitoring();
    
    res.json({
      success: true,
      message: 'Real-time monitoring started'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Stop monitoring
 */
app.post('/api/stop-monitoring', (req, res) => {
  try {
    bridge.stopSync();
    res.json({
      success: true,
      message: 'Monitoring stopped'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get real-time attendance stream endpoint
 */
app.get('/api/stream/attendance', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  // Send initial connection message
  res.write(`data: ${JSON.stringify({
    type: 'connected',
    message: 'Connected to attendance stream',
    timestamp: new Date().toISOString()
  })}\n\n`);

  // Listen for new fingerprints
  const onNewFingerprints = (records) => {
    res.write(`data: ${JSON.stringify({
      type: 'fingerprint_data',
      records: records,
      timestamp: new Date().toISOString()
    })}\n\n`);
  };

  bridge.on('newFingerprints', onNewFingerprints);

  // Clean up on client disconnect
  req.on('close', () => {
    bridge.removeListener('newFingerprints', onNewFingerprints);
  });
});

/**
 * Start automatic sync
 */
app.post('/api/sync/start', async (req, res) => {
  try {
    await bridge.startSync();
    res.json({
      success: true,
      message: 'Automatic sync started'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Stop automatic sync
 */
app.post('/api/sync/stop', async (req, res) => {
  try {
    bridge.stopSync();
    res.json({
      success: true,
      message: 'Automatic sync stopped'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get sync status
 */
app.get('/api/sync/status', (req, res) => {
  res.json({
    success: true,
    isRunning: bridge.isRunning,
    syncInterval: bridge.syncInterval,
    lastSync: bridge.lastSyncTime || null
  });
});

/**
 * Update configuration
 */
app.post('/api/config', (req, res) => {
  try {
    const { dbPath, syncInterval, tableMappings } = req.body;
    
    bridge.configure({
      dbPath: dbPath || process.env.ETIMETRACK_DB_PATH,
      syncInterval: syncInterval || parseInt(process.env.SYNC_INTERVAL_MS)
    });
    
    res.json({
      success: true,
      message: 'Configuration updated'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Send SMS
 */
app.post('/api/sms/send', async (req, res) => {
  try {
    const { to, message } = req.body;
    
    if (!to || !message) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: to and message'
      });
    }
    
    const result = await smsService.sendSMS(to, message);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Send welcome SMS to new member
 */
app.post('/api/sms/welcome', async (req, res) => {
  try {
    const { phoneNumber, memberName, gymName } = req.body;
    
    if (!phoneNumber || !memberName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: phoneNumber and memberName'
      });
    }
    
    const result = await smsService.sendWelcomeSMS(phoneNumber, memberName, gymName);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Send payment reminder SMS
 */
app.post('/api/sms/payment-reminder', async (req, res) => {
  try {
    const { phoneNumber, memberName, amount, dueDate } = req.body;
    
    if (!phoneNumber || !memberName || !amount || !dueDate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: phoneNumber, memberName, amount, dueDate'
      });
    }
    
    const result = await smsService.sendPaymentReminder(phoneNumber, memberName, amount, dueDate);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Send membership expiry reminder SMS
 */
app.post('/api/sms/expiry-reminder', async (req, res) => {
  try {
    const { phoneNumber, memberName, expiryDate } = req.body;
    
    if (!phoneNumber || !memberName || !expiryDate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: phoneNumber, memberName, expiryDate'
      });
    }
    
    const result = await smsService.sendExpiryReminder(phoneNumber, memberName, expiryDate);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Send class booking confirmation SMS
 */
app.post('/api/sms/class-booking', async (req, res) => {
  try {
    const { phoneNumber, memberName, className, dateTime } = req.body;
    
    if (!phoneNumber || !memberName || !className || !dateTime) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: phoneNumber, memberName, className, dateTime'
      });
    }
    
    const result = await smsService.sendClassBookingConfirmation(phoneNumber, memberName, className, dateTime);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('API Error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: error.message
  });
});

// Start server with Socket.IO
server.listen(PORT, async () => {
  console.log(`ðŸš€ ETimeTrack Bridge API running on port ${PORT}`);
  console.log(`ðŸ“Š Health check: http://localhost:${PORT}/health`);
  console.log(`ðŸ”— Test connection: http://localhost:${PORT}/api/test-connection`);
  console.log(`ðŸ“¡ WebSocket endpoint: ws://localhost:${PORT}`);
  console.log(`ðŸ“¥ Webhook endpoint: http://localhost:${PORT}/api/webhook/fingerprint`);
  
  // Initialize Firebase and start monitoring (only if ETimeTrack is available)
  if (bridge) {
    try {
      await bridge.initializeFirebase();
      await bridge.startRealTimeMonitoring();
      console.log('âœ… ETimeTrack monitoring started automatically');
    } catch (error) {
      console.error('âš ï¸ Failed to start monitoring:', error.message);
      console.log('ðŸ’¡ Use POST /api/start-monitoring to start manually');
    }
  } else {
    console.log('âœ… SMS Server ready (ETimeTrack integration not available)');
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nâ¹ï¸ Shutting down gracefully...');
  if (bridge) {
    bridge.stopSync();
  }
  server.close(() => {
    console.log('âœ… Server closed');
    process.exit(0);
  });
});

module.exports = app;