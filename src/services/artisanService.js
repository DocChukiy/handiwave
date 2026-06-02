import { artisans } from '../data/artisans.js'
import { getSupabaseClient } from '../lib/supabaseClient.js'
import { updateProfile } from './profileService.js'

const artisanPrimaryServiceRelation = 'artisans_primary_service_id_fkey'
const artisanServicesArtisanRelation = 'artisan_services_artisan_id_fkey'
const artisanServicesServiceRelation = 'artisan_services_service_id_fkey'

function getInitials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function mapArtisanRow(artisan) {
  const profile = artisan.profile || {}
  const primaryService = artisan.primary_service || {}
  const name = profile.full_name || artisan.business_name || 'Handiwave artisan'
  const city = artisan.city || profile.city || 'Lagos'
  const state = artisan.state || profile.state || 'Nigeria'
  const serviceName = primaryService.name || 'General Service'
  const priceValue = Number(artisan.starting_price) || 30000

  return {
    area: city,
    category: primaryService.category || serviceName,
    completedJobs: artisan.completed_jobs || 0,
    featuredSkill: serviceName,
    fullLocation: `${city}, ${state}`,
    id: artisan.id,
    initials: getInitials(name),
    jobs: artisan.completed_jobs || 0,
    location: state,
    name,
    price: artisan.starting_price
      ? `From NGN ${priceValue.toLocaleString()}`
      : 'By quote',
    priceValue,
    profileId: artisan.profile_id,
    rating: Number(artisan.average_rating) || 0,
    skill: serviceName,
    topRated: Number(artisan.average_rating) >= 4.8,
    verified: artisan.verification_status === 'verified',
  }
}

export async function getArtisans() {
  return {
    data: artisans,
    error: null,
  }
}

export async function getVerifiedArtisans() {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('artisans')
    .select(`
      *,
      profile:profiles(id, full_name, email, avatar_url, city, state),
      primary_service:services!${artisanPrimaryServiceRelation}(id, name, category, icon),
      service_links:artisan_services!${artisanServicesArtisanRelation}(
        service_id,
        service:services!${artisanServicesServiceRelation}(id, name, category, icon)
      )
    `)
    .eq('verification_status', 'verified')
    .eq('is_available', true)
    .order('average_rating', { ascending: false })

  return {
    data: (data || []).map(mapArtisanRow),
    error,
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
    .select(`
      *,
      primary_service:services!${artisanPrimaryServiceRelation}(id, name, category, icon),
      service_links:artisan_services!${artisanServicesArtisanRelation}(
        service_id,
        service:services!${artisanServicesServiceRelation}(id, name, category, icon)
      )
    `)
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
  serviceArea,
  state,
  startingPrice,
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
      service_area: serviceArea,
      state,
      starting_price: Number(startingPrice) || null,
      years_experience: Number(yearsExperience) || 0,
    })
    .select(`
      *,
      primary_service:services!${artisanPrimaryServiceRelation}(id, name, category, icon)
    `)
    .single()

  if (artisanError) {
    return {
      data: null,
      error: artisanError,
    }
  }

  const { error: artisanServiceError } = await supabase
    .from('artisan_services')
    .upsert({
      artisan_id: artisan.id,
      service_id: primaryServiceId,
      price_from: Number(startingPrice) || null,
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
