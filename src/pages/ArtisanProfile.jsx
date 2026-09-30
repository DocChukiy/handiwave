import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import EmptyState from '../components/EmptyState.jsx'
import SkeletonPreview from '../components/Skeletons.jsx'
import PageShell from '../components/ui/PageShell.jsx'
import Section from '../components/ui/Section.jsx'
import Card from '../components/ui/Card.jsx'
import Badge from '../components/ui/Badge.jsx'
import Avatar from '../components/ui/Avatar.jsx'
import Button from '../components/Button.jsx'
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

function formatMemberSince(value) {
  if (!value) {
    return 'Not available yet'
  }

  return new Intl.DateTimeFormat('en', {
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function getJobMilestone(completedJobs = 0) {
  if (completedJobs >= 100) {
    return '100+ jobs completed'
  }

  if (completedJobs >= 50) {
    return '50+ jobs completed'
  }

  if (completedJobs >= 10) {
    return '10+ jobs completed'
  }

  return ''
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
  const hasAvailability = activeAvailabilitySlots.length > 0

  if (isLoading) {
    return (
      <PageShell>
        <div className="hw-profile-page">
          <SkeletonPreview count={3} label="Loading professional profile" type="artisan" />
        </div>
      </PageShell>
    )
  }

  if (!artisan) {
    return (
      <PageShell>
        <div className="hw-profile-page">
          <EmptyState
            action={(
              <Button className="primary-cta" to="/artisan-onboarding">
                Create Professional Profile
              </Button>
            )}
            title="No artisan profile yet"
          >
            Complete onboarding so customers can view your professional profile.
          </EmptyState>
          {error && <p className="auth-error">{error}</p>}
        </div>
      </PageShell>
    )
  }

  const rating = Number(artisan.rating) || 0
  const reviewCount = artisan.reviewCount ?? profileReviews.length ?? 0
  const completedJobs = artisan.completedJobs || 0
  const isVerified = artisan.verificationStatus === 'verified' || artisan.verified
  const isTopRated = rating >= 4.5 && reviewCount >= 3
  const jobMilestone = getJobMilestone(completedJobs)

  return (
    <PageShell>
      <div className="hw-profile-page">

        {/* ============================================
            PROFILE HERO
            ============================================ */}
        <motion.section
          className="hw-profile-hero"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <div className="hw-profile-hero-main">
            <div className="hw-profile-avatar-section">
              <Avatar
                name={artisan.fullName || artisan.name}
                src={artisan.avatarUrl}
                initials={artisan.initials}
                size="xl"
              />
              <div className="hw-profile-badges">
                {isVerified && <Badge variant="verified">Verified Professional</Badge>}
                {isTopRated && <Badge variant="success">Top Rated</Badge>}
                {jobMilestone && <Badge variant="neutral">{jobMilestone}</Badge>}
              </div>
            </div>

            <div className="hw-profile-info">
              <p className="hw-profile-kicker">{artisan.skill}</p>
              <h1>{artisan.businessName || artisan.fullName || artisan.name}</h1>
              <p className="hw-profile-bio">{artisan.bio || 'This professional is setting up their profile.'}</p>

              <div className="hw-profile-location">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
                  <circle cx="12" cy="10" r="3"/>
                </svg>
                <span>{artisan.fullLocation || `${artisan.area}, ${artisan.location}`}</span>
                {artisan.serviceArea && <span className="hw-service-area">• {artisan.serviceArea}</span>}
              </div>

              <div className="hw-profile-stats">
                <div className="hw-stat-card">
                  <strong>{rating.toFixed(1)}</strong>
                  <span>Rating</span>
                </div>
                <div className="hw-stat-card">
                  <strong>{reviewCount}</strong>
                  <span>Reviews</span>
                </div>
                <div className="hw-stat-card">
                  <strong>{completedJobs}</strong>
                  <span>Jobs Done</span>
                </div>
                <div className="hw-stat-card">
                  <strong>{artisan.yearsExperience || 0}</strong>
                  <span>Years Exp.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="hw-profile-hero-actions">
            <div className="hw-profile-cta">
              {hasAvailability ? (
                <Button className="hw-btn hw-btn-primary hw-btn-lg" to={`/bookings?artisan=${artisan.id}`}>
                  Book this professional
                </Button>
              ) : (
                <Button className="hw-btn hw-btn-secondary hw-btn-lg" to="/messages">
                  Message Professional
                </Button>
              )}
            </div>

            <div className="hw-profile-price">
              <span className="hw-price-label">Starting from</span>
              <strong className="hw-price-amount">{formatMoney(artisan.startingPrice)}</strong>
            </div>
          </div>
        </motion.section>

        {/* ============================================
            TRUST & VERIFICATION
            ============================================ */}
        <Section
          title="Trust & verification"
          description="Verified signals that help you make an informed decision."
          kicker="Why trust this professional"
          className="hw-trust-section"
        >
          <Card variant="outlined" className="hw-trust-card">
            <div className="hw-trust-grid">
              <div className="hw-trust-item">
                <div className="hw-trust-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/>
                    <path d="m9 12 2 2 4-4"/>
                  </svg>
                </div>
                <div>
                  <strong>{isVerified ? 'Verified' : artisan.verificationStatus?.replaceAll('_', ' ') || 'Pending'}</strong>
                  <p>Identity and service reviewed by Handiwave</p>
                </div>
              </div>

              <div className="hw-trust-item">
                <div className="hw-trust-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                </div>
                <div>
                  <strong>{rating.toFixed(1)} / 5.0</strong>
                  <p>{reviewCount} verified customer reviews</p>
                </div>
              </div>

              <div className="hw-trust-item">
                <div className="hw-trust-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                </div>
                <div>
                  <strong>{completedJobs} jobs completed</strong>
                  <p>Customer-confirmed job completions</p>
                </div>
              </div>

              <div className="hw-trust-item">
                <div className="hw-trust-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="14" x="2" y="5" rx="2"/>
                    <line x1="2" x2="22" y1="10" y2="10"/>
                  </svg>
                </div>
                <div>
                  <strong>Escrow protected</strong>
                  <p>Payments held safely until job completion</p>
                </div>
              </div>
            </div>
          </Card>
        </Section>

        {/* ============================================
            AVAILABILITY
            ============================================ */}
        <Section
          title={hasAvailability ? 'Available this week' : 'No availability set yet'}
          description={hasAvailability
            ? 'Book one of these time slots when creating your request.'
            : 'This professional has not added bookable slots yet. You can message them to ask about availability.'}
          kicker="Booking availability"
          className="hw-availability-section"
        >
          <Card variant="outlined" className="hw-availability-card">
            {hasAvailability ? (
              <>
                <div className="hw-availability-days">
                  {availabilityDays.slice(0, 5).map((day) => (
                    <Badge key={day} variant="success">{day}</Badge>
                  ))}
                </div>
                <div className="hw-availability-slots">
                  {activeAvailabilitySlots.slice(0, 6).map((slot) => (
                    <div key={slot.id} className="hw-slot">
                      <strong>{slot.dayLabel}</strong>
                      <span>{slot.startTime} - {slot.endTime}</span>
                    </div>
                  ))}
                </div>
                {availability.unavailableDates.length > 0 && (
                  <p className="hw-unavailable-note">
                    Unavailable: {availability.unavailableDates.slice(0, 3).map(d => d.unavailableDate).join(', ')}
                    {availability.unavailableDates.length > 3 && '...'}
                  </p>
                )}
              </>
            ) : (
              <div className="hw-no-availability">
                <p>Send a message to ask about availability.</p>
                <Button className="hw-btn hw-btn-secondary" to="/messages">
                  Message Professional
                </Button>
              </div>
            )}
          </Card>
        </Section>

        {/* ============================================
            ABOUT & SKILLS
            ============================================ */}
        <section className="hw-profile-content-grid">
          <Card variant="outlined" className="hw-about-card">
            <h3>About</h3>
            <p className="hw-about-text">{artisan.bio || 'This professional is setting up their profile.'}</p>
            <div className="hw-member-since">
              <span>Member since {formatMemberSince(artisan.createdAt)}</span>
            </div>
          </Card>

          <Card variant="outlined" className="hw-skills-card">
            <h3>Skills & Services</h3>
            <div className="hw-skills-list">
              {skills.filter(Boolean).map((skill) => (
                <Badge key={skill} variant="neutral">{skill}</Badge>
              ))}
            </div>
          </Card>
        </section>

        {/* ============================================
            PORTFOLIO
            ============================================ */}
        <Section
          title="Recent work"
          description="Sample projects and completed work."
          kicker="Portfolio"
          className="hw-portfolio-section"
        >
          <div className="hw-portfolio-grid">
            {profilePortfolio.map((item) => (
              <motion.article
                key={item.title}
                className="hw-portfolio-card"
                whileHover={{ y: -4 }}
              >
                <div className="hw-portfolio-image">
                  <Avatar
                    name={artisan.fullName || artisan.name}
                    src={artisan.avatarUrl}
                    initials={artisan.initials}
                    size="lg"
                  />
                </div>
                <h4>{item.title}</h4>
                <p>{item.detail}</p>
              </motion.article>
            ))}
          </div>
        </Section>

        {/* ============================================
            REVIEWS
            ============================================ */}
        <Section
          title="Customer reviews"
          description="Verified reviews from completed jobs."
          kicker={`${rating.toFixed(1)} average • ${reviewCount} reviews`}
          className="hw-reviews-section"
        >
          <Card variant="outlined" className="hw-reviews-summary">
            <div className="hw-reviews-summary-content">
              <div className="hw-reviews-rating">
                <strong>{rating.toFixed(1)}</strong>
                <span>★★★★★</span>
              </div>
              <p>Based on verified customer-confirmed bookings and reviews.</p>
            </div>
          </Card>

          {profileReviews.length > 0 ? (
            <div className="hw-reviews-grid">
              {profileReviews.map((review) => (
                <ReviewCard key={review.id || review.name} review={review} />
              ))}
            </div>
          ) : (
            <EmptyState compact title="No reviews yet">
              Verified customer reviews will appear after customers confirm completed jobs.
            </EmptyState>
          )}
        </Section>

        {/* ============================================
            BOOKING CTA
            ============================================ */}
        <section className="hw-profile-booking-cta">
          <Card variant="elevated" className="hw-booking-cta-card">
            <div className="hw-booking-cta-content">
              <h3>Ready to book?</h3>
              <p>Create a booking request and this professional will respond.</p>
              <div className="hw-booking-cta-actions">
                {hasAvailability ? (
                  <Button className="hw-btn hw-btn-primary hw-btn-lg" to={`/bookings?artisan=${artisan.id}`}>
                    Book Available Slot
                  </Button>
                ) : (
                  <Button className="hw-btn hw-btn-primary hw-btn-lg" to="/messages">
                    Send Message
                  </Button>
                )}
                <Button className="hw-btn hw-btn-secondary hw-btn-lg" to="/services">
                  Browse More Services
                </Button>
              </div>
            </div>
          </Card>
        </section>

        {error && <p className="auth-error">{error}</p>}
        {isFallback && (
          <p className="auth-hint">
            Showing starter profile data because Supabase did not return an artisan for this link.
          </p>
        )}

      </div>
    </PageShell>
  )
}

export default ArtisanProfile
