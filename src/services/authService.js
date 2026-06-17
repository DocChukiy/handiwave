import { getSupabaseClient } from '../lib/supabaseClient.js'
import { getProfileById, mapProfile } from './profileService.js'

const validRoles = ['customer', 'artisan', 'admin']
const selfSignupRoles = ['customer', 'artisan']
const profileRetryDelayMs = 300

function wait(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

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

export async function getProfileForSupabaseUser(supabaseUser, options = {}) {
  if (!supabaseUser) {
    return {
      data: null,
      error: null,
    }
  }

  const retryCount = options.retries || 0
  let lastResult = {
    data: null,
    error: null,
  }

  for (let attempt = 0; attempt <= retryCount; attempt += 1) {
    const { data: profile, error } = await getProfileById(supabaseUser.id)

    lastResult = {
      data: profile,
      error,
    }

    if (profile || error || attempt === retryCount) {
      break
    }

      logger.debug('[Handiwave auth debug] profile not found yet, retrying:', {
        attempt: attempt + 1,
        authUserId: supabaseUser.id,
      })

    await wait(profileRetryDelayMs)
  }

  return {
    data: lastResult.data,
    error: lastResult.error,
  }
}

export async function ensureProfileForSupabaseUser(
  supabaseUser,
  fallbackRole = 'customer',
  options = {},
) {
  if (!supabaseUser) {
    return {
      data: null,
      error: null,
    }
  }

  const { data: existingProfile, error: profileError } = await getProfileForSupabaseUser(
    supabaseUser,
    options,
  )

  if (existingProfile || profileError || !options.createIfMissing) {
    return {
      data: existingProfile,
      error: profileError,
    }
  }

  const supabase = getSupabaseClient()
  const metadata = supabaseUser.user_metadata || {}
  const requestedRole = metadata.role || fallbackRole
  const role = selfSignupRoles.includes(requestedRole) ? requestedRole : 'customer'
  const profilePayload = {
    email: supabaseUser.email,
    full_name: metadata.name || metadata.full_name || supabaseUser.email || 'Handiwave user',
    id: supabaseUser.id,
    role,
  }

    logger.debug('[Handiwave auth debug] profile missing; attempting profile repair insert:', {
      authUserId: supabaseUser.id,
      profilePayload,
    })

  const { data: createdProfile, error: createProfileError } = await supabase
    .from('profiles')
    .insert(profilePayload)
    .select('*')
    .single()

    logger.debug('[Handiwave auth debug] profile repair result:', {
      error: createProfileError,
      profile: createdProfile,
    })

  return {
    data: mapProfile(createdProfile),
    error: createProfileError,
  }
}

export async function getCurrentSessionProfile(options = {}) {
  const supabase = getSupabaseClient()
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  const authUser = sessionData.session?.user || null

    logger.debug('[Handiwave auth debug] auth user id:', authUser?.id || null)
    logger.debug('[Handiwave auth debug] session:', sessionData.session)
    logger.debug('[Handiwave auth debug] auth error:', sessionError)

  if (sessionError || !authUser) {
    return {
      data: {
        authUser,
        profile: null,
        session: sessionData.session,
      },
      error: sessionError,
    }
  }

  const { data: profile, error: profileError } = await ensureProfileForSupabaseUser(
    authUser,
    options.fallbackRole || 'customer',
    {
      createIfMissing: options.createProfileIfMissing || false,
      retries: options.profileRetries || 0,
    },
  )

    logger.debug('[Handiwave auth debug] profile result:', {
      error: profileError,
      profile,
    })

  return {
    data: {
      authUser,
      profile,
      session: sessionData.session,
    },
    error: profileError,
  }
}

export async function signInWithRole({ email, password, role = 'customer' }) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
      logger.error('[Handiwave auth debug] auth error:', error)
    return {
      data: {
        session: null,
        user: null,
      },
      error,
    }
  }

  const { data: sessionProfile, error: sessionProfileError } =
    await getCurrentSessionProfile({
      createProfileIfMissing: true,
      fallbackRole: role,
      profileRetries: 6,
    })

  return {
    data: {
      session: sessionProfile.session || data.session,
      user: sessionProfile.profile,
    },
    error: sessionProfileError,
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

  if (error) {
      logger.error('[Handiwave auth debug] auth error:', error)
    return {
      data: {
        session: null,
        user: null,
      },
      error,
    }
  }

  const { data: sessionProfile, error: sessionProfileError } =
    await getCurrentSessionProfile({
      createProfileIfMissing: Boolean(data.session),
      fallbackRole: role,
      profileRetries: data.session ? 6 : 0,
    })

  return {
    data: {
      session: sessionProfile.session || data.session,
      user: sessionProfile.session ? sessionProfile.profile : normalizeSupabaseUser(data.user, role),
    },
    error: sessionProfileError,
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
