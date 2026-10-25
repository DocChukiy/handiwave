import { getSupabaseClient } from '../lib/supabaseClient.js'

export function mapServiceRow(service) {
  return {
    category: service.category || 'General',
    description: service.description || 'Book a verified Handiwave artisan for this service.',
    icon: service.icon || '🛠️',
    id: service.id,
    popular: Boolean(service.is_popular),
    title: service.name,
  }
}

export async function getServiceOptions() {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('services')
    .select('id, name, slug, category, icon')
    .eq('is_active', true)
    .order('name', { ascending: true })

  return {
    data: data || [],
    error,
  }
}

export async function getServices() {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true })

  return {
    data: (data || []).map(mapServiceRow),
    error,
  }
}
