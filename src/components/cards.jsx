import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { cardVariants } from '../utils/animations.js'
import Badge from './Badge.jsx'
import Button from './Button.jsx'
import Rating from './Rating.jsx'
import Avatar from './ui/Avatar.jsx'

function getJobMilestone(completedJobs = 0) {
  if (completedJobs >= 100) {
    return '100+ Jobs Completed'
  }

  if (completedJobs >= 50) {
    return '50+ Jobs Completed'
  }

  if (completedJobs >= 10) {
    return '10+ Jobs Completed'
  }

  return ''
}

function TrustBadges({ artisan, compact = false }) {
  const completedJobs = artisan.completedJobs || artisan.jobs || 0
  const reviewCount = artisan.reviewCount || 0
  const rating = Number(artisan.rating) || 0
  const jobMilestone = getJobMilestone(completedJobs)
  const isTopRated = rating >= 4.5 && reviewCount >= 3
  const isVerified = artisan.verified || artisan.verificationStatus === 'verified'

  return (
    <div className={`trust-badge-row ${compact ? 'compact' : ''}`}>
      {isVerified && (
        <span className="trust-badge verified">Verified Professional</span>
      )}
      {isTopRated && <span className="trust-badge top-rated">Top Rated</span>}
      {jobMilestone && <span className="trust-badge jobs">{jobMilestone}</span>}
    </div>
  )
}

export function ServiceCategoryCard({ category }) {
  return (
    <motion.article
      className="category-card"
      variants={cardVariants}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      whileHover={{ y: -8, scale: 1.02 }}
    >
      <span className="category-icon" aria-hidden="true">
        {category.icon}
      </span>
      <h3>{category.title}</h3>
      <p>{category.description}</p>
    </motion.article>
  )
}

export function ServiceCard({ service }) {
  return (
    <motion.article
      className="service-list-card"
      variants={{ hidden: { opacity: 0, y: 22 }, visible: { opacity: 1, y: 0 } }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      whileHover={{ y: -8, scale: 1.01 }}
    >
      <div className="service-card-top">
        <span className="service-icon">{service.icon}</span>
        <span className="service-category">{service.category}</span>
      </div>
      <h3>{service.title}</h3>
      <p>{service.description}</p>
      <div className="service-card-meta">
        <span>{service.price}</span>
        <span>{service.rating}+ rating</span>
        <span>{service.duration}</span>
        <span>{service.locations[0]}</span>
      </div>
      <Button className="service-book-link" to="/artisans">
        Find Professionals
      </Button>
    </motion.article>
  )
}

export function ArtisanCard({ artisan, featured = false }) {
  const isVerified = artisan.verified || artisan.verificationStatus === 'verified'
  const isTopRated = artisan.topRated || (
    Number(artisan.rating) >= 4.5 &&
    Number(artisan.reviewCount || 0) >= 3
  )
  const hasAvailability = artisan.isAvailable !== false

  if (featured) {
    return (
      <motion.article
        className="featured-artisan-card"
        variants={cardVariants}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        whileHover={{ y: -8 }}
      >
        <div className="profile-image-placeholder">
          <Avatar
            name={artisan.name}
            src={artisan.avatarUrl}
            initials={artisan.initials}
            size="lg"
          />
        </div>

        <div className="artisan-card-header">
          <div>
            <h3>{artisan.name}</h3>
            <p>{artisan.featuredSkill}</p>
          </div>
          {isVerified && <Badge variant="verified">Verified</Badge>}
        </div>

        <TrustBadges artisan={artisan} compact />

        <div className="artisan-metrics">
          <span>
            <strong>{Number(artisan.rating || 0).toFixed(1)}</strong>
            Rating
          </span>
          <span>
            <strong>{artisan.reviewCount || 0}</strong>
            Reviews
          </span>
          <span>
            <strong>{artisan.completedJobs}</strong>
            Jobs
          </span>
        </div>

        <p className="artisan-location">{artisan.fullLocation}</p>

        <Button className="book-now-button" to="/bookings">
          Book Now
        </Button>
      </motion.article>
    )
  }

  // Modern non-featured card
  return (
    <motion.article
      className="hw-professional-card"
      variants={cardVariants}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      whileHover={{ y: -4 }}
    >
      <div className="hw-professional-card-header">
        <Avatar
          name={artisan.name}
          src={artisan.avatarUrl}
          initials={artisan.initials}
          size="lg"
        />
        <div className="hw-professional-badges">
          {isVerified && <Badge variant="verified">Verified</Badge>}
          {isTopRated && <Badge variant="success">Top Rated</Badge>}
        </div>
      </div>

      <div className="hw-professional-info">
        <h3>{artisan.name}</h3>
        <p className="hw-professional-skill">{artisan.skill}</p>
        <p className="hw-professional-location">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          {artisan.fullLocation || `${artisan.area}, ${artisan.location}`}
        </p>
      </div>

      <div className="hw-professional-stats">
        <div className="hw-stat">
          <span className="hw-stat-value">
            <strong>{Number(artisan.rating || 0).toFixed(1)}</strong>
            <span className="hw-star">★</span>
          </span>
          <span className="hw-stat-label">{artisan.reviewCount || 0} reviews</span>
        </div>
        <div className="hw-stat">
          <span className="hw-stat-value">
            <strong>{artisan.completedJobs || 0}</strong>
          </span>
          <span className="hw-stat-label">Jobs</span>
        </div>
        <div className="hw-availability-status">
          {hasAvailability ? (
            <Badge variant="success">
              <span className="hw-available-dot"></span>
              Available
            </Badge>
          ) : (
            <Badge variant="neutral">Unavailable</Badge>
          )}
        </div>
      </div>

      <div className="hw-professional-price">
        <span className="hw-price-label">From</span>
        <span className="hw-price-value">{artisan.price || artisan.priceValue ? `NGN ${Number(artisan.priceValue || artisan.price?.replace(/[^0-9]/g, '') || 0).toLocaleString()}` : 'By quote'}</span>
      </div>

      <div className="hw-professional-actions">
        <Link
          to={`/artisan-profile/${artisan.id}`}
          className="hw-btn hw-btn-secondary hw-btn-full"
        >
          View Profile
        </Link>
        <Link
          to={`/bookings?artisan=${artisan.id}`}
          className="hw-btn hw-btn-primary hw-btn-full"
        >
          Book Now
        </Link>
      </div>
    </motion.article>
  )
}

export function ReviewCard({ review }) {
  return (
    <motion.article className="review-card" whileHover={{ y: -6 }}>
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
  )
}

export function ReelCard({ preview = false, reel, index = 0 }) {
  return (
    <motion.article
      className={preview ? 'reel-card' : 'reel-card premium-reel-card'}
      key={`${reel.artisan}-${reel.service}`}
      initial={preview ? undefined : { opacity: 0, y: 26 }}
      animate={preview ? undefined : { opacity: 1, y: 0 }}
      variants={preview ? cardVariants : undefined}
      transition={{
        duration: preview ? 0.45 : 0.45,
        delay: preview ? 0 : index * 0.06,
        ease: 'easeOut',
      }}
      whileHover={{ y: preview ? -8 : -10, scale: 1.01 }}
    >
      <div className="video-placeholder">
        {!preview && <div className="reel-location">{reel.location}</div>}
        <div className="play-button" aria-hidden="true">
          ▶
        </div>

        <div className="reel-side-actions">
          <span className="like-icon" aria-label={`${reel.likes} likes`}>
            ♥
          </span>
          <small>{reel.likes}</small>
          {!preview && (
            <>
              <span className="comment-icon" aria-label={`${reel.comments} comments`}>
                💬
              </span>
              <small>{reel.comments}</small>
            </>
          )}
        </div>

        <div className="reel-overlay">
          <div className="reel-profile">
            <span>{reel.initials}</span>
            <div>
              <strong>{reel.artisan}</strong>
              <p>{preview ? reel.category : reel.service}</p>
            </div>
          </div>
          <p className="reel-caption">{preview ? reel.previewCaption : reel.caption}</p>
          {preview ? (
            <Button className="reel-book-button" to="/bookings">
              Book
            </Button>
          ) : (
            <div className="reel-actions">
              <Button className="reel-book-button" to="/bookings">
                Book
              </Button>
              <Button className="reel-profile-button" to="/artisan-profile">
                View profile
              </Button>
            </div>
          )}
        </div>
      </div>
    </motion.article>
  )
}

export function RecentArtisanCard({ artisan }) {
  const profilePath = artisan.id ? `/artisan-profile/${artisan.id}` : '/artisan-profile'

  return (
    <Link className="recent-artisan-card" to={profilePath}>
      <span>{artisan.initials}</span>
      <div>
        <strong>{artisan.name}</strong>
        <p>{artisan.skill} • {artisan.location}</p>
      </div>
    </Link>
  )
}
