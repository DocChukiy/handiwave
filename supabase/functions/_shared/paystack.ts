// Set this with:
// supabase secrets set PAYSTACK_SECRET_KEY=sk_test_xxx
const PAYSTACK_BASE_URL = "https://api.paystack.co"

export type PaystackInitializePayload = {
  amount: number
  callback_url?: string
  currency?: string
  email: string
  metadata?: Record<string, unknown>
  reference: string
}

export function getPaystackSecretKey() {
  const secretKey = Deno.env.get("PAYSTACK_SECRET_KEY")

  if (!secretKey) {
    throw new Error("Missing PAYSTACK_SECRET_KEY function secret.")
  }

  return secretKey
}

export function toKobo(amount: number) {
  return Math.round(Number(amount || 0) * 100)
}

export function createPaymentReference(bookingId: string) {
  const shortBookingId = bookingId.replaceAll("-", "").slice(0, 12)
  const entropy = crypto.randomUUID().replaceAll("-", "").slice(0, 14)

  return `hwv_${shortBookingId}_${Date.now()}_${entropy}`
}

async function paystackRequest(path: string, options: RequestInit = {}) {
  const response = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getPaystackSecretKey()}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  })
  const payload = await response.json().catch(() => ({}))

  if (!response.ok || payload.status === false) {
    throw new Error(payload.message || `Paystack request failed with status ${response.status}.`)
  }

  return payload
}

export async function initializePaystackTransaction(payload: PaystackInitializePayload) {
  return paystackRequest("/transaction/initialize", {
    body: JSON.stringify(payload),
    method: "POST",
  })
}

export async function verifyPaystackTransaction(reference: string) {
  return paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`, {
    method: "GET",
  })
}

export async function verifyPaystackSignature(rawBody: string, signature: string | null) {
  if (!signature) {
    return false
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getPaystackSecretKey()),
    { hash: "SHA-512", name: "HMAC" },
    false,
    ["sign"],
  )
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody))
  const hash = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")

  return hash === signature
}
