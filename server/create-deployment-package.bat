@echo off
cls
echo ===================================================
echo     GymTight Fitness Bridge Server - Create Deployment Package
echo ===================================================
echo.

echo [1/5] Building executable...
call build-exe.bat
if %errorlevel% neq 0 (
    echo âŒ Failed to build executable
    pause
    exit /b 1
)
echo.

echo [2/5] Creating deployment package directory...
if exist "deployment-package" rmdir /s /q deployment-package
mkdir deployment-package
mkdir deployment-package\config
mkdir deployment-package\logs
echo âœ… Package directories created
echo.

echo [3/5] Copying executable and configuration files...
copy dist\etimetrack-bridge.exe deployment-package\
copy .env.example deployment-package\config\.env
copy firebase-service-account.example.json deployment-package\config\ 2>nul
echo âœ… Files copied
echo.

echo [4/5] Creating installation script...
(
echo @echo off
echo echo Installing GymTight Fitness Bridge Server...
echo echo.
echo echo 1. Configure your Firebase credentials in config\.env
echo echo 2. Update ETimeTrack database path in config\.env
echo echo 3. Run etimetrack-bridge.exe as Administrator
echo echo.
echo echo For Windows Service installation:
echo echo etimetrack-bridge.exe --install-service
echo echo.
echo echo For manual start:
echo echo etimetrack-bridge.exe
echo echo.
echo pause
) > deployment-package\INSTALL.bat
echo âœ… Installation script created
echo.

echo [5/5] Creating README for deployment...
(
echo # GymTight Fitness Bridge Server - Deployment Package
echo.
echo ## Installation Instructions
echo.
echo 1. **Configure Environment Variables**
echo    - Edit `config\.env` with your Firebase credentials
echo    - Update ETimeTrack database path
echo    - Set your admin panel URL for CORS
echo.
echo 2. **Install as Windows Service ^(Recommended^)**
echo    ```
echo    etimetrack-bridge.exe --install-service
echo    net start "GymTight Fitness Bridge Server"
echo    ```
echo.
echo 3. **Manual Execution**
echo    ```
echo    etimetrack-bridge.exe
echo    ```
echo.
echo ## Configuration Files
echo - `config\.env` - Environment variables
echo - `config\firebase-service-account.json` - Firebase credentials
echo.
echo ## Logs Location
echo - Application logs will be created in `logs\` directory
echo - Windows Service logs in Event Viewer
echo.
echo ## Troubleshooting
echo 1. Ensure ETimeTrack software is installed
echo 2. Verify database file exists at configured path
echo 3. Check Windows Firewall for port 3001
echo 4. Run as Administrator for service installation
echo.
echo ## Support
echo Check main project documentation for detailed setup guide.
) > deployment-package\README.md
echo âœ… README created
echo.

echo ===================================================
echo         ðŸŽ‰ DEPLOYMENT PACKAGE READY!
echo ===================================================
echo.
echo ðŸ“¦ Package Contents:
dir deployment-package
echo.
echo ðŸ“‹ Package Location: deployment-package\
echo ðŸ“‹ Executable Size: 
dir deployment-package\*.exe | find "etimetrack-bridge.exe"
echo.
echo ðŸš€ Ready to deploy on target PC!
echo    1. Copy 'deployment-package' folder to target PC
echo    2. Configure config\.env file
echo    3. Run INSTALL.bat as Administrator
echo.
pause