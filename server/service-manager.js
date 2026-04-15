/**
 * Windows Service Wrapper for GymTight Fitness Bridge Server
 * This creates a Windows service that runs the bridge server automatically
 */

const Service = require('node-windows').Service;
const path = require('path');

// Create a new service object
const svc = new Service({
  name: 'GymTight Fitness Bridge Server',
  description: 'ETimeTrack Bridge Server for GymTight Fitness Gym Management',
  script: path.join(__dirname, 'api-server.js'),
  env: [
    {
      name: 'NODE_ENV',
      value: 'production'
    }
  ]
});

// Listen for the "install" event, which indicates the process is available as a service.
svc.on('install', () => {
  console.log('âœ… GymTight Fitness Bridge Server installed as Windows service');
  console.log('ðŸš€ Starting service...');
  svc.start();
});

svc.on('start', () => {
  console.log('âœ… GymTight Fitness Bridge Server service started successfully');
  console.log('ðŸ”„ Service will now start automatically when Windows boots');
});

svc.on('stop', () => {
  console.log('â¹ï¸ GymTight Fitness Bridge Server service stopped');
});

svc.on('uninstall', () => {
  console.log('âŒ GymTight Fitness Bridge Server service uninstalled');
});

svc.on('error', (err) => {
  console.error('âŒ Service error:', err);
});

// Check command line arguments
const command = process.argv[2];

switch (command) {
  case 'install':
    console.log('ðŸ“¦ Installing GymTight Fitness Bridge Server as Windows service...');
    svc.install();
    break;
    
  case 'uninstall':
    console.log('ðŸ—‘ï¸ Uninstalling GymTight Fitness Bridge Server service...');
    svc.uninstall();
    break;
    
  case 'start':
    console.log('ðŸš€ Starting GymTight Fitness Bridge Server service...');
    svc.start();
    break;
    
  case 'stop':
    console.log('â¹ï¸ Stopping GymTight Fitness Bridge Server service...');
    svc.stop();
    break;
    
  case 'restart':
    console.log('ðŸ”„ Restarting GymTight Fitness Bridge Server service...');
    svc.restart();
    break;
    
  default:
    console.log(`
ðŸŽ¯ GymTight Fitness Bridge Server Service Manager

Usage: node service-manager.js [command]

Commands:
  install    - Install as Windows service (runs automatically on boot)
  uninstall  - Remove Windows service
  start      - Start the service
  stop       - Stop the service  
  restart    - Restart the service

Examples:
  node service-manager.js install
  node service-manager.js start
  node service-manager.js stop
    `);
}

module.exports = svc;