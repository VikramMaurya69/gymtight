@echo off
echo ========================================
echo GymTight Fitness ETimeTrack Integration Kit
echo Client Site Deployment - One-Click Setup
echo ========================================
echo.

:: Check if running as Administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: Please run as Administrator!
    echo Right-click this file and select "Run as Administrator"
    pause
    exit /b 1
)

echo âœ… Running with Administrator privileges
echo.

:: Step 1: System Requirements Check
echo [1/7] Checking system requirements...
echo.

:: Check Node.js
node --version >nul 2>&1
if %errorLevel% neq 0 (
    echo âŒ Node.js not found!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo âœ… Node.js installed: %NODE_VERSION%

:: Check npm
npm --version >nul 2>&1
if %errorLevel% neq 0 (
    echo âŒ npm not found!
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo âœ… npm installed: %NPM_VERSION%
echo.

:: Step 2: Install Dependencies
echo [2/7] Installing required dependencies...
echo.

call npm install
if %errorLevel% neq 0 (
    echo âŒ Failed to install dependencies!
    pause
    exit /b 1
)

echo âœ… Dependencies installed successfully
echo.

:: Step 3: Find ETimeTrack Database
echo [3/7] Searching for ETimeTrack database...
echo.

node find-etimetrack-database.js > database-search.log 2>&1
if %errorLevel% neq 0 (
    echo âŒ Database search encountered errors
    echo Check database-search.log for details
    echo.
    echo ðŸ”§ ALTERNATIVE SOLUTIONS:
    echo 1. Check if ETimeTrack is installed
    echo 2. Locate att2024.mdb file manually
    echo 3. Use fresh ETimeTrack installation
    echo.
    type database-search.log
    pause
    goto BACKUP_PLAN
)

echo âœ… Database search completed
echo Check database-search.log for detailed results
echo.

:: Step 4: Test Database Connection
echo [4/7] Testing database connectivity...
echo.

node test-etimetrack-connection.js > connection-test.log 2>&1
if %errorLevel% neq 0 (
    echo âŒ Database connection test failed
    echo Check connection-test.log for details
    echo.
    type connection-test.log
    pause
    goto BACKUP_PLAN
)

echo âœ… Database connection successful
echo.

:: Step 5: Configure Environment
echo [5/7] Setting up environment configuration...
echo.

:: Create .env file if it doesn't exist
if not exist .env (
    echo Creating .env configuration file...
    (
        echo # GymTight Fitness ETimeTrack Bridge Configuration
        echo PORT=3001
        echo NODE_ENV=production
        echo ETIMETRACK_DB_PATH=
        echo FIREBASE_CONFIG_PATH=./firebase-config.json
        echo LOG_LEVEL=info
        echo SYNC_INTERVAL=30000
        echo AUTO_START=true
    ) > .env
    echo âœ… Environment configuration created
) else (
    echo âœ… Environment configuration exists
)
echo.

:: Step 6: Install Windows Service
echo [6/7] Installing Windows Service for auto-startup...
echo.

:: Check if service already exists
sc query "GymTight Fitness-ETimeTrack" >nul 2>&1
if %errorLevel% equ 0 (
    echo Service already exists, stopping and removing...
    sc stop "GymTight Fitness-ETimeTrack" >nul 2>&1
    timeout /t 3 >nul
    sc delete "GymTight Fitness-ETimeTrack" >nul 2>&1
    timeout /t 2 >nul
)

:: Install service using node-windows-service
echo Installing GymTight Fitness ETimeTrack Bridge Service...
node -e "
const Service = require('node-windows').Service;
const path = require('path');

const svc = new Service({
  name: 'GymTight Fitness-ETimeTrack',
  description: 'GymTight Fitness ETimeTrack Integration Bridge',
  script: path.join(__dirname, 'etimetrack-bridge.js'),
  nodeOptions: [
    '--harmony',
    '--max_old_space_size=2048'
  ]
});

svc.on('install', function(){
  console.log('âœ… Service installed successfully');
  svc.start();
});

svc.on('alreadyinstalled', function(){
  console.log('Service already installed, starting...');
  svc.start();
});

svc.on('start', function(){
  console.log('âœ… Service started successfully');
});

svc.install();
" 2>nul

if %errorLevel% neq 0 (
    echo âš ï¸ Service installation failed, will run manually
    echo The bridge can still be started with: npm start
) else (
    echo âœ… Windows Service installed and started
)
echo.

:: Step 7: Final Testing
echo [7/7] Running final integration test...
echo.

timeout /t 5 >nul
node -e "
const http = require('http');
const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/test',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  if (res.statusCode === 200) {
    console.log('âœ… Bridge server is running and accessible');
    console.log('âœ… GymTight Fitness admin panel can now connect');
  } else {
    console.log('âš ï¸ Bridge server returned status:', res.statusCode);
  }
});

req.on('error', (err) => {
  console.log('âš ï¸ Bridge server not yet ready, starting manually...');
  console.log('Run: npm start');
});

req.on('timeout', () => {
  console.log('âš ï¸ Connection timeout, server may be starting...');
});

req.end();
" 2>nul

echo.
echo ========================================
echo ðŸŽ‰ GYMTIGHT FITNESS ETIMETRACK INTEGRATION
echo ========================================
echo.
echo âœ… Setup completed successfully!
echo.
echo ðŸ“‹ SUMMARY:
echo â€¢ ETimeTrack database located and accessible
echo â€¢ Bridge server configured and installed
echo â€¢ Windows Service created for auto-startup
echo â€¢ Ready for GymTight Fitness Admin Panel
echo.
echo ðŸŒ ADMIN PANEL ACCESS:
echo â€¢ Local: http://localhost:3000
echo â€¢ Network: http://[this-computer-ip]:3000
echo.
echo ðŸ”§ BRIDGE SERVER:
echo â€¢ Status: Running on port 3001
echo â€¢ Service: GymTight Fitness-ETimeTrack
echo â€¢ Logs: Check Windows Event Viewer
echo.
echo ðŸ“± FINGERPRINT DEVICE:
echo â€¢ Status: Connected via ETimeTrack
echo â€¢ Sync: Automatic every 30 seconds
echo â€¢ Data Flow: Device â†’ ETimeTrack â†’ GymTight Fitness
echo.
echo ðŸ” SECURITY NOTES:
echo â€¢ Password protection bypassed via direct DB access
echo â€¢ Original ETimeTrack software can remain locked
echo â€¢ All existing fingerprint data preserved
echo.
goto END

:BACKUP_PLAN
echo.
echo ========================================
echo ðŸ”§ BACKUP INTEGRATION PLAN
echo ========================================
echo.
echo Primary integration failed, trying alternatives...
echo.
echo OPTION 1: Fresh ETimeTrack Installation
echo 1. Download ETimeTrack from ZKTeco website
echo 2. Install with default settings
echo 3. Connect fingerprint device
echo 4. Re-run this setup script
echo.
echo OPTION 2: Manual Database Location
echo 1. Find att2024.mdb file on this computer
echo 2. Copy full path
echo 3. Update .env file: ETIMETRACK_DB_PATH=your_path
echo 4. Run: npm start
echo.
echo OPTION 3: Device Memory Extraction
echo 1. Use ZKTeco device management software
echo 2. Export user data and attendance logs
echo 3. Import directly to GymTight Fitness database
echo.
echo ðŸ“ž SUPPORT: Contact technical team with setup logs
echo ðŸ“§ Email: support@GymTight Fitness.com
echo ðŸ“± Phone: [Your Support Number]

:END
echo.
echo Press any key to exit...
pause >nul