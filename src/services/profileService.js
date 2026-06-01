import { getSupabaseClient } from '../lib/supabaseClient.js'

export function mapProfile(profile) {
  if (!profile) {
    return null
  }

  return {
    avatarUrl: profile.avatar_url,
    city: profile.city || '',
    country: profile.country || 'Nigeria',
    email: profile.email,
    id: profile.id,
    name: profile.full_name || profile.email || 'Handiwave user',
    phone: profile.phone || '',
    role: profile.role || 'customer',
    state: profile.state || '',
  }
}

export async function getProfileById(profileId) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .maybeSingle()

  return {
    data: mapProfile(data),
    error,
  }
}

export async function updateProfile(profileId, updates) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('profiles')
    .update({
      city: updates.city,
      full_name: updates.name,
      phone: updates.phone,
      state: updates.state,
    })
    .eq('id', profileId)
    .select('*')
    .single()

  return {
    data: mapProfile(data),
    error,
  }
}
