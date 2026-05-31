import { isSupabaseConfigured } from '../lib/supabaseClient.js'

export function useSupabaseStatus() {
  return {
    isConfigured: isSupabaseConfigured(),
    status: isSupabaseConfigured() ? 'configured' : 'mock',
  }
}
