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
        <h1>Book a trusted artisan</h1>
        <p>Choose a service, share your location, and confirm appointment details before work begins.</p>
      </section>

      <section className="summary-grid">
        <div><strong>2</strong><span>Upcoming</span></div>
        <div><strong>1</strong><span>Completed</span></div>
        <div><strong>98%</strong><span>Success rate</span></div>
      </section>

      <section className="booking-layout">
        <form className="booking-form">
          <h2>Service details</h2>
          <label>Service type
            <select defaultValue="Electrical Repairs">
              <option>Electrical Repairs</option>
              <option>AC Repair</option>
              <option>Deep Cleaning</option>
              <option>Plumbing Service</option>
            </select>
          </label>
          <label>Preferred artisan
            <select defaultValue="Ada Okafor">
              <option>Ada Okafor</option>
              <option>Musa Usman</option>
              <option>Chika Eze</option>
              <option>Bayo Ibrahim</option>
            </select>
          </label>
          <label>Location
            <input placeholder="Lekki Phase 1, Lagos" />
          </label>
          <div className="form-split">
            <label>Date<input type="date" /></label>
            <label>Time<input type="time" /></label>
          </div>
          <label>Notes
            <textarea placeholder="Describe the issue or service needed" />
          </label>
          <button type="button">Confirm Booking</button>
        </form>

        <div className="list-panel">
          {bookings.map((booking) => (
            <article className="list-row" key={`${booking.service}-${booking.date}`}>
              <div>
                <h3>{booking.service}</h3>
                <p>{booking.artisan} • {booking.date}</p>
              </div>
              <span>{booking.status}</span>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

export default Bookings
