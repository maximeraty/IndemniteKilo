#!/bin/sh

set -e

if [ -n "$CI_WORKSPACE" ]; then
  cd "$CI_WORKSPACE"
else
  cd "$(dirname "$0")/.."
fi

echo "Installing JavaScript dependencies"
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

echo "Installing CocoaPods dependencies"
cd ios
pod install --repo-update
