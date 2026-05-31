import { useMemo } from 'react'
import { isSupabaseConfigured } from '../lib/supabaseClient.js'
import { BackendContext } from './backendContext.js'

function BackendProvider({ children }) {
  const backend = useMemo(
    () => ({
      mode: isSupabaseConfigured() ? 'supabase-ready' : 'mock',
      supabaseConfigured: isSupabaseConfigured(),
    }),
    [],
  )

  return (
    <BackendContext.Provider value={backend}>
      {children}
    </BackendContext.Provider>
  )
}

export default BackendProvider
