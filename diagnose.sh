#!/bin/bash

echo "=== LLWebsite-7318 Diagnostic ==="
echo ""
echo "1. Current Directory:"
pwd
echo ""

echo "2. Git Branch:"
git branch | grep '*'
echo ""

echo "3. Latest Commits:"
git log --oneline -5
echo ""

echo "4. Git Status:"
git status --short
echo ""

echo "5. Zero Point Zero - Last 15 Lines:"
tail -15 src/web/pages/originals/zero-point-zero.tsx
echo ""

echo "6. Luiz Laffey Collection - Last 15 Lines:"
tail -15 src/web/pages/originals/luiz-laffeys-collection.tsx
echo ""

echo "7. Running Node Processes:"
ps aux | grep -E "(node|npm|vite)" | grep -v grep
echo ""

echo "=== END DIAGNOSTIC ==="
