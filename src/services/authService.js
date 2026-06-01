import { getSupabaseClient } from '../lib/supabaseClient.js'
import { getProfileById } from './profileService.js'

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

export async function getProfileForSupabaseUser(supabaseUser, fallbackRole = 'customer') {
  if (!supabaseUser) {
    return {
      data: null,
      error: null,
    }
  }

  const { data: profile, error } = await getProfileById(supabaseUser.id)

  return {
    data: profile || normalizeSupabaseUser(supabaseUser, fallbackRole),
    error,
  }
}

export async function signInWithRole({ email, password, role = 'customer' }) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  const { data: profile, error: profileError } = await getProfileForSupabaseUser(data.user, role)

  return {
    data: {
      session: data.session,
      user: profile,
    },
    error: error || profileError,
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

  const { data: profile, error: profileError } = data.session
    ? await getProfileForSupabaseUser(data.user, role)
    : { data: normalizeSupabaseUser(data.user, role), error: null }

  return {
    data: {
      session: data.session,
      user: profile,
    },
    error: error || profileError,
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
  const { data: profile, error: profileError } = await getProfileForSupabaseUser(data.user)

  return {
    data: profile,
    error: error || profileError,
  }
}
