import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { handleCors, jsonResponse, methodNotAllowed } from "../_shared/cors.ts"
import { verifyPaystackSignature } from "../_shared/paystack.ts"
import { createSupabaseAdminClient } from "../_shared/supabaseAdmin.ts"

type PaystackWebhookPayload = {
  data?: {
    id?: number | string
    reference?: string
    status?: string
  }
  event?: string
}

function getProviderEventId(payload: PaystackWebhookPayload, reference: string) {
  const event = payload.event || "unknown"
  const providerId = payload.data?.id ? String(payload.data.id) : crypto.randomUUID()

  return `${event}:${reference || "no-reference"}:${providerId}`
}

async function updateWebhookEvent(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  webhookEventId: string,
  update: Record<string, unknown>,
) {
  await supabase
    .from("paystack_webhook_events")
    .update({
      ...update,
      processed_at: new Date().toISOString(),
    })
    .eq("id", webhookEventId)
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

// Required function secrets:
// supabase secrets set PAYSTACK_SECRET_KEY=sk_test_xxx
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

  const rawBody = await request.text()
  const signature = request.headers.get("x-paystack-signature")
  const isValidSignature = await verifyPaystackSignature(rawBody, signature)

  if (!isValidSignature) {
    return jsonResponse({ error: "Invalid Paystack webhook signature." }, 401)
  }

  const supabase = createSupabaseAdminClient()
  let payload: PaystackWebhookPayload

  try {
    payload = JSON.parse(rawBody) as PaystackWebhookPayload
  } catch (_error) {
    return jsonResponse({ error: "Invalid webhook JSON payload." }, 400)
  }

  const eventType = payload.event || "unknown"
  const reference = payload.data?.reference || ""
  const providerEventId = getProviderEventId(payload, reference)

  const { data: existingEvent } = await supabase
    .from("paystack_webhook_events")
    .select("id, status")
    .eq("provider_event_id", providerEventId)
    .maybeSingle()

  if (existingEvent?.status === "processed") {
    return jsonResponse({ status: "ok", message: "Webhook already processed." })
  }

  const { data: payment } = reference
    ? await supabase
      .from("paystack_payment_transactions")
      .select("id")
      .eq("provider_reference", reference)
      .maybeSingle()
    : { data: null }

  const { data: webhookEvent, error: webhookInsertError } = existingEvent
    ? await supabase
      .from("paystack_webhook_events")
      .update({
        event_type: eventType,
        payment_transaction_id: payment?.id || null,
        payload,
        provider_reference: reference || null,
        status: "received",
      })
      .eq("id", existingEvent.id)
      .select("*")
      .single()
    : await supabase
      .from("paystack_webhook_events")
      .insert({
        event_type: eventType,
        payment_transaction_id: payment?.id || null,
        payload,
        provider_event_id: providerEventId,
        provider_reference: reference || null,
        status: "received",
      })
      .select("*")
      .single()

  if (webhookInsertError) {
    return jsonResponse({ error: webhookInsertError.message }, 500)
  }

  if (!reference) {
    await updateWebhookEvent(supabase, webhookEvent.id, {
      error_message: "Webhook payload did not include a Paystack reference.",
      status: "ignored",
    })

    return jsonResponse({ status: "ignored", message: "No reference found." })
  }

  try {
    if (eventType === "charge.success" && payload.data?.status === "success") {
      const { data: bookingId, error: applyError } = await supabase.rpc(
        "apply_paystack_booking_payment_success",
        {
          target_provider_payload: payload,
          target_provider_reference: reference,
        },
      )

      if (applyError) {
        throw applyError
      }

      if (bookingId) {
        await supabase
          .from("bookings")
          .update({ status: "confirmed" })
          .eq("id", bookingId)
          .eq("payment_status", "held_in_escrow")

        await createPaymentSuccessNotifications(supabase, bookingId)
      }

      await updateWebhookEvent(supabase, webhookEvent.id, { status: "processed" })

      return jsonResponse({ status: "ok" })
    }

    if (eventType === "charge.failed") {
      const { error: failError } = await supabase.rpc(
        "mark_paystack_booking_payment_failed",
        {
          target_provider_payload: payload,
          target_provider_reference: reference,
        },
      )

      if (failError) {
        throw failError
      }

      await updateWebhookEvent(supabase, webhookEvent.id, { status: "processed" })

      return jsonResponse({ status: "ok" })
    }

    await updateWebhookEvent(supabase, webhookEvent.id, { status: "ignored" })

    return jsonResponse({ status: "ignored", event: eventType })
  } catch (error) {
    await updateWebhookEvent(supabase, webhookEvent.id, {
      error_message: error.message || "Webhook processing failed.",
      status: "failed",
    })

    return jsonResponse({ error: error.message || "Webhook processing failed." }, 500)
  }
})
