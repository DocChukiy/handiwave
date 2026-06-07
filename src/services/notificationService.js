import { getSupabaseClient } from '../lib/supabaseClient.js'

function formatDate(value) {
  if (!value) {
    return 'Just now'
  }

  return new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  }).format(new Date(value))
}

function mapNotificationRow(notification) {
  return {
    body: notification.body || '',
    createdAt: notification.created_at,
    data: notification.data || {},
    id: notification.id,
    isRead: Boolean(notification.read_at),
    readAt: notification.read_at || '',
    time: formatDate(notification.created_at),
    title: notification.title,
    type: notification.type,
  }
}

export async function createNotification({
  body,
  data = {},
  profileId,
  title,
  type = 'system',
}) {
  if (!profileId) {
    return {
      data: null,
      error: new Error('Notification recipient is required.'),
    }
  }

  const supabase = getSupabaseClient()
  const { data: notification, error } = await supabase
    .from('notifications')
    .insert({
      body,
      data,
      profile_id: profileId,
      title,
      type,
    })
    .select('id, profile_id, type, title, body, data, read_at, created_at')
    .single()

  return {
    data: notification ? mapNotificationRow(notification) : null,
    error,
  }
}

export async function createNotificationSafely(payload) {
  const { error } = await createNotification(payload)

  if (error) {
    console.error('[Handiwave notification] insert failed:', error)
  }
}

export async function getNotificationsForUser(userId) {
  if (!userId) {
    return {
      data: [],
      error: new Error('You must be logged in to view notifications.'),
    }
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('notifications')
    .select('id, profile_id, type, title, body, data, read_at, created_at')
    .eq('profile_id', userId)
    .order('created_at', { ascending: false })
    .limit(12)

  return {
    data: (data || []).map(mapNotificationRow),
    error,
  }
}

export async function markNotificationRead(notificationId) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('notifications')
    .update({
      read_at: new Date().toISOString(),
    })
    .eq('id', notificationId)
    .select('id, profile_id, type, title, body, data, read_at, created_at')
    .maybeSingle()

  return {
    data: data ? mapNotificationRow(data) : null,
    error,
  }
}

export async function markMessageNotificationsForConversationRead({ conversationId, userId }) {
  if (!conversationId || !userId) {
    return {
      count: 0,
      error: null,
    }
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('notifications')
    .update({
      read_at: new Date().toISOString(),
    })
    .eq('profile_id', userId)
    .eq('type', 'message')
    .eq('data->>conversation_id', conversationId)
    .is('read_at', null)
    .select('id')

  return {
    count: data?.length || 0,
    error,
  }
}
