import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import EmptyState from '../components/EmptyState.jsx'
import RoleNotice from '../components/RoleNotice.jsx'
import SkeletonPreview from '../components/Skeletons.jsx'
import {
  ensureConversationForBooking,
  getConversationsForUser,
  getMessagesForConversation,
  markConversationMessagesRead,
  sendConversationMessage,
} from '../services/messageService.js'
import { markMessageNotificationsForConversationRead } from '../services/notificationService.js'
import { showToast } from '../utils/toast.js'

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
  const [searchParams, setSearchParams] = useSearchParams()
  const bookingId = searchParams.get('booking')
  const conversationIdParam = searchParams.get('conversation')
  const [activeConversationId, setActiveConversationId] = useState('')
  const [conversations, setConversations] = useState([])
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

  const refreshConversations = useCallback(async (nextActiveConversationId = activeConversationId) => {
    const { data, error: conversationError } = await getConversationsForUser(user)

    if (conversationError) {
      setError(getErrorMessage(conversationError))
      return false
    }

    setConversations(data)

    if (!nextActiveConversationId && data[0]?.id) {
      setActiveConversationId(data[0].id)
    }

    return true
  }, [activeConversationId, user])

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
            : data[0]?.id || '')

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

        const { data: beforeConversations, error: beforeConversationError } =
          await getConversationsForUser(user)

        if (beforeConversationError) {
          setError(getErrorMessage(beforeConversationError))
          return
        }

        const unreadBeforeOpening = beforeConversations.find((conversation) => (
          conversation.id === activeConversationId
        ))?.unreadCount || 0

        console.log('[Handiwave unread debug] unread count before opening:', {
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

        console.log('[Handiwave unread debug] messages marked as read:', {
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

        console.log('[Handiwave unread debug] message notifications marked read:', {
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

        console.log('[Handiwave unread debug] unread count after opening:', {
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
  }, [activeConversationId, user])

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
        setError('Supabase did not confirm the message was sent.')
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
      await refreshConversations(activeConversationId)
      window.dispatchEvent(new CustomEvent('handiwave-awareness-refresh'))
      showToast('Message sent.')
    } catch (sendError) {
      setError(getErrorMessage(sendError))
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="starter-page">
      <section className="page-hero compact">
        <p className="section-kicker">Messages</p>
        <h1>Chat safely before and during bookings</h1>
        <p>Keep service details, quotes, and arrival updates in one trusted inbox.</p>
      </section>

      <RoleNotice />

      {error && <p className="auth-error page-error">{error}</p>}

      <section className="messages-layout">
        <div className="list-panel conversation-list-panel">
          <div className="booking-history-header">
            <p className="section-kicker">Inbox</p>
            <h2>Booking conversations</h2>
          </div>

          {isLoading ? (
            <SkeletonPreview count={4} label="Loading conversations" type="service" />
          ) : conversations.length > 0 ? (
            conversations.map((conversation) => (
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
                onClick={() => setActiveConversationId(conversation.id)}
              >
                <div>
                  <strong>{conversation.otherPerson}</strong>
                  <span className={conversation.otherPersonOnline ? 'presence-label online' : 'presence-label'}>
                    {conversation.otherPersonPresence}
                  </span>
                  <p>{conversation.lastMessagePreview}</p>
                  <small>{conversation.service} • {conversation.bookingStatus.replaceAll('_', ' ')}</small>
                </div>
                <span>{conversation.lastMessageTime}</span>
                {conversation.unreadCount > 0 && (
                  <strong className="unread-count-bubble">{conversation.unreadCount}</strong>
                )}
              </button>
            ))
          ) : (
            <EmptyState compact title="No conversations yet">
              Chats will appear after a customer creates a booking request.
            </EmptyState>
          )}
        </div>

        <div className="chat-preview-card real-chat-card">
          {activeConversation ? (
            <>
              <div className="chat-header">
                <div>
                  <p className="section-kicker">{activeConversation.service}</p>
                  <h3>{activeConversation.otherPerson}</h3>
                  <span className={activeConversation.otherPersonOnline ? 'presence-label online' : 'presence-label'}>
                    {activeConversation.otherPersonPresence}
                  </span>
                </div>
                <div className="chat-header-meta">
                  <span className={`booking-status status-${activeConversation.bookingStatus}`}>
                    {activeConversation.bookingStatus.replaceAll('_', ' ')}
                  </span>
                  <small>{activeConversation.service}</small>
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
                <input
                  disabled={isSending}
                  placeholder="Type a message..."
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                />
                <button disabled={isSending} type="submit">
                  {isSending ? 'Sending...' : 'Send'}
                </button>
              </form>
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
