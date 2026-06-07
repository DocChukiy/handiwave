import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import Button from '../components/Button.jsx'
import EmptyState from '../components/EmptyState.jsx'
import SectionHeader from '../components/SectionHeader.jsx'
import SkeletonPreview from '../components/Skeletons.jsx'
import { ReviewCard } from '../components/cards.jsx'
import { getAvailabilityForArtisanId } from '../services/availabilityService.js'
import { getArtisanById, getArtisanByProfileId } from '../services/artisanService.js'
import { getReviewsForArtisan } from '../services/reviewService.js'
import { profilePortfolio, reviews as fallbackReviews } from '../data/reviews.js'

const fallbackArtisan = {
  bio: 'Certified electrician based in Lekki, Lagos. Trusted for clean wiring, lighting upgrades, inverter setup, and fast fault diagnosis.',
  businessName: 'Ada Electrical Works',
  completedJobs: 186,
  fullLocation: 'Lekki, Lagos',
  fullName: 'Ada Okafor',
  id: 'demo-artisan',
  initials: 'AO',
  rating: 4.9,
  serviceArea: 'Lekki, Victoria Island, Ikoyi',
  skill: 'Electrician',
  skills: ['Electrical repairs', 'Lighting installation', 'Inverter setup'],
  startingPrice: 7500,
  verificationStatus: 'verified',
  verified: true,
  yearsExperience: 6,
}

function formatMoney(value) {
  return value ? `NGN ${Number(value).toLocaleString()}` : 'By quote'
}

function ArtisanProfile() {
  const { user } = useAuth()
  const { artisanId } = useParams()
  const [searchParams] = useSearchParams()
  const queryId = searchParams.get('id')
  const [artisan, setArtisan] = useState(null)
  const [error, setError] = useState('')
  const [availability, setAvailability] = useState({ slots: [], unavailableDates: [] })
  const [isFallback, setIsFallback] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [profileReviews, setProfileReviews] = useState([])

  const requestedArtisanId = artisanId || queryId
  const shouldLoadOwnProfile = !requestedArtisanId && user?.role === 'artisan'

  useEffect(() => {
    let isMounted = true

    async function loadArtisanProfile() {
      setError('')
      setIsFallback(false)
      setIsLoading(true)

      try {
        const result = shouldLoadOwnProfile
          ? await getArtisanByProfileId(user.id)
          : await getArtisanById(requestedArtisanId)

        if (!isMounted) {
          return
        }

        if (result.error) {
          setError(result.error.message)
        }

        if (result.data) {
          setArtisan(result.data)
          const [reviewResult, availabilityResult] = await Promise.all([
            getReviewsForArtisan(result.data.id),
            getAvailabilityForArtisanId(result.data.id),
          ])

          if (!isMounted) {
            return
          }

          if (reviewResult.error) {
            setError(reviewResult.error.message)
          }

          if (availabilityResult.error) {
            setError(availabilityResult.error.message)
          }

          setProfileReviews(reviewResult.data)
          setAvailability(availabilityResult.data)
          return
        }

        if (shouldLoadOwnProfile) {
          setArtisan(null)
          return
        }

        setArtisan(fallbackArtisan)
        setAvailability({ slots: [], unavailableDates: [] })
        setProfileReviews(fallbackReviews)
        setIsFallback(true)
      } catch (loadError) {
        if (isMounted) {
          setError(loadError.message)
          setArtisan(shouldLoadOwnProfile ? null : fallbackArtisan)
          setAvailability({ slots: [], unavailableDates: [] })
          setProfileReviews(shouldLoadOwnProfile ? [] : fallbackReviews)
          setIsFallback(!shouldLoadOwnProfile)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadArtisanProfile()

    return () => {
      isMounted = false
    }
  }, [requestedArtisanId, shouldLoadOwnProfile, user])

  const skills = useMemo(() => artisan?.skills?.length ? artisan.skills : [artisan?.skill], [artisan])
  const activeAvailabilitySlots = availability.slots.filter((slot) => slot.isActive)
  const availabilityDays = [...new Set(activeAvailabilitySlots.map((slot) => slot.dayLabel))]

  if (isLoading) {
    return (
      <div className="artisan-profile-page">
        <SkeletonPreview count={3} label="Loading artisan profile" type="artisan" />
      </div>
    )
  }

  if (!artisan) {
    return (
      <div className="artisan-profile-page">
        <EmptyState
          action={(
            <Button className="primary-cta" to="/artisan-onboarding">
              Create Artisan Profile
            </Button>
          )}
          title="No artisan profile yet"
        >
          Complete onboarding so customers can view your artisan profile.
        </EmptyState>
        {error && <p className="auth-error">{error}</p>}
      </div>
    )
  }

  return (
    <div className="artisan-profile-page">
      {error && <p className="auth-error">{error}</p>}
      {isFallback && (
        <p className="auth-hint">
          Showing starter profile data because Supabase did not return an artisan for this link.
        </p>
      )}

      <motion.section
        className="profile-hero-card"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className="profile-image-card">
          <div className="large-profile-image">{artisan.initials}</div>
          <div className="profile-badge-stack">
            <span className="profile-verified-badge">
              {artisan.verificationStatus.replaceAll('_', ' ')}
            </span>
            {artisan.rating >= 4.8 && <span className="top-rated-badge">Top Rated</span>}
          </div>
        </div>

        <div className="profile-summary">
          <p className="section-kicker">{artisan.skill}</p>
          <h1>{artisan.businessName || artisan.fullName}</h1>
          <p>{artisan.bio || 'This artisan is setting up their profile.'}</p>

          <div className="profile-stats">
            <span>
              <strong>{artisan.rating.toFixed(1)}</strong>
              Average rating
            </span>
            <span>
              <strong>{artisan.completedJobs}</strong>
              Completed jobs
            </span>
            <span>
              <strong>{artisan.yearsExperience} yrs</strong>
              Experience
            </span>
          </div>

          <div className="safety-strip">
            <span>{artisan.fullLocation}</span>
            <span>{artisan.serviceArea || 'Local availability'}</span>
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
          <span>Starting price</span>
          <strong>{formatMoney(artisan.startingPrice)}</strong>
          <p>Final pricing depends on service type, location, and materials.</p>
          <div className="profile-availability-preview">
            <span>Availability</span>
            {availabilityDays.length > 0 ? (
              <>
                <strong>{availabilityDays.slice(0, 3).join(', ')}</strong>
                <p>
                  {activeAvailabilitySlots.length} active slot{activeAvailabilitySlots.length === 1 ? '' : 's'}
                  {availability.unavailableDates.length > 0
                    ? ` • ${availability.unavailableDates.length} blocked date${availability.unavailableDates.length === 1 ? '' : 's'}`
                    : ''}
                </p>
              </>
            ) : (
              <p>This artisan has not published booking hours yet.</p>
            )}
          </div>
        </aside>
      </motion.section>

      <section className="profile-content-grid">
        <motion.article className="profile-panel about-panel" initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }}>
          <p className="section-kicker">About</p>
          <h2>{artisan.skill} support in {artisan.fullLocation}</h2>
          <p>{artisan.bio || 'This artisan has not added a detailed bio yet.'}</p>
        </motion.article>

        <motion.article className="profile-panel skills-panel" initial={{ opacity: 0, y: 22 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.3 }}>
          <p className="section-kicker">Skills</p>
          <div className="skills-list">
            {skills.filter(Boolean).map((skill) => (
              <span key={skill}>{skill}</span>
            ))}
          </div>
        </motion.article>
      </section>

      <section className="portfolio-section">
        <SectionHeader count="Sample projects" kicker="Portfolio" title="Recent work" />
        <div className="portfolio-grid">
          {profilePortfolio.map((item) => (
            <motion.article className="portfolio-card" key={item.title} whileHover={{ y: -8, scale: 1.01 }}>
              <div className="portfolio-image-placeholder">{artisan.initials}</div>
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="reviews-section">
        <SectionHeader
          count={`${artisan.rating.toFixed(1)} average • ${artisan.reviewCount || profileReviews.length} reviews`}
          kicker="Customer reviews"
          title="What customers say"
        />

        <div className="rating-summary-card">
          <div>
            <strong>{artisan.rating.toFixed(1)}</strong>
            <span>★★★★★</span>
          </div>
          <p>Based on verified customer-confirmed bookings and reviews.</p>
        </div>

        {profileReviews.length > 0 ? (
          <div className="reviews-grid">
            {profileReviews.map((review) => (
              <ReviewCard key={review.id || review.name} review={review} />
            ))}
          </div>
        ) : (
          <EmptyState compact title="No reviews yet">
            Verified customer reviews will appear after customers confirm completed jobs.
          </EmptyState>
        )}
      </section>
    </div>
  )
}

export default ArtisanProfile
