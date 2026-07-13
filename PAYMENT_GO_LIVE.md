# Payment Go-Live Guide

Use this checklist to make Handiwave payments real with Paystack and Supabase Edge Functions.

## Current Payment Flow

1. Customer accepts an artisan quote.
2. Customer taps **Pay with Paystack**.
3. The app calls `initialize-payment`.
4. Paystack opens checkout.
5. Paystack redirects to `/payment/callback`.
6. The app calls `verify-payment`.
7. Supabase applies escrow, commission, wallet transactions, and notifications.
8. Paystack webhooks backstop the same success/failure handling.

## Files Involved

- `src/services/paymentService.js`
- `src/pages/PaymentCallback.jsx`
- `src/mobile/capacitor.js`
- `supabase/functions/initialize-payment/index.ts`
- `supabase/functions/verify-payment/index.ts`
- `supabase/functions/paystack-webhook/index.ts`
- `supabase/functions/_shared/paystack.ts`
- `supabase/fix_paystack_escrow_commission_rpc.sql`

## 1. Run Local Preflight

```bash
npm run payment:preflight
```

Fix any missing local setup before continuing.

## 2. Apply The Payment RPC SQL

Run this SQL in the Supabase SQL Editor:

```text
supabase/fix_paystack_escrow_commission_rpc.sql
```

This creates or replaces:

- `public.ensure_wallet_for_profile_internal`
- `public.apply_paystack_booking_payment_success`
- `public.mark_paystack_booking_payment_failed`

Do this before testing real payments. Without these RPCs, verification and webhooks cannot safely apply escrow.

## 3. Set Supabase Function Secrets

Start with Paystack test mode:

```bash
supabase secrets set PAYSTACK_SECRET_KEY=sk_test_xxx
supabase secrets set PAYSTACK_CALLBACK_URL=https://your-domain.com/payment/callback
supabase secrets set SUPABASE_URL=https://your-project.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

For production live mode, replace `sk_test_xxx` with your Paystack live secret key:

```bash
supabase secrets set PAYSTACK_SECRET_KEY=sk_live_xxx
```

Never put the Paystack secret key in `.env`, Vercel public variables, or frontend code.

## 4. Deploy Edge Functions

```bash
supabase functions deploy initialize-payment
supabase functions deploy verify-payment
supabase functions deploy paystack-webhook
```

Your function URLs will look like:

```text
https://YOUR_PROJECT_REF.supabase.co/functions/v1/initialize-payment
https://YOUR_PROJECT_REF.supabase.co/functions/v1/verify-payment
https://YOUR_PROJECT_REF.supabase.co/functions/v1/paystack-webhook
```

## 5. Configure Paystack Dashboard

In Paystack, set the webhook URL to:

```text
https://YOUR_PROJECT_REF.supabase.co/functions/v1/paystack-webhook
```

The webhook function verifies the `x-paystack-signature` header with `PAYSTACK_SECRET_KEY`.

Set the callback/redirect URL to:

```text
https://your-domain.com/payment/callback
```

For Android native testing, the app can pass:

```text
handiwave://payment/callback
```

## 6. Configure Frontend Hosting

In Vercel or your hosting provider, set:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_PAYMENT_CALLBACK_URL=https://your-domain.com/payment/callback
```

Then redeploy the frontend.

## 7. Test In Paystack Sandbox

Use a small accepted quote.

1. Log in as a customer.
2. Create a booking.
3. Have the artisan send a quote.
4. Accept the quote.
5. Tap **Pay with Paystack**.
6. Complete sandbox checkout.
7. Confirm the app returns to `/payment/callback`.
8. Confirm the booking payment status becomes `held_in_escrow`.
9. Confirm wallet transactions are created.
10. Confirm customer and artisan notifications are created.

## 8. Switch To Live

Only switch after sandbox works end to end.

1. Replace `PAYSTACK_SECRET_KEY` with `sk_live_xxx`.
2. Confirm your Paystack business is live.
3. Confirm production callback URL is HTTPS.
4. Confirm webhook URL points to the production Supabase project.
5. Make one small live payment.
6. Check the booking, wallet, commission, webhook event, and notification records.

## Troubleshooting

### Paystack checkout does not open

- Check the browser console.
- Check `initialize-payment` logs in Supabase.
- Confirm the booking quote is accepted.
- Confirm the customer has an email.
- Confirm `PAYSTACK_SECRET_KEY` is set and starts with `sk_test_` or `sk_live_`.

### Callback opens but verification fails

- Confirm the URL contains `reference` or `trxref`.
- Check `verify-payment` logs.
- Confirm the RPC SQL has been applied.
- Confirm the payment reference exists in `paystack_payment_transactions`.

### Webhook fails

- Confirm the Paystack webhook URL is exact.
- Confirm the function secret matches the Paystack account mode.
- Check `paystack_webhook_events` for `failed` rows and error messages.

### Escrow/wallet does not update

- Re-run `supabase/fix_paystack_escrow_commission_rpc.sql`.
- Confirm the booking has a valid artisan.
- Confirm the artisan has a linked profile.
- Confirm the quote amount is greater than zero.
