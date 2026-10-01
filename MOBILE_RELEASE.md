# Handiwave Mobile Release Setup

The Android and iOS projects already use the production app identifier `com.handiwave.app`.

## Accounts that the owner must create

These steps require the business owner's identity, payment method, legal agreements, and two-factor authentication. They cannot safely be completed by an automated agent.

1. Create a Google Play Console developer account at <https://play.google.com/console/signup>. Google currently charges a one-time US$25 registration fee.
2. Enrol in the Apple Developer Program at <https://developer.apple.com/programs/enroll/>. Apple currently charges US$99 per membership year.
3. Install the full Xcode application from the Mac App Store and sign in with the enrolled Apple ID.

Choose an organization account if Handiwave is a registered company and the store should display the company name. Both stores require a D-U-N-S number for organization enrollment. Otherwise, an individual account displays the account owner's legal name.

## Android signing

Release signing reads `android/keystore.properties`, which is intentionally ignored by Git. It may also read these environment variables in CI:

- `HANDIWAVE_ANDROID_KEYSTORE`
- `HANDIWAVE_ANDROID_STORE_PASSWORD`
- `HANDIWAVE_ANDROID_KEY_ALIAS`
- `HANDIWAVE_ANDROID_KEY_PASSWORD`

Back up the upload keystore and its password in a secure password manager. Do not commit or send either one in chat.

Build the Play Store bundle from the `android` directory:

```sh
./gradlew bundleRelease
```

The signed bundle is created at `android/app/build/outputs/bundle/release/app-release.aab`.

## iOS signing

Open the iOS project with `npm run mobile:ios`, select the Handiwave development team under Signing & Capabilities, then archive and upload the app through Xcode. Apple creates and manages the required signing assets after the account is enrolled.

## Website-to-app links

After the store accounts exist, collect:

- The Google Play app-signing certificate SHA-256 fingerprint.
- The Apple Developer Team ID.

Generate the production association files with:

```sh
npm run generate:well-known -- --domain=handiwave.com.ng --sha256=ANDROID_SHA256 --team=APPLE_TEAM_ID
```

This writes both files into `public/.well-known/` so Vercel publishes them at the required URLs.

## Release checklist

1. Run `npm run mobile:sync`.
2. Build and upload the Android App Bundle.
3. Archive and upload the iOS app.
4. Complete store listing, privacy, content-rating, and testing forms.
5. Publish first to closed testing or TestFlight.
6. Verify payment callbacks and app links on physical devices.
