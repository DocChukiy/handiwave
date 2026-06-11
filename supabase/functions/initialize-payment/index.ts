import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { handleCors, jsonResponse, methodNotAllowed } from "../_shared/cors.ts"
import { createSupabaseAdminClient, getAuthenticatedUser } from "../_shared/supabaseAdmin.ts"
import {
  createPaymentReference,
  initializePaystackTransaction,
  toKobo,
} from "../_shared/paystack.ts"

type InitializePaymentBody = {
  booking_id?: string
}

// Required function secrets:
// supabase secrets set PAYSTACK_SECRET_KEY=sk_test_xxx
// supabase secrets set PAYSTACK_CALLBACK_URL=https://your-app.com/payment/callback
// supabase secrets set SUPABASE_URL=https://your-project.supabase.co
// supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
serve(async (request) => {
  const corsResponse = handleCors(request)

  if (corsResponse) {
    return corsResponse
  }

  if (request.method !== "POST") {
    return methodNotAllowed()
  }

  try {
    const supabase = createSupabaseAdminClient()
    const user = await getAuthenticatedUser(request, supabase)
    const body = await request.json().catch(() => ({})) as InitializePaymentBody
    const bookingId = body.booking_id

    if (!bookingId) {
      return jsonResponse({ error: "booking_id is required." }, 400)
    }

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .maybeSingle()

    if (bookingError) {
      return jsonResponse({ error: bookingError.message }, 500)
    }

    if (!booking) {
      return jsonResponse({ error: "Booking not found." }, 404)
    }

    if (booking.customer_id !== user.id) {
      return jsonResponse({ error: "You can only pay for your own booking." }, 403)
    }

    if (["held_in_escrow", "released", "refunded"].includes(booking.payment_status)) {
      return jsonResponse({ error: `Booking payment is already ${booking.payment_status}.` }, 409)
    }

    const amount = Number(booking.final_price || booking.estimated_price || booking.escrow_amount || 0)

    if (!amount || amount <= 0) {
      return jsonResponse({ error: "Booking does not have a valid payable amount." }, 400)
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .eq("id", user.id)
      .maybeSingle()

    if (profileError) {
      return jsonResponse({ error: profileError.message }, 500)
    }

    const email = profile?.email || user.email

    if (!email) {
      return jsonResponse({ error: "Customer email is required before payment can start." }, 400)
    }

    const reference = createPaymentReference(booking.id)
    const amountKobo = toKobo(amount)
    const callbackUrl = Deno.env.get("PAYSTACK_CALLBACK_URL")
    const paystackPayload = await initializePaystackTransaction({
      amount: amountKobo,
      callback_url: callbackUrl || undefined,
      currency: "NGN",
      email,
      metadata: {
        artisan_id: booking.artisan_id,
        booking_id: booking.id,
        customer_id: booking.customer_id,
        source: "handiwave",
      },
      reference,
    })

    const paystackData = paystackPayload.data || {}
    const { data: payment, error: paymentError } = await supabase
      .from("paystack_payment_transactions")
      .insert({
        access_code: paystackData.access_code || null,
        amount,
        amount_kobo: amountKobo,
        authorization_url: paystackData.authorization_url || null,
        booking_id: booking.id,
        currency: "NGN",
        customer_id: booking.customer_id,
        metadata: {
          artisan_id: booking.artisan_id,
          booking_id: booking.id,
          customer_id: booking.customer_id,
        },
        provider_payload: paystackPayload,
        provider_reference: reference,
        status: "pending",
      })
      .select("*")
      .single()

    if (paymentError) {
      return jsonResponse({ error: paymentError.message }, 500)
    }

    const { error: bookingUpdateError } = await supabase
      .from("bookings")
      .update({
        paystack_payment_transaction_id: payment.id,
        payment_initialized_at: new Date().toISOString(),
        payment_provider: "paystack",
        payment_reference: reference,
        payment_status: "unpaid",
      })
      .eq("id", booking.id)

    if (bookingUpdateError) {
      return jsonResponse({ error: bookingUpdateError.message }, 500)
    }

    return jsonResponse({
      access_code: paystackData.access_code,
      authorization_url: paystackData.authorization_url,
      payment_id: payment.id,
      reference,
    })
  } catch (error) {
    return jsonResponse({ error: error.message || "Unable to initialize payment." }, 500)
  }
})
