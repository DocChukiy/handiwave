import { getSupabaseClient } from '../lib/supabaseClient.js'
import { getArtisanByProfileId } from './artisanService.js'
import { createNotificationSafely } from './notificationService.js'

const conversationBookingRelation = 'conversations_booking_id_fkey'
const conversationCustomerRelation = 'conversations_customer_id_fkey'
const conversationArtisanRelation = 'conversations_artisan_id_fkey'
const bookingServiceRelation = 'bookings_service_id_fkey'
const artisanProfileRelation = 'artisans_profile_id_fkey'

const conversationSelect = `
  *,
  booking:bookings!${conversationBookingRelation}(
    id,
    status,
    service:services!${bookingServiceRelation}(id, name, category, icon)
  ),
  customer:profiles!${conversationCustomerRelation}(id, full_name, email, avatar_url),
  artisan:artisans!${conversationArtisanRelation}(
    id,
    business_name,
    profile_id,
    profile:profiles!${artisanProfileRelation}(id, full_name, email, avatar_url)
  )
`

function formatTime(value) {
  if (!value) {
    return 'No messages yet'
  }

  return new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  }).format(new Date(value))
}

function getOtherPerson(conversation, user) {
  if (user?.role === 'artisan') {
    return conversation.customer?.full_name || conversation.customer?.email || 'Customer'
  }

  return (
    conversation.artisan?.profile?.full_name ||
    conversation.artisan?.business_name ||
    'Handiwave artisan'
  )
}

function mapMessageRow(message) {
  return {
    body: message.body,
    conversationId: message.conversation_id,
    createdAt: message.created_at,
    id: message.id,
    readAt: message.read_at || '',
    senderId: message.sender_id,
  }
}

function mapConversationRow(conversation, user, lastMessage, unreadCount = 0) {
  const lastMessageTime = lastMessage?.created_at ||
    conversation.last_message_at ||
    conversation.created_at

  return {
    artisanId: conversation.artisan_id,
    bookingId: conversation.booking_id,
    bookingStatus: conversation.booking?.status || 'pending',
    customerId: conversation.customer_id,
    id: conversation.id,
    lastMessageAt: lastMessageTime,
    lastMessagePreview: lastMessage?.body || 'No messages yet. Start the conversation.',
    lastMessageTime: formatTime(lastMessageTime),
    otherPerson: getOtherPerson(conversation, user),
    service: conversation.booking?.service?.name || 'Handiwave service',
    unreadCount,
  }
}

async function getLatestMessagesForConversations(conversationIds) {
  if (conversationIds.length === 0) {
    return {
      error: null,
      latestByConversation: new Map(),
    }
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, body, read_at, created_at')
    .in('conversation_id', conversationIds)
    .order('created_at', { ascending: false })

  if (error) {
    return {
      error,
      latestByConversation: new Map(),
    }
  }

  const latestByConversation = new Map()
  ;(data || []).forEach((message) => {
    if (!latestByConversation.has(message.conversation_id)) {
      latestByConversation.set(message.conversation_id, message)
    }
  })

  return {
    error: null,
    latestByConversation,
  }
}

async function getUnreadCountsForConversations(conversationIds, userId) {
  if (conversationIds.length === 0) {
    return {
      error: null,
      unreadByConversation: new Map(),
    }
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id')
    .in('conversation_id', conversationIds)
    .neq('sender_id', userId)
    .is('read_at', null)

  if (error) {
    return {
      error,
      unreadByConversation: new Map(),
    }
  }

  const unreadByConversation = new Map()
  ;(data || []).forEach((message) => {
    unreadByConversation.set(
      message.conversation_id,
      (unreadByConversation.get(message.conversation_id) || 0) + 1,
    )
  })

  return {
    error: null,
    unreadByConversation,
  }
}

export async function ensureConversationForBooking({ bookingId, user }) {
  if (!bookingId || !user?.id) {
    return {
      data: null,
      error: new Error('A booking and logged-in user are required to start chat.'),
    }
  }

  const supabase = getSupabaseClient()
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id, customer_id, artisan_id')
    .eq('id', bookingId)
    .maybeSingle()

  if (bookingError) {
    return {
      data: null,
      error: bookingError,
    }
  }

  if (!booking) {
    return {
      data: null,
      error: new Error('Booking not found.'),
    }
  }

  const isCustomer = booking.customer_id === user.id
  let isArtisan = false

  if (user.role === 'artisan') {
    const { data: artisanProfile, error: artisanError } = await getArtisanByProfileId(user.id)

    if (artisanError) {
      return {
        data: null,
        error: artisanError,
      }
    }

    isArtisan = artisanProfile?.id === booking.artisan_id
  }

  if (!isCustomer && !isArtisan) {
    return {
      data: null,
      error: new Error('Only booking participants can open this chat.'),
    }
  }

  const { data: existingConversations, error: existingError } = await supabase
    .from('conversations')
    .select(conversationSelect)
    .eq('booking_id', booking.id)
    .limit(1)

  if (existingError) {
    return {
      data: null,
      error: existingError,
    }
  }

  if (existingConversations?.[0]) {
    return {
      data: mapConversationRow(existingConversations[0], user, null, 0),
      error: null,
    }
  }

  const { data: createdConversation, error: createError } = await supabase
    .from('conversations')
    .insert({
      artisan_id: booking.artisan_id,
      booking_id: booking.id,
      customer_id: booking.customer_id,
    })
    .select(conversationSelect)
    .single()

  return {
    data: createdConversation ? mapConversationRow(createdConversation, user, null, 0) : null,
    error: createError,
  }
}

export async function getConversationsForUser(user) {
  if (!user?.id) {
    return {
      data: [],
      error: new Error('You must be logged in to view messages.'),
    }
  }

  const supabase = getSupabaseClient()
  let query = supabase.from('conversations').select(conversationSelect)

  if (user.role === 'artisan') {
    const { data: artisanProfile, error: artisanError } = await getArtisanByProfileId(user.id)

    if (artisanError) {
      return {
        data: [],
        error: artisanError,
      }
    }

    if (!artisanProfile) {
      return {
        data: [],
        error: null,
      }
    }

    query = query.eq('artisan_id', artisanProfile.id)
  } else {
    query = query.eq('customer_id', user.id)
  }

  const { data, error } = await query.order('last_message_at', {
    ascending: false,
    nullsFirst: false,
  })

  if (error) {
    return {
      data: [],
      error,
    }
  }

  const conversationIds = (data || []).map((conversation) => conversation.id)
  const [
    { error: latestError, latestByConversation },
    { error: unreadError, unreadByConversation },
  ] = await Promise.all([
    getLatestMessagesForConversations(conversationIds),
    getUnreadCountsForConversations(conversationIds, user.id),
  ])

  return {
    data: (data || [])
      .map((conversation) => (
        mapConversationRow(
          conversation,
          user,
          latestByConversation.get(conversation.id),
          unreadByConversation.get(conversation.id) || 0,
        )
      ))
      .sort((first, second) => (
        new Date(second.lastMessageAt || 0).getTime() -
        new Date(first.lastMessageAt || 0).getTime()
      )),
    error: latestError || unreadError,
  }
}

export async function getTotalUnreadMessagesForUser(user) {
  const { data, error } = await getConversationsForUser(user)

  return {
    data: data.reduce((total, conversation) => total + conversation.unreadCount, 0),
    error,
  }
}

export async function getMessagesForConversation(conversationId) {
  if (!conversationId) {
    return {
      data: [],
      error: null,
    }
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, body, read_at, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  return {
    data: (data || []).map(mapMessageRow),
    error,
  }
}

export async function markConversationMessagesRead({ conversationId, userId }) {
  if (!conversationId || !userId) {
    return {
      error: null,
    }
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('messages')
    .update({
      read_at: new Date().toISOString(),
    })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId)
    .is('read_at', null)
    .select('id')

  return {
    count: data?.length || 0,
    error,
  }
}

export async function sendConversationMessage({
  body,
  conversationId,
  senderId,
}) {
  const trimmedBody = body.trim()

  if (!trimmedBody) {
    return {
      data: null,
      error: new Error('Type a message before sending.'),
    }
  }

  const supabase = getSupabaseClient()
  const { data: conversation, error: conversationLookupError } = await supabase
    .from('conversations')
    .select(`
      id,
      booking_id,
      customer_id,
      artisan_id,
      artisan:artisans!${conversationArtisanRelation}(id, profile_id)
    `)
    .eq('id', conversationId)
    .maybeSingle()

  if (conversationLookupError) {
    return {
      data: null,
      error: conversationLookupError,
    }
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      body: trimmedBody,
      conversation_id: conversationId,
      sender_id: senderId,
    })
    .select('id, conversation_id, sender_id, body, read_at, created_at')
    .single()

  if (error) {
    return {
      data: null,
      error,
    }
  }

  const { error: conversationError } = await supabase
    .from('conversations')
    .update({
      last_message_at: new Date().toISOString(),
    })
    .eq('id', conversationId)

  if (conversation) {
    const receiverProfileId = senderId === conversation.customer_id
      ? conversation.artisan?.profile_id
      : conversation.customer_id

    await createNotificationSafely({
      body: trimmedBody.length > 120 ? `${trimmedBody.slice(0, 117)}...` : trimmedBody,
      data: {
        booking_id: conversation.booking_id,
        conversation_id: conversation.id,
      },
      profileId: receiverProfileId,
      title: 'New message',
      type: 'message',
    })
  }

  return {
    data: mapMessageRow(data),
    error: conversationError,
  }
}
