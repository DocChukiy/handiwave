-- Remove old Paystack RPC overloads that make Supabase RPC calls ambiguous.
-- Keep:
--   public.apply_paystack_booking_payment_success(jsonb, text)
--   public.mark_paystack_booking_payment_failed(jsonb, text)

drop function if exists public.apply_paystack_booking_payment_success(text, jsonb);
drop function if exists public.mark_paystack_booking_payment_failed(text, jsonb);
