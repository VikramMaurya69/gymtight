@echo off
cls
echo ===================================================
echo        GymTight Fitness Bridge Server - Build Executable
echo ===================================================
echo.

echo [1/4] Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo âŒ Failed to install dependencies
    pause
    exit /b 1
)
echo âœ… Dependencies installed successfully
echo.

echo [2/4] Installing pkg globally for building executables...
call npm install -g pkg
if %errorlevel% neq 0 (
    echo âŒ Failed to install pkg globally
    pause
    exit /b 1
)
echo âœ… PKG installed successfully
echo.

echo [3/4] Creating dist directory...
if not exist "dist" mkdir dist
echo âœ… Dist directory ready
echo.

echo [4/4] Building Windows executable...
call pkg . --targets node18-win-x64 --out-path dist
if %errorlevel% neq 0 (
    echo âŒ Failed to build executable
    pause
    exit /b 1
)
echo.

echo ===================================================
echo         ðŸŽ‰ BUILD COMPLETED SUCCESSFULLY!
echo ===================================================
echo.
echo âœ… Executable created: dist\etimetrack-bridge.exe
echo âœ… Size: 
dir dist\*.exe | find "etimetrack-bridge.exe"
echo.
echo ðŸ“‹ Next Steps:
echo 1. Copy dist\etimetrack-bridge.exe to target PC
echo 2. Copy firebase service account key file
echo 3. Set environment variables or use .env file
echo 4. Run executable as Administrator for Windows Service
echo.
echo ðŸš€ Ready for deployment!
echo.
pause