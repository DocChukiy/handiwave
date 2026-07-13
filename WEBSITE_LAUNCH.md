# Website-First Launch

Handiwave should launch first as a responsive website/PWA, then scale to native Android and iOS after the marketplace flow is proven.

## Live MVP URL

```text
https://handiwave.vercel.app
```

## Why This Comes First

- Users can open it from any phone browser.
- Vercel deploys updates immediately.
- Paystack web checkout already works.
- Escrow, wallet, withdrawals, messaging, profiles, reels, and admin flows are live.
- Android/iOS apps can reuse the same React codebase later.

## PWA Support

The web app now includes:

- `public/manifest.webmanifest`
- `public/service-worker.js`
- `public/app-icon.svg`
- mobile web metadata in `index.html`
- an install prompt for supported Android/Chrome browsers

Android users can open the website in Chrome and install it to their home screen.

## Launch Checklist

1. Confirm Vercel production deploy is green.
2. Open `https://handiwave.vercel.app` on mobile Safari and mobile Chrome.
3. Test signup/login for customer, artisan, and admin.
4. Test profile creation and artisan onboarding.
5. Test reels and messaging.
6. Test Paystack live payment with a small booking.
7. Confirm booking enters `held_in_escrow`.
8. Mark job complete as artisan.
9. Confirm completion as customer.
10. Confirm artisan wallet balance increases.
11. Request withdrawal as artisan.
12. Approve/reject withdrawal as admin.
13. On Android Chrome, confirm the install prompt appears or use browser menu > Add to Home screen.

## Android Later

Keep the Capacitor Android project, but treat it as phase two. Once the website has real users and the core flow is stable, package the Android app with the same live Supabase and Paystack setup.
