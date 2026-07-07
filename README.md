# Handiwave

Handiwave is a React + Vite marketplace app for booking artisans, managing quotes, protecting payments with Paystack escrow, and running the same web experience inside Capacitor iOS and Android wrappers.

## Quick Start

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a local environment file:

   ```bash
   cp .env.example .env
   ```

3. Fill `.env` with your Supabase project values:

   ```bash
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Start the web app:

   ```bash
   npm run dev
   ```

5. Before handing off changes, run:

   ```bash
   npm test -- --run
   npm run build
   ```

## Useful Commands

| Task | Command |
| --- | --- |
| Start local web app | `npm run dev` |
| Run tests once | `npm test -- --run` |
| Run tests in watch mode | `npm run test:watch` |
| Build production web assets | `npm run build` |
| Preview production build | `npm run preview` |
| Sync web build to native apps | `npx cap sync` |
| Open iOS project | `npx cap open ios` |
| Open Android project | `npx cap open android` |
| Generate App Link files | `npm run generate:well-known -- --domain=your-domain.com --sha256=YOUR_SHA256 --team=YOUR_TEAM_ID` |

## App Structure

- `src/pages/` contains route-level screens such as home, bookings, wallet, messages, and payment callback.
- `src/services/` contains Supabase-facing app services.
- `src/mobile/capacitor.js` contains native browser and deep-link helpers.
- `supabase/functions/` contains Paystack edge functions.
- `supabase/*.sql` contains schema and migration helpers.
- `android/` and `ios/` contain generated Capacitor native projects.
- `well-known/` contains App Links / Universal Links templates and generated files.
- `scripts/` contains mobile build and well-known file helpers.

## Required Supabase Setup

1. Create or open a Supabase project.
2. Apply the database schema and migrations from `supabase/`.
3. Seed default services if needed:

   ```bash
   supabase db execute --file supabase/seed_services.sql
   ```

4. Deploy edge functions:

   ```bash
   supabase functions deploy initialize-payment
   supabase functions deploy verify-payment
   supabase functions deploy paystack-webhook
   ```

5. Set function secrets:

   ```bash
   supabase secrets set PAYSTACK_SECRET_KEY=sk_test_xxx
   supabase secrets set PAYSTACK_CALLBACK_URL=https://your-domain.com/payment/callback
   supabase secrets set SUPABASE_URL=https://your-project.supabase.co
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

Use `sk_test_...` while testing. Switch to `sk_live_...` only after Paystack live mode and production callback URLs are ready.

## Paystack Payment Flow

The payment flow starts from accepted booking quotes.

1. Customer accepts a quote.
2. Customer taps **Pay with Paystack**.
3. The app calls `initialize-payment`.
4. Paystack opens in the browser.
5. Paystack returns to `/payment/callback`.
6. `src/pages/PaymentCallback.jsx` verifies the payment through `verify-payment`.
7. Successful payments are marked as protected escrow.

For web, Paystack should use:

```text
https://your-domain.com/payment/callback
```

For native Capacitor builds, the app sends:

```text
handiwave://payment/callback
```

The deep-link listener in `src/mobile/capacitor.js` converts native callbacks such as:

```text
handiwave://payment/callback?reference=PAYSTACK_REFERENCE
```

into the SPA route:

```text
/payment/callback?reference=PAYSTACK_REFERENCE
```

## Mobile App Setup

Handiwave includes Capacitor wrappers for iOS and Android.

1. Build the web app:

   ```bash
   npm run build
   ```

2. Sync native projects:

   ```bash
   npx cap sync
   ```

3. Open a native project:

   ```bash
   npx cap open ios
   npx cap open android
   ```

4. Run on a simulator or real device from Xcode / Android Studio.

Native deep-link registrations live in:

- `android/app/src/main/AndroidManifest.xml`
- `ios/App/App/Info.plist`

## App Links and Universal Links

Custom schemes are useful for testing, but production mobile links should use Android App Links and iOS Universal Links.

1. Generate the well-known files:

   ```bash
   npm run generate:well-known -- --domain=your-domain.com --sha256=YOUR_SHA256 --team=YOUR_TEAM_ID
   ```

2. Upload the generated files to your production HTTPS domain:

   ```text
   https://your-domain.com/.well-known/assetlinks.json
   https://your-domain.com/.well-known/apple-app-site-association
   ```

3. Update native placeholders:

   - Replace `your-domain.com` in `android/app/src/main/AndroidManifest.xml`
   - Replace the Associated Domains placeholder in `ios/App/App/Entitlements.plist`

4. Rebuild and test on real devices by tapping an HTTPS payment callback link.

## Building an iOS IPA for AirDrop

Use this when you need an Ad-Hoc signed `.ipa` for real device testing.

Prerequisites:

- Full Xcode installed, not only command line tools.
- Apple Developer account.
- Signing certificate installed in the macOS login keychain.
- Ad-Hoc provisioning profile installed and containing the target device UDIDs.

Steps:

1. Create export options:

   ```bash
   cp scripts/exportOptions.plist.template scripts/exportOptions.plist
   ```

2. Fill `scripts/exportOptions.plist` with the Apple Team ID and provisioning profile name.

3. Run the build:

   ```bash
   chmod +x scripts/build-ipa.sh
   TEAM_ID=YOUR_TEAM_ID bash scripts/build-ipa.sh
   ```

4. Find the IPA at:

   ```text
   dist/handiwave.ipa
   ```

## Production Checklist

- Confirm `.env` has the production Supabase URL and anon key.
- Confirm Supabase function secrets are set for production.
- Confirm Paystack uses the correct live secret key.
- Deploy `initialize-payment`, `verify-payment`, and `paystack-webhook`.
- Upload `assetlinks.json` and `apple-app-site-association`.
- Rebuild and sync Capacitor native projects.
- Test Paystack sandbox on real iOS and Android devices.
- Test signed IPA install with a real provisioning profile.
- Test the complete flow: quote accepted, checkout opened, callback received, escrow updated.

## Handoff Notes

See `HANDOFF.md` for the current mobile/payment handoff summary, pending production tasks, and first steps for a new developer.
