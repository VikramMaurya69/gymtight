#!/bin/bash

echo "=================================================="
echo "      GymTight Fitness Bridge Server - Build Executable"
echo "=================================================="
echo

echo "[1/4] Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "âŒ Failed to install dependencies"
    exit 1
fi
echo "âœ… Dependencies installed successfully"
echo

echo "[2/4] Installing pkg globally for building executables..."
npm install -g pkg
if [ $? -ne 0 ]; then
    echo "âŒ Failed to install pkg globally"
    exit 1
fi
echo "âœ… PKG installed successfully"
echo

echo "[3/4] Creating dist directory..."
mkdir -p dist
echo "âœ… Dist directory ready"
echo

echo "[4/4] Building executables..."
echo "Building Windows executable..."
pkg . --targets node18-win-x64 --out-path dist
if [ $? -ne 0 ]; then
    echo "âŒ Failed to build Windows executable"
    exit 1
fi

echo "Building macOS executable..."
pkg . --targets node18-macos-x64 --out-path dist
if [ $? -ne 0 ]; then
    echo "âŒ Failed to build macOS executable"
    exit 1
fi

echo "Building Linux executable..."
pkg . --targets node18-linux-x64 --out-path dist
if [ $? -ne 0 ]; then
    echo "âŒ Failed to build Linux executable"
    exit 1
fi

echo
echo "=================================================="
echo "        ðŸŽ‰ BUILD COMPLETED SUCCESSFULLY!"
echo "=================================================="
echo
echo "âœ… Executables created:"
ls -la dist/
echo
echo "ðŸ“‹ Files created:"
echo "   - dist/etimetrack-bridge-win.exe   (Windows)"
echo "   - dist/etimetrack-bridge-macos     (macOS)"
echo "   - dist/etimetrack-bridge-linux     (Linux)"
echo
echo "ðŸš€ Ready for deployment on any platform!"
echo