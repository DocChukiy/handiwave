import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import EmptyState from '../components/EmptyState.jsx'
import RoleNotice from '../components/RoleNotice.jsx'
import SkeletonPreview from '../components/Skeletons.jsx'
import logger from '../utils/logger.js'
import {
  ensureConversationForBooking,
  getConversationsForUser,
  getMessagesForConversation,
  markConversationMessagesRead,
  sendConversationMessage,
} from '../services/messageService.js'
import { markMessageNotificationsForConversationRead } from '../services/notificationService.js'
import { showToast } from '../utils/toast.js'
import { getSupabaseClient } from '../lib/supabaseClient.js'

const bookingStatusLabels = {
  artisan_completed: 'Confirm completed work',
  cancelled: 'Cancelled',
  completed: 'Completed',
  confirmed: 'Booking confirmed',
  customer_confirmed: 'Work confirmed',
  disputed: 'Support reviewing issue',
  in_progress: 'Work in progress',
  pending: 'Awaiting professional',
  reschedule_requested: 'New time proposed',
}

function getBookingStatusLabel(status) {
  return bookingStatusLabels[status] || status?.replaceAll('_', ' ') || 'Booking update'
}

function getErrorMessage(error) {
  return [
    error.message,
    error.details,
    error.hint,
    error.code,
  ].filter(Boolean).join(' ')
}

function Messages() {
  const { user } = useAuth()
  const isAdmin = user.role === 'admin'
  const [searchParams, setSearchParams] = useSearchParams()
  const bookingId = searchParams.get('booking')
  const conversationIdParam = searchParams.get('conversation')
  const [activeConversationId, setActiveConversationId] = useState('')
  const [conversations, setConversations] = useState([])
  const [conversationSearch, setConversationSearch] = useState('')
  const [error, setError] = useState('')
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isMessagesLoading, setIsMessagesLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [messages, setMessages] = useState([])
  const chatEndRef = useRef(null)

  const activeConversation = useMemo(() => (
    conversations.find((conversation) => conversation.id === activeConversationId) || null
  ), [activeConversationId, conversations])
  const filteredConversations = useMemo(() => {
    const query = conversationSearch.trim().toLowerCase()
    if (!query) return conversations

    return conversations.filter((conversation) => (
      [conversation.otherPerson, conversation.service, conversation.lastMessagePreview]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query)
    ))
  }, [conversationSearch, conversations])
  const conversationIds = useMemo(
    () => conversations.map((conversation) => conversation.id).sort().join(','),
    [conversations],
  )

  const refreshConversations = useCallback(async () => {
    const { data, error: conversationError } = await getConversationsForUser(user)

    if (conversationError) {
      setError(getErrorMessage(conversationError))
      return false
    }

    setConversations(data)

    return true
  }, [user])

  useEffect(() => {
    let isMounted = true

    async function loadConversations() {
      setError('')
      setIsLoading(true)

      try {
        let requestedConversationId = ''

        if (bookingId) {
          const { data: conversation, error: ensureError } = await ensureConversationForBooking({
            bookingId,
            user,
          })

          if (ensureError) {
            setError(getErrorMessage(ensureError))
          } else {
            requestedConversationId = conversation?.id || ''
          }
        }

        const { data, error: conversationError } = await getConversationsForUser(user)

        if (!isMounted) {
          return
        }

        if (conversationError) {
          setError(getErrorMessage(conversationError))
          return
        }

        const nextActiveConversationId = requestedConversationId ||
          (data.some((conversation) => conversation.id === conversationIdParam)
            ? conversationIdParam
            : '')

        setConversations(data)
        setActiveConversationId(nextActiveConversationId)

        if (bookingId && requestedConversationId) {
          setSearchParams({ conversation: requestedConversationId }, { replace: true })
        }
      } catch (loadError) {
        if (isMounted) {
          setError(getErrorMessage(loadError))
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadConversations()

    return () => {
      isMounted = false
    }
  }, [bookingId, conversationIdParam, setSearchParams, user])

  useEffect(() => {
    let isMounted = true

    async function loadMessages() {
      if (!activeConversationId) {
        setMessages([])
        return
      }

      setError('')
      setIsMessagesLoading(true)

      try {
        const { data, error: messageError } =
          await getMessagesForConversation(activeConversationId)

        if (!isMounted) {
          return
        }

        if (messageError) {
          setError(getErrorMessage(messageError))
          return
        }

        setMessages(data)

        if (isAdmin) {
          return
        }

        const { data: beforeConversations, error: beforeConversationError } =
          await getConversationsForUser(user)

        if (beforeConversationError) {
          setError(getErrorMessage(beforeConversationError))
          return
        }

        const unreadBeforeOpening = beforeConversations.find((conversation) => (
          conversation.id === activeConversationId
        ))?.unreadCount || 0

        logger.debug('[Handiwave unread debug] unread count before opening:', {
          conversationId: activeConversationId,
          unreadCount: unreadBeforeOpening,
        })

        const { count: markedReadCount, error: readError } = await markConversationMessagesRead({
          conversationId: activeConversationId,
          userId: user.id,
        })

        if (readError) {
          setError(getErrorMessage(readError))
          return
        }

        logger.debug('[Handiwave unread debug] messages marked as read:', {
          conversationId: activeConversationId,
          markedReadCount,
        })

        const { count: notificationReadCount, error: notificationReadError } =
          await markMessageNotificationsForConversationRead({
            conversationId: activeConversationId,
            userId: user.id,
          })

        if (notificationReadError) {
          setError(getErrorMessage(notificationReadError))
          return
        }

        logger.debug('[Handiwave unread debug] message notifications marked read:', {
          conversationId: activeConversationId,
          notificationReadCount,
        })

        const { data: refreshedConversations, error: refreshedConversationError } =
          await getConversationsForUser(user)

        if (refreshedConversationError) {
          setError(getErrorMessage(refreshedConversationError))
          return
        }

        if (!isMounted) {
          return
        }

        setConversations(refreshedConversations)

        const unreadAfterOpening = refreshedConversations.find((conversation) => (
          conversation.id === activeConversationId
        ))?.unreadCount || 0

        logger.debug('[Handiwave unread debug] unread count after opening:', {
          conversationId: activeConversationId,
          unreadCount: unreadAfterOpening,
        })

        window.dispatchEvent(new CustomEvent('handiwave-awareness-refresh'))
      } catch (messageError) {
        if (isMounted) {
          setError(getErrorMessage(messageError))
        }
      } finally {
        if (isMounted) {
          setIsMessagesLoading(false)
        }
      }
    }

    loadMessages()

    return () => {
      isMounted = false
    }
  }, [activeConversationId, isAdmin, user])

  useEffect(() => {
    if (!conversationIds) return undefined

    const supabase = getSupabaseClient()
    const channel = supabase.channel(`message-inbox-${user.id}`)

    conversationIds.split(',').forEach((conversationId) => {
      channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          filter: `conversation_id=eq.${conversationId}`,
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          await refreshConversations()

          if (conversationId !== activeConversationId) return

          const { data, error: messageError } = await getMessagesForConversation(activeConversationId)
          if (messageError) {
            setError(getErrorMessage(messageError))
            return
          }

          setMessages(data)

          if (!isAdmin && payload.new.sender_id !== user.id) {
            await Promise.all([
              markConversationMessagesRead({ conversationId, userId: user.id }),
              markMessageNotificationsForConversationRead({ conversationId, userId: user.id }),
            ])
            window.dispatchEvent(new CustomEvent('handiwave-awareness-refresh'))
          }
        },
      )
    })

    channel.subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeConversationId, conversationIds, isAdmin, refreshConversations, user.id])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [activeConversationId, messages])

  async function handleSendMessage(event) {
    event.preventDefault()

    if (!activeConversationId) {
      setError('Choose a conversation before sending a message.')
      return
    }

    setError('')
    setIsSending(true)

    try {
      const { data, error: sendError } = await sendConversationMessage({
        body: input,
        conversationId: activeConversationId,
        senderId: user.id,
      })

      if (sendError) {
        setError(getErrorMessage(sendError))
        return
      }

      if (!data?.id) {
        setError('Your message could not be confirmed. Please try again.')
        return
      }

      setInput('')
      const { data: refreshedMessages, error: messageError } =
        await getMessagesForConversation(activeConversationId)

      if (messageError) {
        setError(getErrorMessage(messageError))
        return
      }

      setMessages(refreshedMessages)
      await refreshConversations()
      window.dispatchEvent(new CustomEvent('handiwave-awareness-refresh'))
      showToast('Message sent.')
    } catch (sendError) {
      setError(getErrorMessage(sendError))
    } finally {
      setIsSending(false)
    }
  }

  function handleConversationSelect(conversationId) {
    setActiveConversationId(conversationId)
    setSearchParams({ conversation: conversationId })
  }

  function handleBackToInbox() {
    setActiveConversationId('')
    setSearchParams({})
  }

  return (
    <div className="starter-page">
      <section className="page-hero compact">
        <p className="section-kicker">{isAdmin ? 'Support inbox' : 'Messages'}</p>
        <h1>{isAdmin ? 'Oversee and support booking conversations' : 'Chat safely before and during bookings'}</h1>
        <p>{isAdmin ? 'Review active conversations and step in when a customer or professional needs platform support.' : 'Keep service details, quotes, and arrival updates in one trusted inbox.'}</p>
        {!isAdmin && (
          <div className="message-safety-note">
            Keep payment and job agreements inside Handiwave. Never share passwords, PINs, or verification codes.
          </div>
        )}
      </section>

      <RoleNotice />

      {error && <p className="auth-error page-error">{error}</p>}

      <section className={`messages-layout ${activeConversation ? 'has-active-conversation' : ''}`}>
        <div className="list-panel conversation-list-panel">
          <div className="booking-history-header">
            <p className="section-kicker">Inbox</p>
            <h2>{isAdmin ? 'Platform conversations' : 'Booking conversations'}</h2>
          </div>

          {conversations.length > 0 && (
            <div className="conversation-search">
              <input
                aria-label="Search conversations"
                placeholder="Search by professional or service"
                type="search"
                value={conversationSearch}
                onChange={(event) => setConversationSearch(event.target.value)}
              />
            </div>
          )}

          {isLoading ? (
            <SkeletonPreview count={4} label="Loading conversations" type="service" />
          ) : filteredConversations.length > 0 ? (
            filteredConversations.map((conversation) => (
              <button
                className={
                  [
                    'conversation-list-item',
                    activeConversationId === conversation.id ? 'active' : '',
                    conversation.unreadCount > 0 ? 'unread' : '',
                  ].filter(Boolean).join(' ')
                }
                key={conversation.id}
                type="button"
                onClick={() => handleConversationSelect(conversation.id)}
              >
                <div>
                  <strong>{conversation.otherPerson}</strong>
                  <span className={conversation.otherPersonOnline ? 'presence-label online' : 'presence-label'}>
                    {conversation.otherPersonPresence}
                  </span>
                  <p>{conversation.lastMessagePreview}</p>
                  <small>{conversation.service} • {getBookingStatusLabel(conversation.bookingStatus)}</small>
                </div>
                <span>{conversation.lastMessageTime}</span>
                {conversation.unreadCount > 0 && (
                  <strong className="unread-count-bubble">{conversation.unreadCount}</strong>
                )}
              </button>
            ))
          ) : conversations.length > 0 ? (
            <EmptyState compact title="No matching conversations">
              Try another professional, service, or message keyword.
            </EmptyState>
          ) : (
            <EmptyState
              action={<Link className="hw-btn hw-btn-primary" to="/requests">Post a service request</Link>}
              compact
              title="No conversations yet"
            >
              A private chat opens after you book a professional or choose an offer.
            </EmptyState>
          )}
        </div>

        <div className="chat-preview-card real-chat-card">
          {activeConversation ? (
            <>
              <div className="chat-header">
                <div>
                  <button className="chat-back-button" type="button" onClick={handleBackToInbox}>← Inbox</button>
                  <p className="section-kicker">{activeConversation.service}</p>
                  <h3>{activeConversation.otherPerson}</h3>
                  <span className={activeConversation.otherPersonOnline ? 'presence-label online' : 'presence-label'}>
                    {activeConversation.otherPersonPresence}
                  </span>
                </div>
                <div className="chat-header-meta">
                  <span className={`booking-status status-${activeConversation.bookingStatus}`}>
                    {getBookingStatusLabel(activeConversation.bookingStatus)}
                  </span>
                  <small>Booking conversation</small>
                </div>
              </div>

              <div className="chat-thread">
                {isMessagesLoading ? (
                  <SkeletonPreview count={3} label="Loading messages" type="service" />
                ) : messages.length > 0 ? (
                  messages.map((message) => (
                    <article
                      className={message.senderId === user.id ? 'chat-bubble own' : 'chat-bubble'}
                      key={message.id}
                    >
                      <p>{message.body}</p>
                      <small>
                        <span>{message.createdTime}</span>
                        {message.senderId === user.id && (
                          <span>{message.readAt ? 'Read' : 'Sent'}</span>
                        )}
                      </small>
                    </article>
                  ))
                ) : (
                  <EmptyState compact title="No messages yet">
                    Send the first message to agree on timing, cost, or service details.
                  </EmptyState>
                )}
                <div ref={chatEndRef} />
              </div>

              <form className="message-compose" onSubmit={handleSendMessage}>
                <textarea
                  disabled={isSending}
                  maxLength={2000}
                  placeholder={isAdmin ? 'Send a Handiwave support message...' : 'Write a message about this booking...'}
                  rows={2}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                />
                <button disabled={isSending || !input.trim()} type="submit">
                  {isSending ? 'Sending...' : 'Send'}
                </button>
              </form>
              {!isAdmin && (
                <p className="message-support-link">
                  Need Handiwave support? <Link to="/bookings">Open the booking and report an issue.</Link>
                </p>
              )}
            </>
          ) : (
            <EmptyState compact title="Choose a conversation">
              Select a booking conversation to view messages.
            </EmptyState>
          )}
        </div>
      </section>
    </div>
  )
}

export default Messages
