import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

const skills = [
  'Electrical wiring',
  'Smart lighting',
  'Inverter setup',
  'Fault diagnosis',
  'Safety inspection',
]

const portfolio = [
  {
    title: 'Lekki apartment lighting',
    detail: 'Installed recessed LEDs and smart switches',
  },
  {
    title: 'Victoria Island office repair',
    detail: 'Resolved power trips and upgraded sockets',
  },
  {
    title: 'Ikoyi inverter setup',
    detail: 'Connected inverter backup for key appliances',
  },
]

const reviews = [
  {
    name: 'Tomi A.',
    rating: '5.0',
    stars: '★★★★★',
    date: 'May 18, 2026',
    initials: 'TA',
    comment:
      'Ada was punctual, professional, and explained every issue before fixing it.',
  },
  {
    name: 'Damilola K.',
    rating: '4.9',
    stars: '★★★★★',
    date: 'May 10, 2026',
    initials: 'DK',
    comment:
      'Very neat work. The lighting upgrade changed the whole feel of my living room.',
  },
  {
    name: 'Mrs. Eze',
    rating: '5.0',
    stars: '★★★★★',
    date: 'April 28, 2026',
    initials: 'ME',
    comment:
      'I felt safe booking through Handiwave. The job was done quickly and cleanly.',
  },
]

function showToast(message) {
  window.dispatchEvent(new CustomEvent('handiwave-toast', { detail: message }))
}

function ArtisanProfile() {
  return (
    <div className="artisan-profile-page">
      <motion.section
        className="profile-hero-card"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className="profile-image-card">
          <div className="large-profile-image">AO</div>
          <div className="profile-badge-stack">
            <span className="profile-verified-badge">Verified artisan</span>
            <span className="top-rated-badge">Top Rated</span>
          </div>
        </div>

        <div className="profile-summary">
          <p className="section-kicker">Premium electrician</p>
          <h1>Ada Okafor</h1>
          <p>
            Certified electrician based in Lekki, Lagos. Trusted for clean
            wiring, lighting upgrades, inverter setup, and fast fault diagnosis.
          </p>

          <div className="profile-stats">
            <span>
              <strong>4.9</strong>
              Average rating
            </span>
            <span>
              <strong>186</strong>
              Completed jobs
            </span>
            <span>
              <strong>6 yrs</strong>
              Experience
            </span>
          </div>

          <div className="safety-strip">
            <span>ID checked</span>
            <span>Skills verified</span>
            <span>Escrow protected</span>
          </div>

          <div className="profile-actions">
            <Link className="primary-cta" to="/bookings">
              Book Now
            </Link>
            <Link className="secondary-cta" to="/messages">
              Chat
            </Link>
          </div>
        </div>

        <aside className="pricing-card">
          <span>Pricing estimate</span>
          <strong>NGN 7,500 - NGN 45,000</strong>
          <p>Final pricing depends on service type, location, and materials.</p>
        </aside>
      </motion.section>

      <section className="profile-content-grid">
        <motion.article
          className="profile-panel about-panel"
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
        >
          <p className="section-kicker">About</p>
          <h2>Reliable electrical support for homes and offices</h2>
          <p>
            Ada handles residential and commercial electrical requests with a
            strong focus on safety, neat finishing, and clear communication.
            Every booking includes upfront diagnosis, agreed pricing, and
            post-service support.
          </p>
        </motion.article>

        <motion.article
          className="profile-panel skills-panel"
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
        >
          <p className="section-kicker">Skills</p>
          <div className="skills-list">
            {skills.map((skill) => (
              <span key={skill}>{skill}</span>
            ))}
          </div>
        </motion.article>
      </section>

      <section className="portfolio-section">
        <div className="services-section-header">
          <div>
            <p className="section-kicker">Portfolio</p>
            <h2>Recent work</h2>
          </div>
          <span>3 projects</span>
        </div>

        <div className="portfolio-grid">
          {portfolio.map((item) => (
            <motion.article
              className="portfolio-card"
              key={item.title}
              whileHover={{ y: -8, scale: 1.01 }}
            >
              <div className="portfolio-image-placeholder">HW</div>
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="reviews-section">
        <div className="services-section-header">
          <div>
            <p className="section-kicker">Customer reviews</p>
            <h2>What customers say</h2>
          </div>
          <span>4.9 average • 186 jobs</span>
        </div>

        <div className="rating-summary-card">
          <div>
            <strong>4.9</strong>
            <span>★★★★★</span>
          </div>
          <p>
            Based on recent verified bookings. Customers highlight punctuality,
            clean finishing, and transparent pricing.
          </p>
          <button
            className="review-submit-button"
            type="button"
            onClick={() => showToast('Review submitted successfully.')}
          >
            Submit review
          </button>
        </div>

        <div className="loading-preview review-loading-preview" aria-label="Review loading placeholder">
          <div className="skeleton-card review-skeleton">
            <span className="skeleton-avatar"></span>
            <span className="skeleton-line wide"></span>
            <span className="skeleton-line"></span>
            <span className="skeleton-line short"></span>
          </div>
        </div>

        <div className="reviews-grid">
          {reviews.map((review) => (
            <motion.article
              className="review-card"
              key={review.name}
              whileHover={{ y: -6 }}
            >
              <div className="review-header">
                <div className="review-avatar">{review.initials}</div>
                <div>
                  <strong>{review.name}</strong>
                  <small>{review.date}</small>
                </div>
                <span>{review.rating}</span>
              </div>
              <div className="review-stars">{review.stars}</div>
              <p>{review.comment}</p>
            </motion.article>
          ))}
        </div>
      </section>
    </div>
  )
}

export default ArtisanProfile
