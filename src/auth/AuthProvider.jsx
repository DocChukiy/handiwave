import { useEffect, useMemo, useState } from 'react'
import { AuthContext } from './authContext.js'
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient.js'
import {
  ensureProfileForSupabaseUser,
  getCurrentSessionProfile,
  signInWithRole,
  signOut,
  signUpWithRole,
} from '../services/authService.js'
import logger from '../utils/logger.js'

function AuthProvider({ children }) {
  const supabaseConfigured = isSupabaseConfigured()
  const [authError, setAuthError] = useState(
    supabaseConfigured ? '' : 'Supabase is not configured.',
  )
  const [isLoading, setIsLoading] = useState(supabaseConfigured)
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)

  useEffect(() => {
    if (!supabaseConfigured) {
        logger.debug('[Handiwave auth debug] loading state change:', false)
      return undefined
    }

    let isMounted = true

    async function hydrateAuth() {
        logger.debug('[Handiwave auth debug] loading state change:', true)

      try {
        const { data, error } = await getCurrentSessionProfile({ profileRetries: 2 })

        if (!isMounted) {
          return
        }

        if (error) {
          setAuthError(error.message)
        } else if (data.session && !data.profile) {
          setAuthError('You are signed in, but no Handiwave profile was found yet. Try logging in again or check the Supabase profiles trigger.')
        } else {
          setAuthError('')
        }

        setSession(data.session)
        setUser(data.profile)
      } catch (error) {
        if (isMounted) {
            logger.error('[Handiwave auth debug] auth error:', error)
          setAuthError(error.message)
          setSession(null)
          setUser(null)
        }
      } finally {
        if (isMounted) {
            logger.debug('[Handiwave auth debug] loading state change:', false)
          setIsLoading(false)
        }
      }
    }

    hydrateAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
        logger.debug('[Handiwave auth debug] auth state change:', event)
        logger.debug('[Handiwave auth debug] auth user id:', nextSession?.user?.id || null)
        logger.debug('[Handiwave auth debug] session:', nextSession)

      setSession(nextSession)

      if (!nextSession?.user) {
        setUser(null)
          logger.debug('[Handiwave auth debug] loading state change:', false)
        setIsLoading(false)
        return
      }

        logger.debug('[Handiwave auth debug] loading state change:', true)
      setIsLoading(true)

      window.setTimeout(async () => {
        try {
          const { data: profile, error } = await ensureProfileForSupabaseUser(
            nextSession.user,
            'customer',
            {
              createIfMissing: true,
              retries: 2,
            },
          )

          if (!isMounted) {
            return
          }

            logger.debug('[Handiwave auth debug] profile result:', {
              error,
              profile,
            })

          if (error) {
            setAuthError(error.message)
          } else if (!profile) {
            setAuthError('You are signed in, but no Handiwave profile was found yet. Try logging in again or check the Supabase profiles trigger.')
          } else {
            setAuthError('')
          }

          setUser(profile)
        } catch (error) {
          if (isMounted) {
              logger.error('[Handiwave auth debug] auth error:', error)
            setAuthError(error.message)
          }
        } finally {
          if (isMounted) {
              logger.debug('[Handiwave auth debug] loading state change:', false)
            setIsLoading(false)
          }
        }
      }, 0)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [supabaseConfigured])

  const auth = useMemo(() => {
    async function login({ email, password, role }) {
      setAuthError('')
        logger.debug('[Handiwave auth debug] loading state change:', true)
      setIsLoading(true)

      try {
        const { data, error } = await signInWithRole({ email, password, role })

        if (error) {
          setAuthError(error.message)
          throw error
        }

        if (!data.user) {
          throw new Error('Login succeeded, but no profile was found in public.profiles for this user. Check the profiles trigger/RLS and try again.')
        }

        setSession(data.session)
        setUser(data.user)
        return data.user
      } finally {
          logger.debug('[Handiwave auth debug] loading state change:', false)
        setIsLoading(false)
      }
    }

    async function signup({ email, name, password, primarySkill, role }) {
      setAuthError('')
        logger.debug('[Handiwave auth debug] loading state change:', true)
      setIsLoading(true)

      try {
        const { data, error } = await signUpWithRole({
          email,
          name,
          password,
          primarySkill,
          role,
        })

        if (error) {
          setAuthError(error.message)
          throw error
        }

        if (data.session && !data.user) {
          throw new Error('Signup succeeded, but no profile was found in public.profiles for this user. Check the profiles trigger/RLS and try again.')
        }

        setSession(data.session)
        setUser(data.session ? data.user : null)
        return data
      } finally {
          logger.debug('[Handiwave auth debug] loading state change:', false)
        setIsLoading(false)
      }
    }

    async function logout() {
      setAuthError('')
      const { error } = await signOut()

      if (error) {
        setAuthError(error.message)
        throw error
      }

      setSession(null)
      setUser(null)
    }

    return {
      authError,
      isAuthenticated: Boolean(session && user),
      isLoading,
      login,
      logout,
      session,
      signup,
      user,
    }
  }, [authError, isLoading, session, user])

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}

export default AuthProvider
