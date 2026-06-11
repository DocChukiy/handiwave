import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { handleCors, jsonResponse, methodNotAllowed } from "../_shared/cors.ts"
import { verifyPaystackTransaction } from "../_shared/paystack.ts"
import { createSupabaseAdminClient, getAuthenticatedUser } from "../_shared/supabaseAdmin.ts"

type VerifyPaymentBody = {
  reference?: string
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
    return new URL(request.url).searchParams.get("reference") || ""
  }

  const body = await request.json().catch(() => ({})) as VerifyPaymentBody

  return body.reference || ""
}

// Required function secrets:
// supabase secrets set PAYSTACK_SECRET_KEY=sk_test_xxx
// supabase secrets set SUPABASE_URL=https://your-project.supabase.co
// supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
serve(async (request) => {
  const corsResponse = handleCors(request)

  if (corsResponse) {
    return corsResponse
  }

  if (!["GET", "POST"].includes(request.method)) {
    return methodNotAllowed()
  }

  try {
    const supabase = createSupabaseAdminClient()
    const user = await getAuthenticatedUser(request, supabase)
    const reference = await getReference(request)

    if (!reference) {
      return jsonResponse({ error: "Payment reference is required." }, 400)
    }

    const { data: payment, error: paymentError } = await supabase
      .from("paystack_payment_transactions")
      .select("*")
      .eq("provider_reference", reference)
      .maybeSingle()

    if (paymentError) {
      return jsonResponse({ error: paymentError.message }, 500)
    }

    if (!payment) {
      return jsonResponse({ error: "Payment transaction not found." }, 404)
    }

    if (payment.customer_id !== user.id) {
      return jsonResponse({ error: "This payment does not belong to the current user." }, 403)
    }

    const paystackPayload = await verifyPaystackTransaction(reference)
    const paystackData = paystackPayload.data || {}
    const paystackStatus = paystackData.status

    await supabase
      .from("paystack_payment_transactions")
      .update({
        channel: paystackData.channel || null,
        fees: Number(paystackData.fees || 0) / 100,
        provider_payload: paystackPayload,
        provider_transaction_id: paystackData.id ? String(paystackData.id) : null,
      })
      .eq("id", payment.id)

    if (paystackStatus === "success") {
      const { data: bookingId, error: applyError } = await supabase.rpc(
        "apply_paystack_booking_payment_success",
        {
          target_provider_payload: paystackPayload,
          target_provider_reference: reference,
        },
      )

      if (applyError) {
        return jsonResponse({ error: applyError.message }, 500)
      }

      if (bookingId) {
        await supabase
          .from("bookings")
          .update({ status: "confirmed" })
          .eq("id", bookingId)
          .eq("payment_status", "held_in_escrow")

        await createPaymentSuccessNotifications(supabase, bookingId)
      }

      return jsonResponse({
        booking_id: bookingId,
        payment_status: "held_in_escrow",
        reference,
        status: "success",
      })
    }

    const { data: bookingId, error: failError } = await supabase.rpc(
      "mark_paystack_booking_payment_failed",
      {
        target_provider_payload: paystackPayload,
        target_provider_reference: reference,
      },
    )

    if (failError) {
      return jsonResponse({ error: failError.message }, 500)
    }

    return jsonResponse({
      booking_id: bookingId,
      message: paystackPayload.message || `Paystack status: ${paystackStatus || "failed"}`,
      payment_status: "failed",
      reference,
      status: paystackStatus || "failed",
    }, 400)
  } catch (error) {
    return jsonResponse({ error: error.message || "Unable to verify payment." }, 500)
  }
})
