import { getSupabaseClient } from '../lib/supabaseClient.js'

const validRoles = ['customer', 'artisan', 'admin']

export function normalizeSupabaseUser(supabaseUser, fallbackRole = 'customer') {
  if (!supabaseUser) {
    return null
  }

  const metadata = supabaseUser.user_metadata || {}
  const role = validRoles.includes(metadata.role) ? metadata.role : fallbackRole

  return {
    id: supabaseUser.id,
    email: supabaseUser.email,
    name: metadata.name || metadata.full_name || supabaseUser.email || 'Handiwave user',
    primarySkill: metadata.primary_skill || '',
    role,
  }
}

export async function signInWithRole({ email, password, role = 'customer' }) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  return {
    data: {
      session: data.session,
      user: normalizeSupabaseUser(data.user, role),
    },
    error,
  }
}

export async function signUpWithRole({
  email,
  name,
  password,
  primarySkill = '',
  role = 'customer',
}) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        primary_skill: primarySkill,
        role,
      },
    },
  })

  return {
    data: {
      session: data.session,
      user: normalizeSupabaseUser(data.user, role),
    },
    error,
  }
}

export async function signOut() {
  const supabase = getSupabaseClient()
  const { error } = await supabase.auth.signOut()

  return { data: true, error }
}

export async function getCurrentUser() {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.auth.getUser()

  return {
    data: normalizeSupabaseUser(data.user),
    error,
  }
}
