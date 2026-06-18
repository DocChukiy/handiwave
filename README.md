# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Mobile App Support

Handiwave now includes Capacitor wrappers for iOS and Android. Native checkout uses the Capacitor Browser plugin and a custom URI callback scheme so Paystack can return users to the app after payment.

- Mobile callback URI: `handiwave://payment/callback`
- Web callback URL: your hosted web app URL, for example `https://your-app.com/payment/callback`
- Mobile deep link listener is implemented in `src/mobile/capacitor.js`
- The SPA route for Paystack verification is `src/pages/PaymentCallback.jsx` and the route is `/payment/callback`

### Build and sync mobile assets

```bash
npm install
npm run build
npx cap sync
npx cap open ios
npx cap open android
```

### Paystack configuration

For web, keep `PAYSTACK_CALLBACK_URL` set to your hosted web callback.
For native Capacitor builds, the app passes `handiwave://payment/callback` during checkout when running in a mobile environment.

## App Links & Universal Links setup (production)

To support secure production deep linking (without relying on custom URI schemes), set up Android App Links and iOS Universal Links.

- Android (App Links):
	1. In `android/app/src/main/AndroidManifest.xml` add an `intent-filter` with `android:autoVerify="true"` for your HTTPS host and path prefix (example already added).
	2. Host a `assetlinks.json` at `https://your-domain.com/.well-known/assetlinks.json` containing your app's SHA256 fingerprint and package name. Example format:

```json
[
	{
		"relation": ["delegate_permission/common.handle_all_urls"],
		"target": {
			"namespace": "android_app",
			"package_name": "com.handiwave.app",
			"sha256_cert_fingerprints": ["YOUR_APP_SHA256_FINGERPRINT"]
		}
	}
]
```

- iOS (Universal Links):
	1. Add the Associated Domains capability in Xcode and include `applinks:your-domain.com` (a placeholder `Entitlements.plist` has been added at `ios/App/App/Entitlements.plist`).
	2. Host an `apple-app-site-association` file at the root of your HTTPS domain (or under `/.well-known/`) with contents like:

```json
{
	"applinks": {
		"apps": [],
		"details": [
			{
				"appID": "TEAMID.com.handiwave.app",
				"paths": ["/payment/callback", "/payments/*"]
			}
		]
	}
}
```

Notes:
- Replace `your-domain.com`, `TEAMID`, and `YOUR_APP_SHA256_FINGERPRINT` with values from your production build and developer account.
- After publishing the files and rebuilding the apps, test deep links by tapping HTTPS links pointing to your domain and verifying the OS opens the app without prompting.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
