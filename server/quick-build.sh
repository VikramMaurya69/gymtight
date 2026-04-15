#!/bin/bash

echo "ðŸš€ GymTight Fitness Bridge Server - Quick Build"
echo "========================================"
echo

# Check if we're on macOS and need to install Node.js
if ! command -v node &> /dev/null; then
    echo "ðŸ“‹ Node.js not found. Please install Node.js first:"
    echo "   Download from: https://nodejs.org/"
    echo "   Or use Homebrew: brew install node"
    echo
    exit 1
fi

# Navigate to server directory
cd "$(dirname "$0")"

echo "ðŸ“¦ Installing dependencies..."
npm install

echo "ðŸ“¦ Installing pkg for building executables..."
npm install -g pkg

echo "ðŸ—ï¸ Building Windows executable..."
npx pkg . --targets node18-win-x64 --out-path dist

echo
echo "âœ… Build completed!"
echo "ðŸ“ Executable location: dist/etimetrack-bridge.exe"
echo "ðŸ“Š File size:"
ls -lh dist/etimetrack-bridge.exe 2>/dev/null || ls -lh dist/

echo
echo "ðŸš€ Ready to deploy!"
echo "Next steps:"
echo "1. Copy dist/etimetrack-bridge.exe to target PC"
echo "2. Configure environment variables"
echo "3. Run as Administrator for service installation"