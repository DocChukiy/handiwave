import { useEffect, useMemo, useState } from 'react'
import { AuthContext } from './authContext.js'
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient.js'
import {
  normalizeSupabaseUser,
  signInWithRole,
  signOut,
  signUpWithRole,
} from '../services/authService.js'

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
      return undefined
    }

    let isMounted = true

    supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) {
        return
      }

      if (error) {
        setAuthError(error.message)
      }

      setSession(data.session)
      setUser(normalizeSupabaseUser(data.session?.user))
      setIsLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(normalizeSupabaseUser(nextSession?.user))
      setIsLoading(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [supabaseConfigured])

  const auth = useMemo(() => {
    async function login({ email, password, role }) {
      setAuthError('')
      const { data, error } = await signInWithRole({ email, password, role })

      if (error) {
        setAuthError(error.message)
        throw error
      }

      setSession(data.session)
      setUser(data.user)
      return data.user
    }

    async function signup({ email, name, password, primarySkill, role }) {
      setAuthError('')
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

      setSession(data.session)
      setUser(data.session ? data.user : null)
      return data
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
