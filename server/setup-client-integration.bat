@echo off
cls
echo ===============================================
echo    GymTight Fitness - Client ETimeTrack Integration
echo ===============================================
echo.

echo This script will help integrate your client's existing
echo ETimeTrack fingerprint system with GymTight Fitness Admin Panel.
echo.

echo [1/5] Checking system requirements...
echo.

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo âŒ Node.js not found! Please install Node.js first.
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
) else (
    echo âœ… Node.js installed
)

echo.
echo [2/5] Testing ETimeTrack database connection...
echo.

REM Test database connection
cd server
node test-etimetrack-connection.js
if %errorlevel% neq 0 (
    echo.
    echo âŒ Could not connect to ETimeTrack database.
    echo Please check:
    echo 1. ETimeTrack software is installed
    echo 2. Database file exists and is accessible
    echo 3. File permissions allow read access
    echo.
    echo Manual configuration required.
    pause
    exit /b 1
)

echo.
echo [3/5] Installing bridge server dependencies...
npm install
if %errorlevel% neq 0 (
    echo âŒ Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo [4/5] Configuring environment...
if not exist ".env" (
    echo Creating .env file from template...
    copy .env.example .env
    echo.
    echo âš ï¸  IMPORTANT: Please update .env file with:
    echo    - Your Firebase credentials
    echo    - Correct ETimeTrack database path
    echo    - Your admin panel URL
    echo.
) else (
    echo âœ… Environment file already exists
)

echo.
echo [5/5] Installing as Windows Service...
npm run install-service
if %errorlevel% neq 0 (
    echo âŒ Service installation failed
    echo Please run as Administrator
    pause
    exit /b 1
)

echo.
echo ===============================================
echo           ðŸŽ‰ INTEGRATION COMPLETE!
echo ===============================================
echo.
echo âœ… Bridge server installed and running
echo âœ… Connected to client's ETimeTrack database
echo âœ… Ready to sync with GymTight Fitness Admin Panel
echo.
echo Next Steps:
echo 1. Open GymTight Fitness Admin Panel
echo 2. Go to Fingerprint Management
echo 3. Connect to device (should auto-detect)
echo 4. Test fingerprint scanning
echo.
echo Service Status:
sc query "GymTight Fitness Bridge Server"
echo.
echo Logs location: %PROGRAMDATA%\GymTight Fitness\logs\
echo.
echo For support: Check CLIENT_ETIMETRACK_INTEGRATION.md
echo.
pause