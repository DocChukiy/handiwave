import { Link } from 'react-router-dom'

const artisans = [
  { name: 'Ada Okafor', skill: 'Electrician', rating: '4.9', jobs: 186, area: 'Lekki', price: 'From NGN 7,500' },
  { name: 'Musa Usman', skill: 'AC Repair', rating: '4.8', jobs: 142, area: 'Wuse', price: 'From NGN 8,500' },
  { name: 'Chika Eze', skill: 'Cleaner', rating: '5.0', jobs: 211, area: 'Port Harcourt', price: 'From NGN 12,000' },
  { name: 'Bayo Ibrahim', skill: 'Plumber', rating: '4.7', jobs: 128, area: 'Yaba', price: 'From NGN 6,000' },
  { name: 'Joy Nwosu', skill: 'Hair Stylist', rating: '4.9', jobs: 97, area: 'Surulere', price: 'From NGN 5,000' },
  { name: 'Femi Lawal', skill: 'Painter', rating: '4.8', jobs: 118, area: 'Ibadan', price: 'From NGN 25,000' },
]

function Artisans() {
  return (
    <div className="starter-page">
      <section className="page-hero compact">
        <p className="section-kicker">Verified artisans</p>
        <h1>Find skilled professionals near you</h1>
        <p>Browse trusted Handiwave artisans with ratings, completed jobs, and local availability.</p>
      </section>

      <section className="toolbar-card">
        <input placeholder="Search by skill, name, or location" />
        <button type="button">Search</button>
      </section>

      <section className="starter-grid four">
        {artisans.map((artisan) => (
          <article className="person-card" key={artisan.name}>
            <div className="person-avatar">{artisan.name.split(' ').map((part) => part[0]).join('')}</div>
            <span className="verified-badge">Verified</span>
            <h3>{artisan.name}</h3>
            <p>{artisan.skill} in {artisan.area}</p>
            <strong className="price-note">{artisan.price}</strong>
            <div className="mini-metrics">
              <span><strong>{artisan.rating}</strong> Rating</span>
              <span><strong>{artisan.jobs}</strong> Jobs</span>
            </div>
            <div className="person-actions">
              <Link className="service-book-link" to="/artisan-profile">View Profile</Link>
              <Link className="secondary-mini-link" to="/bookings">Book Now</Link>
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}

export default Artisans
