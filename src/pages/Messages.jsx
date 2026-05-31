const chats = [
  { name: 'Ada Okafor', message: 'I can arrive by 4 PM today.', time: '2 min' },
  { name: 'Chika Eze', message: 'Please share apartment access details.', time: '18 min' },
  { name: 'Support', message: 'Your payment is protected in escrow.', time: '1 hr' },
]

function Messages() {
  return (
    <div className="starter-page">
      <section className="page-hero compact">
        <p className="section-kicker">Messages</p>
        <h1>Chat safely before and during bookings</h1>
        <p>Keep service details, quotes, and arrival updates in one trusted inbox.</p>
      </section>

      <section className="messages-layout">
        <div className="list-panel">
          {chats.map((chat) => (
            <article className="list-row" key={chat.name}>
              <div><h3>{chat.name}</h3><p>{chat.message}</p></div>
              <span>{chat.time}</span>
            </article>
          ))}
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
