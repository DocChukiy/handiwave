import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { handleCors, jsonResponse } from "../_shared/cors.ts"
import { verifyPaystackTransaction } from "../_shared/paystack.ts"
import { createSupabaseAdminClient, getAuthenticatedUser } from "../_shared/supabaseAdmin.ts"

type VerifyPaymentBody = {
  reference?: string
  trxref?: string
}

type ReferenceDiagnostics = {
  bodyReference: string
  bodyTrxref: string
  queryReference: string
  queryTrxref: string
  reference: string
  used: "body.reference" | "body.trxref" | "query.reference" | "query.trxref" | "none"
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
  console.error("VERIFY_EXIT_NON_200", { debugCode, message, status })
  return jsonResponse({ debugCode, error: message }, status)
}

function summarizePaystackPayload(payload: Record<string, unknown>) {
  const data = (payload.data || {}) as Record<string, unknown>

  return {
    amount: data.amount,
    channel: data.channel,
    currency: data.currency,
    fees: data.fees,
    gatewayResponse: data.gateway_response,
    paidAt: data.paid_at,
    reference: data.reference,
    status: data.status,
    transactionId: data.id,
  }
}

async function logBookingSnapshot(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  label: "BOOKING_BEFORE" | "BOOKING_AFTER",
  bookingId: string,
) {
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .maybeSingle()

  if (error) {
    console.error(label, { bookingId, error: error.message })
    return null
  }

  console.log(label, {
    artisanId: data?.artisan_id,
    artisanPayoutAmount: data?.artisan_payout_amount,
    bookingId,
    commissionAmount: data?.commission_amount,
    customerId: data?.customer_id,
    escrowAmount: data?.escrow_amount,
    finalPrice: data?.final_price,
    paymentReference: data?.payment_reference,
    paymentStatus: data?.payment_status,
    paystackPaymentTransactionId: data?.paystack_payment_transaction_id,
    quoteAcceptedAt: data?.quote_accepted_at,
    quotedPrice: data?.quoted_price,
    refundAmount: data?.refund_amount,
    status: data?.status,
  })

  return data
}

async function logWalletSnapshot(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  booking: Record<string, unknown> | null,
) {
  if (!booking) {
    console.log("WALLET_LEDGER_AFTER", { skipped: "booking snapshot unavailable" })
    return
  }

  const customerId = String(booking.customer_id || "")
  const artisanId = String(booking.artisan_id || "")
  let artisanProfileId = ""

  if (artisanId) {
    const { data: artisan, error: artisanError } = await supabase
      .from("artisans")
      .select("profile_id")
      .eq("id", artisanId)
      .maybeSingle()

    if (artisanError) {
      console.error("WALLET_LEDGER_AFTER", { artisanId, error: artisanError.message })
    }

    artisanProfileId = artisan?.profile_id || ""
  }

  const profileIds = [customerId, artisanProfileId].filter(Boolean)

  if (profileIds.length === 0) {
    console.log("WALLET_LEDGER_AFTER", { skipped: "no wallet profile ids available" })
    return
  }

  const { data: wallets, error: walletsError } = await supabase
    .from("wallets")
    .select("id, profile_id, balance, escrow_balance, pending_earnings, released_earnings, total_credited, total_debited")
    .in("profile_id", profileIds)

  if (walletsError) {
    console.error("WALLET_LEDGER_AFTER", { error: walletsError.message, profileIds })
    return
  }

  const walletIds = (wallets || []).map((wallet) => wallet.id)
  const { data: transactions, error: transactionsError } = walletIds.length > 0
    ? await supabase
      .from("wallet_transactions")
      .select("id, wallet_id, booking_id, type, status, amount, reference, created_at")
      .eq("booking_id", String(booking.id || ""))
      .in("wallet_id", walletIds)
      .order("created_at", { ascending: false })
    : { data: [], error: null }

  if (transactionsError) {
    console.error("WALLET_LEDGER_AFTER", { error: transactionsError.message, walletIds })
  }

  console.log("WALLET_LEDGER_AFTER", {
    bookingId: booking.id,
    profileIds,
    transactions: transactions || [],
    wallets: wallets || [],
  })
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

async function getReference(request: Request): Promise<ReferenceDiagnostics> {
  const searchParams = new URL(request.url).searchParams
  const queryReference = searchParams.get("reference") || ""
  const queryTrxref = searchParams.get("trxref") || ""
  let bodyReference = ""
  let bodyTrxref = ""

  if (request.method !== "GET") {
    const body = await request.json().catch(() => ({})) as VerifyPaymentBody
    bodyReference = body.reference || ""
    bodyTrxref = body.trxref || ""
  }

  if (bodyReference) {
    return {
      bodyReference,
      bodyTrxref,
      queryReference,
      queryTrxref,
      reference: bodyReference,
      used: "body.reference",
    }
  }

  if (bodyTrxref) {
    return {
      bodyReference,
      bodyTrxref,
      queryReference,
      queryTrxref,
      reference: bodyTrxref,
      used: "body.trxref",
    }
  }

  if (queryReference) {
    return {
      bodyReference,
      bodyTrxref,
      queryReference,
      queryTrxref,
      reference: queryReference,
      used: "query.reference",
    }
  }

  if (queryTrxref) {
    return {
      bodyReference,
      bodyTrxref,
      queryReference,
      queryTrxref,
      reference: queryTrxref,
      used: "query.trxref",
    }
  }

  return {
    bodyReference,
    bodyTrxref,
    queryReference,
    queryTrxref,
    reference: "",
    used: "none",
  }
}

// Required function secrets:
// supabase secrets set PAYSTACK_SECRET_KEY=sk_test_xxx
// supabase secrets set SUPABASE_URL=https://your-project.supabase.co
// supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
serve(async (request) => {
  try {
    console.log("VERIFY_START", {
      method: request.method,
      url: request.url,
    })

    const corsResponse = handleCors(request)

    if (corsResponse) {
      return corsResponse
    }

    if (!["GET", "POST"].includes(request.method)) {
      return errorResponse("METHOD_NOT_ALLOWED", "Method not allowed.", 405)
    }

    const supabase = createSupabaseAdminClient()
    const user = await getAuthenticatedUser(request, supabase)
    console.log("AUTH_OK", { userId: user.id })

    const referenceDiagnostics = await getReference(request)
    const reference = referenceDiagnostics.reference

    if (!reference) {
      console.log("REFERENCE_RECEIVED", referenceDiagnostics)
      return errorResponse("MISSING_REFERENCE", "Payment reference is required.", 400)
    }

    console.log("REFERENCE_RECEIVED", referenceDiagnostics)

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

    console.log("PAYMENT_ROW_FOUND", {
      amount: payment.amount,
      amountKobo: payment.amount_kobo,
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
      console.log("VERIFY_PAYSTACK_REQUEST", {
        endpoint: `/transaction/verify/${reference}`,
        reference,
      })
      paystackPayload = await verifyPaystackTransaction(reference)
    } catch (paystackError) {
      return errorResponse("PAYSTACK_VERIFY_FAILED", getErrorMessage(paystackError), 500)
    }

    const paystackData = paystackPayload.data || {}
    const paystackStatus = paystackData.status

    console.log("VERIFY_PAYSTACK_RESPONSE", {
      bookingId: payment.booking_id,
      payload: summarizePaystackPayload(paystackPayload),
      reference,
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

    console.log("PAYMENT_ROW_UPDATED", {
      paymentId: payment.id,
      providerReference: reference,
      providerTransactionId: paystackData.id ? String(paystackData.id) : null,
    })

    await logBookingSnapshot(supabase, "BOOKING_BEFORE", payment.booking_id)

    if (paystackStatus === "success") {
      console.log("RPC_START", {
        name: "apply_paystack_booking_payment_success",
        reference,
      })

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

      console.log("RPC_SUCCESS", {
        bookingId,
        name: "apply_paystack_booking_payment_success",
        reference,
      })

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

      const bookingAfter = bookingId
        ? await logBookingSnapshot(supabase, "BOOKING_AFTER", bookingId)
        : null

      if (!bookingId) {
        console.log("BOOKING_AFTER", { skipped: "RPC returned no booking id" })
      }

      await logWalletSnapshot(supabase, bookingAfter)

      console.log("VERIFY_FINISHED", {
        bookingId,
        paymentStatus: "held_in_escrow",
        reference,
        status: "success",
      })

      return jsonResponse({
        booking_id: bookingId,
        payment_status: "held_in_escrow",
        reference,
        status: "success",
      })
    }

    console.log("RPC_START", {
      name: "mark_paystack_booking_payment_failed",
      paystackStatus,
      reference,
    })

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

    console.log("RPC_SUCCESS", {
      bookingId,
      name: "mark_paystack_booking_payment_failed",
      reference,
    })

    if (bookingId) {
      await logBookingSnapshot(supabase, "BOOKING_AFTER", bookingId)
    } else {
      console.log("BOOKING_AFTER", { skipped: "RPC returned no booking id" })
    }

    console.log("VERIFY_FINISHED", {
      bookingId,
      paymentStatus: "failed",
      reference,
      status: paystackStatus || "failed",
    })

    console.error("VERIFY_EXIT_NON_200", {
      debugCode: "PAYSTACK_PAYMENT_NOT_SUCCESSFUL",
      message: paystackPayload.message || `Paystack status: ${paystackStatus || "failed"}`,
      status: 400,
    })

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
