import { getSupabaseClient } from '../lib/supabaseClient.js'

export function mapServiceRow(service) {
  return {
    category: service.category || 'General',
    description: service.description || 'Book a verified Handiwave artisan for this service.',
    duration: 'By quote',
    icon: service.icon || '🛠️',
    id: service.id,
    locations: ['Lagos', 'Abuja', 'Port Harcourt', 'Ibadan'],
    popular: Boolean(service.is_popular),
    price: service.base_price
      ? `From NGN ${Number(service.base_price).toLocaleString()}`
      : 'By quote',
    priceValue: Number(service.base_price) || 30000,
    rating: 4.8,
    title: service.name,
  }
}

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
