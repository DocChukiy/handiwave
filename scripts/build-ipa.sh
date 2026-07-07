#!/usr/bin/env bash
set -euo pipefail

# build-ipa.sh
# Usage:
#   DOMAIN=your-domain.com TEAM_ID=YOURTEAMID bash scripts/build-ipa.sh
# Requirements:
# - macOS with Xcode installed (not just command line tools)
# - Your Apple signing certificate imported into the login keychain
# - Your provisioning profile installed under ~/Library/MobileDevice/Provisioning\ Profiles/

APP_IDENTIFIER="com.handiwave.app"
SCHEME="App"
CONFIGURATION="Release"
TEAM_ID="${TEAM_ID:-YOUR_APPLE_TEAM_ID}"
ARCHIVE_PATH="$(pwd)/ios/App.xcarchive"
IPA_OUTPUT="$(pwd)/dist/handiwave.ipa"
EXPORT_OPTIONS_PLIST="$(pwd)/scripts/exportOptions.plist"

function fail() {
  echo "Error: $1" >&2
  exit 1
}

if [[ ${1:-} == "--help" || ${1:-} == "-h" ]]; then
  cat <<EOF
Usage: TEAM_ID=YOURTEAMID bash scripts/build-ipa.sh

This script builds the Handiwave iOS app archive and exports an Ad-Hoc signed IPA.

Required:
 - Install Xcode.app and open it once to accept the license.
 - Install your provisioning profile into ~/Library/MobileDevice/Provisioning Profiles/
 - Create scripts/exportOptions.plist from scripts/exportOptions.plist.template.
 - Ensure the provisioning profile name is present in scripts/exportOptions.plist.

Optional environment vars:
 - TEAM_ID: Apple team ID for export options
 - SCHEME: Xcode scheme name (default: App)
 - CONFIGURATION: build configuration (default: Release)

EOF
  exit 0
fi

command -v xcodebuild >/dev/null 2>&1 || fail "xcodebuild is not installed. Install Xcode.app."

if ! xcodebuild -version | grep -q "Xcode"; then
  fail "xcodebuild is present but appears to be the command line tools version. Install full Xcode.app."
fi

if [[ ! -f "$EXPORT_OPTIONS_PLIST" ]]; then
  fail "Missing export options plist. Copy scripts/exportOptions.plist.template to scripts/exportOptions.plist and update it."
fi

mkdir -p dist

echo "Building web assets..."
npm run build

echo "Copying web assets into Capacitor iOS project..."
npx cap copy ios

pushd ios/App >/dev/null

echo "Archiving iOS app with xcodebuild..."
xcodebuild -scheme "$SCHEME" \
  -configuration "$CONFIGURATION" \
  -workspace App.xcworkspace \
  -archivePath "$ARCHIVE_PATH" \
  CLEAN=YES archive

echo "Exporting IPA using $EXPORT_OPTIONS_PLIST..."
xcodebuild -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportPath "$(pwd)/../../dist" \
  -exportOptionsPlist "$EXPORT_OPTIONS_PLIST"
popd >/dev/null

echo "IPA built at: $IPA_OUTPUT"
echo "You can AirDrop the IPA to a device listed in the provisioning profile."
