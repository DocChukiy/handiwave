import { getSupabaseClient } from '../lib/supabaseClient.js'
import { getArtisanByProfileId } from './artisanService.js'

const reelArtisanRelation = 'reels_artisan_id_fkey'
const reelServiceRelation = 'reels_service_id_fkey'
const artisanProfileRelation = 'artisans_profile_id_fkey'
const videoBucket = 'handiwave-reel-videos'
const thumbnailBucket = 'handiwave-reel-thumbnails'

const reelSelect = `
  *,
  artisan:artisans!${reelArtisanRelation}(
    id,
    business_name,
    average_rating,
    review_count,
    verification_status,
    city,
    state,
    profile:profiles!${artisanProfileRelation}(id, full_name, email, avatar_url)
  ),
  service:services!${reelServiceRelation}(id, name, category, icon)
`

function getInitials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function getPublicUrl(bucket, path) {
  if (!path) {
    return ''
  }

  const supabase = getSupabaseClient()
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
}

export function mapReelRow(reel) {
  const artisanName =
    reel.artisan?.business_name ||
    reel.artisan?.profile?.full_name ||
    'Handiwave artisan'
  const videoUrl = reel.video_url || getPublicUrl(videoBucket, reel.video_path)
  const thumbnailUrl = reel.thumbnail_url || getPublicUrl(thumbnailBucket, reel.thumbnail_path)

  return {
    artisan: artisanName,
    artisanId: reel.artisan_id,
    bookingPath: `/bookings?artisan=${reel.artisan_id}`,
    caption: reel.caption || 'Work showcase from a verified Handiwave artisan.',
    category: reel.service?.category || 'Service',
    comments: reel.comments_count || 0,
    id: reel.id,
    initials: getInitials(artisanName),
    likes: reel.likes_count || 0,
    location: [reel.artisan?.city, reel.artisan?.state].filter(Boolean).join(', ') || 'Nigeria',
    profilePath: `/artisan-profile/${reel.artisan_id}`,
    publishedAt: reel.published_at || '',
    rating: Number(reel.artisan?.average_rating) || 0,
    reviewCount: reel.artisan?.review_count || 0,
    service: reel.service?.name || 'Handiwave service',
    serviceId: reel.service_id || '',
    status: reel.status || 'draft',
    thumbnailPath: reel.thumbnail_path || '',
    thumbnailUrl,
    verified: reel.artisan?.verification_status === 'verified',
    videoPath: reel.video_path || '',
    videoUrl,
    views: reel.views_count || 0,
  }
}

export async function getPublishedReels() {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('reels')
    .select(reelSelect)
    .eq('status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false })

  return {
    data: (data || []).map(mapReelRow),
    error,
  }
}

export async function getReelsForArtisanProfile(profileId) {
  const { data: artisan, error: artisanError } = await getArtisanByProfileId(profileId)

  if (artisanError) {
    return {
      data: { artisan: null, reels: [] },
      error: artisanError,
    }
  }

  if (!artisan) {
    return {
      data: { artisan: null, reels: [] },
      error: new Error('Create your artisan profile before managing reels.'),
    }
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('reels')
    .select(reelSelect)
    .eq('artisan_id', artisan.id)
    .order('created_at', { ascending: false })

  return {
    data: {
      artisan,
      reels: (data || []).map(mapReelRow),
    },
    error,
  }
}

async function uploadFile({
  bucket,
  file,
  path,
}) {
  if (!file) {
    return {
      path: '',
      publicUrl: '',
      error: null,
    }
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
    })

  return {
    path: data?.path || path,
    publicUrl: error ? '' : getPublicUrl(bucket, data?.path || path),
    error,
  }
}

export async function createReelUpload({
  artisanId,
  caption,
  profileId,
  serviceId,
  status,
  thumbnailFile,
  videoFile,
}) {
  const supabase = getSupabaseClient()
  const { data: draftReel, error: draftError } = await supabase
    .from('reels')
    .insert({
      artisan_id: artisanId,
      caption: caption.trim() || null,
      published_at: status === 'published' ? new Date().toISOString() : null,
      service_id: serviceId || null,
      status,
    })
    .select('id')
    .single()

  if (draftError) {
    return {
      data: null,
      error: draftError,
    }
  }

  const fileSafeTimestamp = Date.now()
  const videoExtension = videoFile.name.split('.').pop() || 'mp4'
  const videoPath = `${profileId}/${draftReel.id}/video-${fileSafeTimestamp}.${videoExtension}`
  const videoResult = await uploadFile({
    bucket: videoBucket,
    file: videoFile,
    path: videoPath,
  })

  if (videoResult.error) {
    return {
      data: null,
      error: videoResult.error,
    }
  }

  let thumbnailResult = {
    path: '',
    publicUrl: '',
    error: null,
  }

  if (thumbnailFile) {
    const thumbnailExtension = thumbnailFile.name.split('.').pop() || 'jpg'
    thumbnailResult = await uploadFile({
      bucket: thumbnailBucket,
      file: thumbnailFile,
      path: `${profileId}/${draftReel.id}/thumbnail-${fileSafeTimestamp}.${thumbnailExtension}`,
    })

    if (thumbnailResult.error) {
      return {
        data: null,
        error: thumbnailResult.error,
      }
    }
  }

  const { data, error } = await supabase
    .from('reels')
    .update({
      thumbnail_path: thumbnailResult.path || null,
      thumbnail_url: thumbnailResult.publicUrl || null,
      video_path: videoResult.path,
      video_url: videoResult.publicUrl,
    })
    .eq('id', draftReel.id)
    .select(reelSelect)
    .single()

  return {
    data: data ? mapReelRow(data) : null,
    error,
  }
}

export async function updateReelDetails({
  caption,
  reelId,
  serviceId,
  status,
}) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('reels')
    .update({
      caption: caption.trim() || null,
      published_at: status === 'published' ? new Date().toISOString() : null,
      service_id: serviceId || null,
      status,
    })
    .eq('id', reelId)
    .select(reelSelect)
    .single()

  return {
    data: data ? mapReelRow(data) : null,
    error,
  }
}

export async function deleteReel(reel) {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from('reels')
    .delete()
    .eq('id', reel.id)

  if (error) {
    return { error }
  }

  if (reel.videoPath) {
    await supabase.storage.from(videoBucket).remove([reel.videoPath])
  }

  if (reel.thumbnailPath) {
    await supabase.storage.from(thumbnailBucket).remove([reel.thumbnailPath])
  }

  return { error: null }
}
