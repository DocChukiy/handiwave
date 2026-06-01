import { artisans } from '../data/artisans.js'
import { getSupabaseClient } from '../lib/supabaseClient.js'
import { updateProfile } from './profileService.js'

export async function getArtisans() {
  return {
    data: artisans,
    error: null,
  }
}

export async function getArtisanByName(name) {
  return {
    data: artisans.find((artisan) => artisan.name === name) || null,
    error: null,
  }
}

export async function getArtisansByCategory(category) {
  return {
    data: artisans.filter((artisan) => artisan.category === category),
    error: null,
  }
}

export async function getArtisanByProfileId(profileId) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('artisans')
    .select('*, primary_service:services(id, name, category), artisan_services(service_id)')
    .eq('profile_id', profileId)
    .maybeSingle()

  return {
    data,
    error,
  }
}

export async function createArtisanOnboardingProfile({
  bio,
  businessName,
  city,
  primaryServiceId,
  profileId,
  state,
  yearsExperience,
}) {
  const supabase = getSupabaseClient()

  const { error: profileError } = await updateProfile(profileId, {
    city,
    state,
  })

  if (profileError) {
    return {
      data: null,
      error: profileError,
    }
  }

  const { data: artisan, error: artisanError } = await supabase
    .from('artisans')
    .insert({
      bio,
      business_name: businessName,
      city,
      primary_service_id: primaryServiceId,
      profile_id: profileId,
      state,
      years_experience: Number(yearsExperience) || 0,
    })
    .select('*')
    .single()

  if (artisanError) {
    return {
      data: null,
      error: artisanError,
    }
  }

  const { error: artisanServiceError } = await supabase
    .from('artisan_services')
    .insert({
      artisan_id: artisan.id,
      service_id: primaryServiceId,
    })

  if (artisanServiceError) {
    return {
      data: null,
      error: artisanServiceError,
    }
  }

  return {
    data: artisan,
    error: null,
  }
}
