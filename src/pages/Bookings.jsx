import EmptyState from '../components/EmptyState.jsx'
import RoleNotice from '../components/RoleNotice.jsx'
import { bookings, pastBookings } from '../data/bookings.js'
import { showToast } from '../utils/toast.js'

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

      <RoleNotice />

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
          <button
            type="button"
            onClick={() => showToast('Booking request sent successfully.')}
          >
            Confirm Booking
          </button>
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

          {pastBookings.length === 0 && (
            <EmptyState compact title="No past bookings yet">
              Your completed service history will appear here after your first job.
            </EmptyState>
          )}
        </div>
      </section>
    </div>
  )
}

export default Bookings
