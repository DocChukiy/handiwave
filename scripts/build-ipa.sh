#!/usr/bin/env bash
set -euo pipefail

# build-ipa.sh
# Usage: fill in the variables below or pass as env vars.
# Requirements:
# - macOS with Xcode installed
# - Xcode command line tools
# - Your Apple signing certificate imported into the login keychain
# - Your provisioning profile installed under ~/Library/MobileDevice/Provisioning\ Profiles/

APP_IDENTIFIER="com.handiwave.app"
SCHEME="App"
CONFIGURATION="Release"
TEAM_ID="${TEAM_ID:-YOUR_APPLE_TEAM_ID}"
ARCHIVE_PATH="$(pwd)/ios/App.xcarchive"
IPA_OUTPUT="$(pwd)/dist/handiwave.ipa"
EXPORT_OPTIONS_PLIST="$(pwd)/scripts/exportOptions.plist"

echo "Building Handiwave iOS app archive..."

npm run build
npx cap copy ios

pushd ios/App >/dev/null

echo "Archiving with xcodebuild..."
xcodebuild -scheme "$SCHEME" \
  -configuration $CONFIGURATION \
  -workspace App.xcworkspace \
  -archivePath "$ARCHIVE_PATH" \
  CLEAN=YES archive

echo "Exporting IPA using export options plist: $EXPORT_OPTIONS_PLIST"
xcodebuild -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportPath "$(pwd)/../../dist" \
  -exportOptionsPlist "$EXPORT_OPTIONS_PLIST"

popd >/dev/null

echo "IPA built at: $IPA_OUTPUT"
echo "You can AirDrop the IPA to a device that is listed in the provisioning profile."

exit 0
