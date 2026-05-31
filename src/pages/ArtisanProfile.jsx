import { motion } from 'framer-motion'
import Button from '../components/Button.jsx'
import SectionHeader from '../components/SectionHeader.jsx'
import SkeletonPreview from '../components/Skeletons.jsx'
import { ReviewCard } from '../components/cards.jsx'
import { profilePortfolio, profileSkills, reviews } from '../data/reviews.js'
import { showToast } from '../utils/toast.js'

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
            <Button className="primary-cta" to="/bookings">
              Book Now
            </Button>
            <Button className="secondary-cta" to="/messages">
              Chat
            </Button>
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
            {profileSkills.map((skill) => (
              <span key={skill}>{skill}</span>
            ))}
          </div>
        </motion.article>
      </section>

      <section className="portfolio-section">
        <SectionHeader count="3 projects" kicker="Portfolio" title="Recent work" />

        <div className="portfolio-grid">
          {profilePortfolio.map((item) => (
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
        <SectionHeader
          count="4.9 average • 186 jobs"
          kicker="Customer reviews"
          title="What customers say"
        />

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

        <SkeletonPreview
          className="review-loading-preview"
          count={1}
          label="Review loading placeholder"
          type="review"
        />

        <div className="reviews-grid">
          {reviews.map((review) => (
            <ReviewCard key={review.name} review={review} />
          ))}
        </div>
      </section>
    </div>
  )
}

export default ArtisanProfile
