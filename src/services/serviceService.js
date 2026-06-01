import { getSupabaseClient } from '../lib/supabaseClient.js'

export async function getServiceOptions() {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('services')
    .select('id, name, category')
    .eq('is_active', true)
    .order('name', { ascending: true })

  return {
    data: data || [],
    error,
  }
}
