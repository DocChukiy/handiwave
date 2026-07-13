# Wallet Flow

This is the live Handiwave wallet flow after Paystack payment succeeds.

## 1. Payment Held In Escrow

When Paystack verification succeeds:

- Booking `payment_status` becomes `held_in_escrow`
- Customer wallet `escrow_balance` increases by the full paid amount
- Artisan wallet `escrow_balance` increases by the artisan payout amount
- Platform commission is recorded in `platform_commission_entries`
- Wallet history gets `escrow_hold` rows

## 2. Artisan Marks Job Complete

The artisan moves the booking to:

```text
artisan_completed
```

The customer is notified to confirm the work.

## 3. Customer Confirms Completion

When the customer confirms completion, the app calls:

```text
release_booking_escrow_for_customer
```

That RPC:

- Changes booking status to `customer_confirmed`
- Changes booking payment status to `released`
- Decreases customer escrow balance
- Decreases artisan escrow balance
- Increases artisan available wallet balance
- Adds an `escrow_release` wallet transaction
- Marks the commission entry as `released`

## 4. Artisan Requests Withdrawal

The artisan can request withdrawal from available wallet balance.

The app calls:

```text
request_wallet_withdrawal
```

That RPC:

- Decreases artisan available balance immediately
- Creates a pending wallet withdrawal request
- Creates a pending wallet transaction

## 5. Admin Approves Or Rejects

Admins can approve or reject withdrawal requests from the admin dashboard.

Approval:

- Marks withdrawal as `approved`
- Marks the wallet transaction as `successful`
- Records manual payout status

Rejection:

- Returns funds to the artisan available balance
- Marks withdrawal as `rejected`
- Marks the wallet transaction as `failed`

## Manual Test Checklist

1. Customer pays a booking.
2. Confirm booking shows `held_in_escrow`.
3. Open customer wallet and confirm protected escrow appears.
4. Open artisan wallet and confirm pending escrow appears.
5. Artisan marks the job complete.
6. Customer confirms completion.
7. Confirm booking payment status becomes `released`.
8. Confirm artisan available balance increases.
9. Artisan requests withdrawal.
10. Admin approves or rejects the withdrawal.
