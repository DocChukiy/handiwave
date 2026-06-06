import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { cardVariants } from '../utils/animations.js'
import Badge from './Badge.jsx'
import Button from './Button.jsx'
import Rating from './Rating.jsx'

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
        Find Artisan
      </Button>
    </motion.article>
  )
}

export function ArtisanCard({ artisan, featured = false }) {
  if (featured) {
    return (
      <motion.article
        className="featured-artisan-card"
        variants={cardVariants}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        whileHover={{ y: -8 }}
      >
        <div className="profile-image-placeholder">
          <span>{artisan.initials}</span>
        </div>

        <div className="artisan-card-header">
          <div>
            <h3>{artisan.name}</h3>
            <p>{artisan.featuredSkill}</p>
          </div>
          <Badge>Verified</Badge>
        </div>

        <div className="artisan-metrics">
          <span>
            <strong>{artisan.rating}</strong>
            Rating
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

  return (
    <article className="person-card">
      <div className="person-avatar">{artisan.initials}</div>
      <div className="artisan-badge-row">
        {artisan.verified && <Badge>Verified</Badge>}
        {artisan.topRated && <Badge className="top-rated-badge">Top Rated</Badge>}
        <Badge className="save-badge">Save</Badge>
      </div>
      <h3>{artisan.name}</h3>
      <p>
        {artisan.skill} in {artisan.area}, {artisan.location}
      </p>
      <strong className="price-note">{artisan.price}</strong>
      <Rating jobs={artisan.jobs} value={artisan.rating} />
      <div className="trust-indicators">
        <span>ID checked</span>
        <span>Escrow safe</span>
      </div>
      <div className="person-actions">
        <Button className="service-book-link" to={`/artisan-profile/${artisan.id}`}>
          View Profile
        </Button>
        <Button className="secondary-mini-link" to="/bookings">
          Book Now
        </Button>
      </div>
    </article>
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
  return (
    <Link className="recent-artisan-card" to="/artisan-profile">
      <span>{artisan.initials}</span>
      <div>
        <strong>{artisan.name}</strong>
        <p>{artisan.skill} • {artisan.location}</p>
      </div>
    </Link>
  )
}
