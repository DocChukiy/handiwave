const bookings = [
  { service: 'AC Repair', artisan: 'Musa Usman', date: 'Today, 2:30 PM', status: 'Confirmed' },
  { service: 'Deep Cleaning', artisan: 'Chika Eze', date: 'Tomorrow, 10:00 AM', status: 'Pending' },
  { service: 'Electrical Repairs', artisan: 'Ada Okafor', date: 'Fri, 4:00 PM', status: 'Completed' },
]

function Bookings() {
  return (
    <div className="starter-page">
      <section className="page-hero compact">
        <p className="section-kicker">Bookings</p>
        <h1>Manage your service appointments</h1>
        <p>Track upcoming bookings, chat with artisans, and review completed jobs.</p>
      </section>

      <section className="summary-grid">
        <div><strong>2</strong><span>Upcoming</span></div>
        <div><strong>1</strong><span>Completed</span></div>
        <div><strong>98%</strong><span>Success rate</span></div>
      </section>

      <section className="list-panel">
        {bookings.map((booking) => (
          <article className="list-row" key={`${booking.service}-${booking.date}`}>
            <div>
              <h3>{booking.service}</h3>
              <p>{booking.artisan} • {booking.date}</p>
            </div>
            <span>{booking.status}</span>
          </article>
        ))}
      </section>
    </div>
  )
}

export default Bookings
