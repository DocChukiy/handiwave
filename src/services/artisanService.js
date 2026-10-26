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
  const city = artisan.city || profile.city || ''
  const state = artisan.state || profile.state || ''
  const serviceName = primaryService.name || 'General Service'
  const priceValue = Number(artisan.starting_price) || 0
  const rating = Number(artisan.average_rating) || 0
  const reviewCount = artisan.review_count || 0

  return {
    avatarUrl: profile.avatar_url || '',
    bio: artisan.bio || '',
    businessName: artisan.business_name || '',
    area: city,
    category: primaryService.category || serviceName,
    completedJobs: artisan.completed_jobs || 0,
    createdAt: artisan.created_at || '',
    featuredSkill: serviceName,
    fullLocation: [city, state].filter(Boolean).join(', ') || 'Service area available on request',
    id: artisan.id,
    initials: getInitials(name),
    isAvailable: artisan.is_available !== false,
    jobs: artisan.completed_jobs || 0,
    location: state,
    name,
    price: artisan.starting_price
      ? `From NGN ${priceValue.toLocaleString()}`
      : 'By quote',
    priceValue,
    profileId: artisan.profile_id,
    profileCompletion: artisan.profile_completion || 0,
    raw: artisan,
    rating,
    reviewCount,
    serviceArea: artisan.service_area || '',
    skill: serviceName,
    startingPrice: artisan.starting_price,
    verificationStatus: artisan.verification_status || 'pending',
    verificationReady: Boolean(artisan.verification_ready),
    verificationTier: artisan.verification_tier || 'building',
    workEvidenceCount: artisan.work_evidence_count || 0,
    bidActivityCount: artisan.bid_activity_count || 0,
    topRated: rating >= 4.5 && reviewCount >= 3,
    verified: artisan.verification_status === 'verified',
    yearsExperience: artisan.years_experience || 0,
  }
}

export function mapProfessionalDirectoryRow(professional) {
  const name = professional.full_name || professional.business_name || 'New Handiwave professional'
  const city = professional.city || ''
  const state = professional.state || ''
  const serviceName = professional.primary_service_name || 'Profile setup in progress'
  const verificationStatus = professional.verification_status || 'incomplete'
  const isVerified = verificationStatus === 'verified'

  return {
    avatarUrl: professional.avatar_url || '',
    bio: professional.bio || '',
    bidActivityCount: professional.bid_activity_count || 0,
    businessName: professional.business_name || '',
    area: city,
    canBook: Boolean(professional.artisan_id && isVerified && professional.is_available),
    category: professional.primary_service_category || serviceName,
    completedJobs: professional.completed_jobs || 0,
    createdAt: professional.joined_at || '',
    featuredSkill: serviceName,
    fullLocation: [city, state].filter(Boolean).join(', ') || 'Location being added',
    id: professional.artisan_id || '',
    initials: getInitials(name),
    isAvailable: Boolean(professional.is_available),
    jobs: professional.completed_jobs || 0,
    location: state,
    name,
    price: professional.starting_price
      ? `From NGN ${Number(professional.starting_price).toLocaleString()}`
      : 'Quote after job details',
    priceValue: Number(professional.starting_price) || 0,
    profileCompletion: professional.profile_completion || 0,
    profileId: professional.profile_id,
    rankingScore: Number(professional.ranking_score) || 0,
    rating: Number(professional.average_rating) || 0,
    reviewCount: professional.review_count || 0,
    serviceArea: professional.service_area || '',
    skill: serviceName,
    startingPrice: professional.starting_price,
    topRated: professional.verification_tier === 'trusted' || professional.verification_tier === 'elite',
    verificationReady: Boolean(professional.verification_ready),
    verificationStatus,
    verificationTier: professional.verification_tier || 'building',
    verified: isVerified,
    workEvidenceCount: professional.work_evidence_count || 0,
    yearsExperience: professional.years_experience || 0,
  }
}

export async function getPublicProfessionals() {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('public_professional_directory')
    .select('*')
    .order('ranking_score', { ascending: false })
    .order('joined_at', { ascending: false })

  return {
    data: (data || []).map(mapProfessionalDirectoryRow),
    error,
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
    .order('verified_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

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
  artisanId,
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

  const artisanPayload = {
    bio,
    business_name: businessName,
    city,
    primary_service_id: primaryServiceId,
    profile_id: profileId,
    service_area: serviceArea,
    state,
    starting_price: Number(startingPrice) || null,
    years_experience: Number(yearsExperience) || 0,
  }
  const artisanQuery = artisanId
    ? supabase.from('artisans').update(artisanPayload).eq('id', artisanId)
    : supabase.from('artisans').insert(artisanPayload)

  const { data: artisan, error: artisanError } = await artisanQuery
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
