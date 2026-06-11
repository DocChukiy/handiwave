import { createClient } from "https://esm.sh/@supabase/supabase-js@2.106.2"

// Set these with:
// Supabase provides SUPABASE_URL by default.
// For the service role/admin key, this helper supports either:
// - SUPABASE_SERVICE_ROLE_KEY
// - SUPABASE_SECRET_KEYS
// Keep these values inside Supabase Edge Function secrets only.
type SecretBundle = Record<string, unknown> | unknown[]

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value))
}

function findSecretKeyInBundle(bundle: SecretBundle): string {
  if (Array.isArray(bundle)) {
    const preferred = bundle.find((item) => (
      isRecord(item) &&
      ["current", "default", "service_role", "service-role"].includes(String(item.name || item.type || item.role || "").toLowerCase())
    ))
    const fallback = preferred || bundle.find(isRecord)

    if (isRecord(fallback)) {
      return findSecretKeyInBundle(fallback)
    }

    return ""
  }

  const directKeys = [
    "current",
    "default",
    "service_role",
    "serviceRole",
    "service_role_key",
    "serviceRoleKey",
    "secret",
    "secret_key",
    "secretKey",
    "key",
    "value",
  ]

  for (const key of directKeys) {
    const value = bundle[key]

    if (typeof value === "string" && value.trim()) {
      return value.trim()
    }
  }

  for (const value of Object.values(bundle)) {
    if (isRecord(value) || Array.isArray(value)) {
      const nested = findSecretKeyInBundle(value)

      if (nested) {
        return nested
      }
    }
  }

  return ""
}

function getSupabaseServiceKey() {
  const explicitServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

  if (explicitServiceRoleKey) {
    return explicitServiceRoleKey
  }

  const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS")

  if (!secretKeys) {
    return ""
  }

  try {
    const parsed = JSON.parse(secretKeys) as SecretBundle

    return findSecretKeyInBundle(parsed)
  } catch (_error) {
    return secretKeys
  }
}

export function createSupabaseAdminClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = getSupabaseServiceKey()

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing SUPABASE_URL and service key. Set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEYS.")
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export function getBearerToken(request: Request) {
  const authorization = request.headers.get("Authorization") || ""

  if (!authorization.startsWith("Bearer ")) {
    throw new Error("Missing Authorization bearer token.")
  }

  return authorization.replace("Bearer ", "").trim()
}

export async function getAuthenticatedUser(request: Request, supabase: ReturnType<typeof createSupabaseAdminClient>) {
  const token = getBearerToken(request)
  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data.user) {
    throw new Error(error?.message || "Unable to verify authenticated user.")
  }

  return data.user
}
