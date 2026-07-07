# Handiwave Status and Handoff Summary

## What has been done

1. **Capacitor mobile wrapper added**
   - Added `capacitor.config.json`
   - Added `ios/` and `android/` native platform directories
   - Wired the Capacitor project to the web app

2. **Mobile Paystack checkout flow**
   - Added `src/mobile/capacitor.js`
   - Updated `src/pages/Home.jsx`
   - Updated `src/pages/Bookings.jsx`
   - Added mobile-friendly `openUrl(...)` checkout fallback

3. **Deep-link callback handling**
   - Added custom URI scheme support:
     - `android/app/src/main/AndroidManifest.xml`
     - `ios/App/App/Info.plist`
   - Added `appUrlOpen` listener to route:
     - `handiwave://payment/callback?reference=...`
     - into SPA route `/payment/callback`

4. **Payment backend flow updated**
   - Updated `src/services/paymentService.js`
   - Updated `supabase/functions/initialize-payment/index.ts`
   - Supports optional `callback_url`, validates callback URL, and uses mobile callback when available

5. **App Links / Universal Links scaffolding**
   - Added Android HTTPS intent-filter example in `AndroidManifest.xml`
   - Added `ios/App/App/Entitlements.plist`
   - Added `well-known/assetlinks.json.template`
   - Added `well-known/apple-app-site-association.template.json`
   - Added generator `scripts/generate-well-known.cjs`

6. **Local IPA build automation**
   - Added `scripts/build-ipa.sh`
   - Added `scripts/exportOptions.plist.template`
   - Added README instructions for Ad-Hoc IPA build and AirDrop

7. **Validation**
   - `npm test -- --run` passed
   - Verified the build script can run to the Xcode requirement point
   - Installed missing Capacitor packages required for native helpers

## What is already available

### Code

- `src/mobile/capacitor.js`
- `src/pages/Home.jsx`
- `src/pages/Bookings.jsx`
- `src/services/paymentService.js`
- `supabase/functions/initialize-payment/index.ts`
- `android/app/src/main/AndroidManifest.xml`
- `ios/App/App/Info.plist`
- `ios/App/App/Entitlements.plist`

### Helpers and templates

- `scripts/build-ipa.sh`
- `scripts/exportOptions.plist.template`
- `scripts/generate-well-known.cjs`
- `well-known/assetlinks.json.template`
- `well-known/apple-app-site-association.template.json`

### Documentation

`README.md` includes:

- Mobile app / Capacitor setup
- Paystack callback behavior
- App Links / Universal Links instructions
- Local IPA build guide

## Current status

### Done

- Mobile wrapper ready
- Paystack native checkout ready
- Deep-link callback handling ready
- App Links / Universal Links scaffolding ready
- Local IPA build automation ready
- Tests run successfully

### Still pending

- Upload `assetlinks.json` and `apple-app-site-association` to the production HTTPS domain
- Real device testing for Paystack sandbox
- Actual IPA build and install validation, which needs Apple signing assets and provisioning profile
- Final production Paystack config docs / secrets setup

## What a new developer should do first

1. Install dependencies:

   ```bash
   npm install
   ```

2. Build the web app:

   ```bash
   npm run build
   ```

3. Sync Capacitor native projects:

   ```bash
   npx cap sync
   ```

4. Run tests:

   ```bash
   npm test -- --run
   ```

5. Inspect `README.md` for mobile setup details.

6. For production links, generate the well-known files:

   ```bash
   npm run generate:well-known -- --domain=your-domain.com --sha256=YOUR_SHA256 --team=YOUR_TEAM_ID
   ```

   Upload them to:

   - `https://your-domain.com/.well-known/assetlinks.json`
   - `https://your-domain.com/.well-known/apple-app-site-association`

7. For IPA AirDrop:

   ```bash
   cp scripts/exportOptions.plist.template scripts/exportOptions.plist
   chmod +x scripts/build-ipa.sh
   TEAM_ID=YOUR_TEAM_ID bash scripts/build-ipa.sh
   ```

   Before running the build, fill `scripts/exportOptions.plist` with the correct Apple Team ID and provisioning profile values.

## Recommended next step

Validate the mobile payment flow on real devices with Paystack sandbox credentials. After that, build and install a signed IPA using real Apple signing assets, then publish the well-known files to production and verify App Links / Universal Links.
