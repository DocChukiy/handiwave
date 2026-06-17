import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { handleCors, jsonResponse, methodNotAllowed } from "../_shared/cors.ts"
import { verifyPaystackTransaction } from "../_shared/paystack.ts"
import { createSupabaseAdminClient, getAuthenticatedUser } from "../_shared/supabaseAdmin.ts"

type VerifyPaymentBody = {
  reference?: string
  trxref?: string
}

function getErrorMessage(error: unknown, fallback = "Unable to verify payment.") {
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

async function createPaymentSuccessNotifications(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  bookingId: string,
) {
  const { data: existingNotification } = await supabase
    .from("notifications")
    .select("id")
    .contains("data", {
      booking_id: bookingId,
      event: "payment_success",
    })
    .limit(1)
    .maybeSingle()

  if (existingNotification) {
    return
  }

  const { data: booking, error } = await supabase
    .from("bookings")
    .select(`
      id,
      customer_id,
      artisan_id,
      payment_status,
      service:services!bookings_service_id_fkey(name),
      artisan:artisans!bookings_artisan_id_fkey(profile_id)
    `)
    .eq("id", bookingId)
    .maybeSingle()

  if (error || !booking) {
    console.error("[Handiwave payment notification] booking lookup failed:", error)
    return
  }

  const serviceName = booking.service?.name || "booking"
  const notifications = [
    {
      body: `Your ${serviceName} payment is successful and held in escrow.`,
      data: {
        booking_id: booking.id,
        event: "payment_success",
      },
      profile_id: booking.customer_id,
      title: "Payment successful",
      type: "wallet",
    },
  ]

  if (booking.artisan?.profile_id) {
    notifications.push({
      body: `Customer payment for ${serviceName} is now held in escrow.`,
      data: {
        booking_id: booking.id,
        event: "payment_success",
      },
      profile_id: booking.artisan.profile_id,
      title: "Payment held in escrow",
      type: "wallet",
    })
  }

  const { error: notificationError } = await supabase
    .from("notifications")
    .insert(notifications)

  if (notificationError) {
    console.error("[Handiwave payment notification] insert failed:", notificationError)
  }
}

async function getReference(request: Request) {
  if (request.method === "GET") {
    const searchParams = new URL(request.url).searchParams
    return searchParams.get("reference") || searchParams.get("trxref") || ""
  }

  const body = await request.json().catch(() => ({})) as VerifyPaymentBody

  return body.reference || body.trxref || ""
}

// Required function secrets:
// supabase secrets set PAYSTACK_SECRET_KEY=sk_test_xxx
// supabase secrets set SUPABASE_URL=https://your-project.supabase.co
// supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
serve(async (request) => {
  try {
    console.log("VERIFY_START")

    const corsResponse = handleCors(request)

    if (corsResponse) {
      return corsResponse
    }

    if (!["GET", "POST"].includes(request.method)) {
      return methodNotAllowed()
    }

    const supabase = createSupabaseAdminClient()
    const user = await getAuthenticatedUser(request, supabase)
    console.log("AUTH_OK", { userId: user.id })

    const reference = await getReference(request)

    if (!reference) {
      return errorResponse("MISSING_REFERENCE", "Payment reference is required.", 400)
    }

    console.log("REFERENCE_RECEIVED", { reference })

    const { data: payment, error: paymentError } = await supabase
      .from("paystack_payment_transactions")
      .select("*")
      .eq("provider_reference", reference)
      .maybeSingle()

    if (paymentError) {
      return errorResponse("PAYMENT_FETCH_FAILED", paymentError.message, 500)
    }

    if (!payment) {
      return errorResponse("PAYMENT_NOT_FOUND", "Payment transaction not found for this Paystack reference.", 404)
    }

    console.log("PAYMENT_FETCH_OK", {
      bookingId: payment.booking_id,
      customerId: payment.customer_id,
      paymentId: payment.id,
      providerReference: payment.provider_reference,
      status: payment.status,
    })

    if (payment.customer_id !== user.id) {
      return errorResponse("PAYMENT_CUSTOMER_MISMATCH", "This payment does not belong to the current user.", 403)
    }

    let paystackPayload

    try {
      console.log("PAYSTACK_VERIFY_START", { reference })
      paystackPayload = await verifyPaystackTransaction(reference)
    } catch (paystackError) {
      return errorResponse("PAYSTACK_VERIFY_FAILED", getErrorMessage(paystackError), 500)
    }

    const paystackData = paystackPayload.data || {}
    const paystackStatus = paystackData.status

    console.log("PAYSTACK_VERIFY_OK", {
      amount: paystackData.amount,
      bookingId: payment.booking_id,
      paystackStatus,
      reference,
      transactionId: paystackData.id,
    })

    const { error: paymentUpdateError } = await supabase
      .from("paystack_payment_transactions")
      .update({
        channel: paystackData.channel || null,
        fees: Number(paystackData.fees || 0) / 100,
        provider_payload: paystackPayload,
        provider_transaction_id: paystackData.id ? String(paystackData.id) : null,
      })
      .eq("id", payment.id)

    if (paymentUpdateError) {
      return errorResponse("PAYMENT_UPDATE_FAILED", paymentUpdateError.message, 500)
    }

    if (paystackStatus === "success") {
      console.log("APPLY_ESCROW_START", { reference })

      const { data: bookingId, error: applyError } = await supabase.rpc(
        "apply_paystack_booking_payment_success",
        {
          target_provider_payload: paystackPayload,
          target_provider_reference: reference,
        },
      )

      if (applyError) {
        return errorResponse("APPLY_ESCROW_FAILED", applyError.message, 500)
      }

      if (bookingId) {
        const { error: bookingStatusError } = await supabase
          .from("bookings")
          .update({ status: "confirmed" })
          .eq("id", bookingId)
          .eq("payment_status", "held_in_escrow")

        if (bookingStatusError) {
          return errorResponse("BOOKING_CONFIRM_FAILED", bookingStatusError.message, 500)
        }

        await createPaymentSuccessNotifications(supabase, bookingId)
      }

      console.log("VERIFY_SUCCESS", { bookingId, reference })

      return jsonResponse({
        booking_id: bookingId,
        payment_status: "held_in_escrow",
        reference,
        status: "success",
      })
    }

    console.log("MARK_PAYMENT_FAILED_START", { paystackStatus, reference })

    const { data: bookingId, error: failError } = await supabase.rpc(
      "mark_paystack_booking_payment_failed",
      {
        target_provider_payload: paystackPayload,
        target_provider_reference: reference,
      },
    )

    if (failError) {
      return errorResponse("MARK_PAYMENT_FAILED_RPC_FAILED", failError.message, 500)
    }

    return jsonResponse({
      debugCode: "PAYSTACK_PAYMENT_NOT_SUCCESSFUL",
      error: paystackPayload.message || `Paystack status: ${paystackStatus || "failed"}`,
      booking_id: bookingId,
      message: paystackPayload.message || `Paystack status: ${paystackStatus || "failed"}`,
      payment_status: "failed",
      reference,
      status: paystackStatus || "failed",
    }, 400)
  } catch (error) {
    return errorResponse("VERIFY_UNHANDLED_ERROR", getErrorMessage(error), 500)
  }
})
