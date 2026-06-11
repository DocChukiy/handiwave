import { artisans } from '../data/artisans.js'
import { getSupabaseClient } from '../lib/supabaseClient.js'
import { updateProfile } from './profileService.js'

const artisanPrimaryServiceRelation = 'artisans_primary_service_id_fkey'
const artisanServicesArtisanRelation = 'artisan_services_artisan_id_fkey'
const artisanServicesServiceRelation = 'artisan_services_service_id_fkey'
const artisanProfileRelation = 'artisans_profile_id_fkey'

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
  const rating = Number(artisan.average_rating) || 0
  const reviewCount = artisan.review_count || 0

  return {
    bio: artisan.bio || '',
    businessName: artisan.business_name || '',
    area: city,
    category: primaryService.category || serviceName,
    completedJobs: artisan.completed_jobs || 0,
    createdAt: artisan.created_at || '',
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
    raw: artisan,
    rating,
    reviewCount,
    serviceArea: artisan.service_area || '',
    skill: serviceName,
    startingPrice: artisan.starting_price,
    verificationStatus: artisan.verification_status || 'pending',
    topRated: rating >= 4.5 && reviewCount >= 3,
    verified: artisan.verification_status === 'verified',
    yearsExperience: artisan.years_experience || 0,
  }
}

export function mapArtisanDetail(artisan) {
  if (!artisan) {
    return null
  }

  const summary = mapArtisanRow(artisan)
  const serviceLinks = artisan.service_links || []
  const skills = [
    summary.skill,
    ...serviceLinks
      .map((link) => link.service?.name)
      .filter(Boolean),
  ]

  return {
    ...summary,
    avatarUrl: artisan.profile?.avatar_url || '',
    country: artisan.country || 'Nigeria',
    email: artisan.profile?.email || '',
    fullName: artisan.profile?.full_name || summary.name,
    phone: artisan.profile?.phone || '',
    primaryService: artisan.primary_service || null,
    skills: [...new Set(skills.filter(Boolean))],
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
      profile:profiles!${artisanProfileRelation}(id, full_name, email, avatar_url, city, state),
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

export async function getArtisanById(artisanId) {
  if (!artisanId) {
    return {
      data: null,
      error: null,
    }
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('artisans')
    .select(`
      *,
      profile:profiles!${artisanProfileRelation}(id, full_name, email, phone, avatar_url, city, state),
      primary_service:services!${artisanPrimaryServiceRelation}(id, name, category, icon),
      service_links:artisan_services!${artisanServicesArtisanRelation}(
        service_id,
        price_from,
        service:services!${artisanServicesServiceRelation}(id, name, category, icon)
      )
    `)
    .eq('id', artisanId)
    .maybeSingle()

  return {
    data: mapArtisanDetail(data),
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
      profile:profiles!${artisanProfileRelation}(id, full_name, email, phone, avatar_url, city, state),
      primary_service:services!${artisanPrimaryServiceRelation}(id, name, category, icon),
      service_links:artisan_services!${artisanServicesArtisanRelation}(
        service_id,
        price_from,
        service:services!${artisanServicesServiceRelation}(id, name, category, icon)
      )
    `)
    .eq('profile_id', profileId)
    .maybeSingle()

  return {
    data: mapArtisanDetail(data),
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
