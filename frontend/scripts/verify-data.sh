#!/usr/bin/env bash
# Fail the build if any component or lib file uses Math.random (fabricated data).
# Visual-randomness allowlist: TensorCloud (point jitter), pointcloud (layout).
set -uo pipefail

DIRS="components lib app"
ALLOWLIST="TensorCloud.tsx|pointcloud.ts|app/docs/"
FOUND=false

for dir in $DIRS; do
  if [ ! -d "$dir" ]; then continue; fi
  RESULTS=$(grep -rn '\bMath\.random\b' --include='*.tsx' --include='*.ts' "$dir" 2>/dev/null || true)
  # Filter out allowlisted files
  RESULTS=$(echo "$RESULTS" | grep -v -E "$ALLOWLIST" || true)
  if [ -n "$RESULTS" ]; then
    echo "FAIL: Math.random found in $dir/"
    echo "$RESULTS"
    FOUND=true
  fi
done

if [ "$FOUND" = true ]; then
  echo ""
  echo "Every number in this product must come from real model data."
  echo "See docs/verification.md for the data policy."
  exit 1
fi

echo "OK: no Math.random in application code"
