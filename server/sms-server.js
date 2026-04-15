/**
 * SMS Server for GymTight Fitness Admin Panel
 * Simplified version that works on any platform (macOS, Windows, Linux)
 */

const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const { config } = require('dotenv');
const smsService = require('./smsService');
const path = require('path');

// Load environment variables
config({ path: path.join(__dirname, '.env') });

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log(`ðŸ“± Client connected: ${socket.id}`);
  
  socket.emit('connected', {
    message: 'Connected to SMS Server',
    timestamp: new Date().toISOString()
  });
  
  socket.on('disconnect', () => {
    console.log(`ðŸ“± Client disconnected: ${socket.id}`);
  });
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'GymTight Fitness SMS Server',
    timestamp: new Date().toISOString()
  });
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

// Start server
server.listen(PORT, () => {
  console.log(`ðŸš€ GymTight Fitness SMS Server running on port ${PORT}`);
  console.log(`ðŸ“Š Health check: http://localhost:${PORT}/health`);
  console.log(`ðŸ“¡ WebSocket endpoint: ws://localhost:${PORT}`);
  console.log(`ðŸ“¨ SMS endpoints ready`);
  console.log('');
  console.log('Available SMS endpoints:');
  console.log(`  POST http://localhost:${PORT}/api/sms/send`);
  console.log(`  POST http://localhost:${PORT}/api/sms/welcome`);
  console.log(`  POST http://localhost:${PORT}/api/sms/payment-reminder`);
  console.log(`  POST http://localhost:${PORT}/api/sms/expiry-reminder`);
  console.log(`  POST http://localhost:${PORT}/api/sms/class-booking`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nâ¹ï¸ Shutting down gracefully...');
  server.close(() => {
    console.log('âœ… Server closed');
    process.exit(0);
  });
});

module.exports = app;
