#!/bin/bash

echo "=== Fixing Lock Screen Issue ==="
echo ""

# Step 1: Kill all running dev servers
echo "1. Stopping all dev servers..."
pkill -f "vite" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true
sleep 2
echo "✓ Dev servers stopped"
echo ""

# Step 2: Clean build cache
echo "2. Cleaning build cache..."
rm -rf dist/ .vite/ node_modules/.vite/
echo "✓ Cache cleaned"
echo ""

# Step 3: Rebuild
echo "3. Building fresh..."
npm run build
echo "✓ Build complete"
echo ""

echo "=== Fix Complete ==="
echo ""
echo "Now run: npm run dev"
echo "Then open http://localhost:5173 and do HARD REFRESH:"
echo "  Mac: Cmd + Shift + R"
echo ""
