import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

const reels = [
  {
    artisan: 'Ada Okafor',
    initials: 'AO',
    service: 'Electrician',
    location: 'Lekki, Lagos',
    caption: 'Smart lighting install with clean conduit work and safety testing.',
    likes: '2.4k',
    comments: 184,
  },
  {
    artisan: 'Musa Usman',
    initials: 'MU',
    service: 'AC Repair',
    location: 'Wuse, Abuja',
    caption: 'Diagnosed a noisy split unit and restored cooling in under one hour.',
    likes: '1.8k',
    comments: 97,
  },
  {
    artisan: 'Chika Eze',
    initials: 'CE',
    service: 'Deep Cleaning',
    location: 'Port Harcourt',
    caption: 'Shortlet reset: kitchen, bathroom, floors, and finishing touches.',
    likes: '3.1k',
    comments: 226,
  },
  {
    artisan: 'Bayo Ibrahim',
    initials: 'BI',
    service: 'Plumber',
    location: 'Yaba, Lagos',
    caption: 'Fixed a hidden kitchen leak without breaking the existing tiles.',
    likes: '1.5k',
    comments: 73,
  },
  {
    artisan: 'Joy Nwosu',
    initials: 'JN',
    service: 'Hair Stylist',
    location: 'Surulere, Lagos',
    caption: 'Clean home-service grooming setup for a weekend event look.',
    likes: '2.9k',
    comments: 141,
  },
  {
    artisan: 'Femi Lawal',
    initials: 'FL',
    service: 'Painter',
    location: 'Ibadan',
    caption: 'Fresh accent wall and smooth finishing for a family lounge.',
    likes: '1.2k',
    comments: 58,
  },
]

function Reels() {
  return (
    <div className="reels-page">
      <section className="page-hero compact reels-hero">
        <p className="section-kicker">Handiwave reels</p>
        <h1>Watch artisans prove their craft</h1>
        <p>
          Swipe through real service moments, transformations, and behind-the-scenes
          work from verified professionals across Nigeria.
        </p>
      </section>

      <section className="loading-preview reels-loading-preview" aria-label="Reel loading placeholders">
        {[1, 2, 3].map((item) => (
          <div className="skeleton-card reel-skeleton" key={item}>
            <span className="skeleton-line short"></span>
            <span className="skeleton-line wide"></span>
            <span className="skeleton-line"></span>
          </div>
        ))}
      </section>

      <section className="reels-showcase-grid">
        {reels.map((reel, index) => (
          <motion.article
            className="reel-card premium-reel-card"
            key={`${reel.artisan}-${reel.service}`}
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: index * 0.06, ease: 'easeOut' }}
            whileHover={{ y: -10, scale: 1.01 }}
          >
            <div className="video-placeholder">
              <div className="reel-location">{reel.location}</div>
              <div className="play-button" aria-hidden="true">
                ▶
              </div>

              <div className="reel-side-actions">
                <span className="like-icon" aria-label={`${reel.likes} likes`}>
                  ♥
                </span>
                <small>{reel.likes}</small>
                <span className="comment-icon" aria-label={`${reel.comments} comments`}>
                  💬
                </span>
                <small>{reel.comments}</small>
              </div>

              <div className="reel-overlay">
                <div className="reel-profile">
                  <span>{reel.initials}</span>
                  <div>
                    <strong>{reel.artisan}</strong>
                    <p>{reel.service}</p>
                  </div>
                </div>
                <p className="reel-caption">{reel.caption}</p>
                <div className="reel-actions">
                  <Link className="reel-book-button" to="/bookings">
                    Book
                  </Link>
                  <Link className="reel-profile-button" to="/artisan-profile">
                    View profile
                  </Link>
                </div>
              </div>
            </div>
          </motion.article>
        ))}
      </section>
    </div>
  )
}

export default Reels
