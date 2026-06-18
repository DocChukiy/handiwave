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

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
