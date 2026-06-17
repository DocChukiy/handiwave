import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { handleCors, jsonResponse } from "../_shared/cors.ts"
import { createSupabaseAdminClient, getAuthenticatedUser } from "../_shared/supabaseAdmin.ts"
import {
  createPaymentReference,
  initializePaystackTransaction,
  toKobo,
} from "../_shared/paystack.ts"

type InitializePaymentBody = {
  booking_id?: string
}

function getErrorMessage(error: unknown, fallback = "Unable to initialize payment.") {
  if (error instanceof Error && error.message) {
    return error.message
  }

  if (typeof error === "object" && error && "message" in error) {
    return String((error as { message?: unknown }).message || fallback)
  }

  return fallback
}

function errorResponse(debugCode: string, message: string, status = 500) {
  console.error(debugCode, message)
  return jsonResponse({ debugCode, error: message }, status)
}

// Required function secrets:
// supabase secrets set PAYSTACK_SECRET_KEY=sk_test_xxx
// supabase secrets set PAYSTACK_CALLBACK_URL=https://your-app.com/payment/callback
// supabase secrets set SUPABASE_URL=https://your-project.supabase.co
// supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
serve(async (request) => {
  try {
    console.log("INIT_START")

    const corsResponse = handleCors(request)

    if (corsResponse) {
      return corsResponse
    }

    if (request.method !== "POST") {
      return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed.", 405)
    }

    const supabase = createSupabaseAdminClient()
    const user = await getAuthenticatedUser(request, supabase)
    console.log("AUTH_OK", { userId: user.id })

    const body = await request.json().catch(() => ({})) as InitializePaymentBody
    const bookingId = body.booking_id

    if (!bookingId) {
      return errorResponse("MISSING_BOOKING_ID", "booking_id is required.", 400)
    }

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .maybeSingle()

    if (bookingError) {
      return errorResponse("BOOKING_FETCH_FAILED", bookingError.message, 500)
    }

    if (!booking) {
      return errorResponse("BOOKING_NOT_FOUND", "Booking not found.", 404)
    }

    console.log("BOOKING_FETCH_OK", {
      bookingId: booking.id,
      paymentStatus: booking.payment_status,
      quoteAcceptedAt: booking.quote_accepted_at,
    })

    if (booking.customer_id !== user.id) {
      return errorResponse("BOOKING_CUSTOMER_MISMATCH", "You can only pay for your own booking.", 403)
    }

    if (["held_in_escrow", "released", "refunded"].includes(booking.payment_status)) {
      return errorResponse(
        "PAYMENT_ALREADY_FINAL",
        `Booking payment is already ${booking.payment_status}.`,
        409,
      )
    }

    if (!booking.quote_accepted_at) {
      return errorResponse("QUOTE_NOT_ACCEPTED", "Accept the artisan quote before starting payment.", 409)
    }

    const amount = Number(booking.final_price || booking.quoted_price || 0)

    if (!amount || amount <= 0) {
      return errorResponse(
        "MISSING_ACCEPTED_PRICE",
        "Booking does not have an accepted quoted price to pay.",
        400,
      )
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .eq("id", user.id)
      .maybeSingle()

    if (profileError) {
      return errorResponse("PROFILE_FETCH_FAILED", profileError.message, 500)
    }

    console.log("PROFILE_FETCH_OK", { hasEmail: Boolean(profile?.email || user.email), profileId: profile?.id })

    const email = profile?.email || user.email

    if (!email) {
      return errorResponse("MISSING_CUSTOMER_EMAIL", "Customer email is required before payment can start.", 400)
    }

    const reference = createPaymentReference(booking.id)
    const amountKobo = toKobo(amount)
    const callbackUrl = Deno.env.get("PAYSTACK_CALLBACK_URL")
    console.log("PAYSTACK_REQUEST_START", { amountKobo, bookingId: booking.id, reference })

    let paystackPayload

    try {
      paystackPayload = await initializePaystackTransaction({
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
    } catch (paystackError) {
      return errorResponse("PAYSTACK_INITIALIZE_FAILED", getErrorMessage(paystackError), 500)
    }

    console.log("PAYSTACK_RESPONSE_RECEIVED", {
      hasAccessCode: Boolean(paystackPayload.data?.access_code),
      hasAuthorizationUrl: Boolean(paystackPayload.data?.authorization_url),
      reference,
    })

    const paystackData = paystackPayload.data || {}
    console.log("PAYMENT_ROW_INSERT_START", { bookingId: booking.id, reference })

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
      return errorResponse("PAYMENT_ROW_INSERT_FAILED", paymentError.message, 500)
    }

    console.log("BOOKING_UPDATE_START", { bookingId: booking.id, paymentId: payment.id })

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
      return errorResponse("BOOKING_UPDATE_FAILED", bookingUpdateError.message, 500)
    }

    console.log("INIT_SUCCESS", { bookingId: booking.id, paymentId: payment.id, reference })

    return jsonResponse({
      access_code: paystackData.access_code,
      authorization_url: paystackData.authorization_url,
      payment_id: payment.id,
      reference,
    })
  } catch (error) {
    return errorResponse("INIT_UNHANDLED_ERROR", getErrorMessage(error), 500)
  }
})
