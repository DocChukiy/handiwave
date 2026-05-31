import EmptyState from '../components/EmptyState.jsx'
import RoleNotice from '../components/RoleNotice.jsx'
import { archivedMessages, chats } from '../data/bookings.js'

function Messages() {
  return (
    <div className="starter-page">
      <section className="page-hero compact">
        <p className="section-kicker">Messages</p>
        <h1>Chat safely before and during bookings</h1>
        <p>Keep service details, quotes, and arrival updates in one trusted inbox.</p>
      </section>

      <RoleNotice />

      <section className="messages-layout">
        <div className="list-panel">
          {chats.map((chat) => (
            <article className="list-row" key={chat.name}>
              <div><h3>{chat.name}</h3><p>{chat.message}</p></div>
              <span>{chat.time}</span>
            </article>
          ))}

          {archivedMessages.length === 0 && (
            <EmptyState compact title="No archived messages">
              Older conversations will stay here when you archive them.
            </EmptyState>
          )}
        </div>
        <div className="chat-preview-card">
          <h3>Ada Okafor</h3>
          <p className="chat-bubble">Thanks for booking. I will inspect the sockets first, then share the final cost before repair.</p>
          <div><input placeholder="Type a message..." /><button type="button">Send</button></div>
        </div>
      </section>
    </div>
  )
}

export default Messages
