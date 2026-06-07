import { useEffect, useState } from 'react'
import Button from '../components/Button.jsx'
import EmptyState from '../components/EmptyState.jsx'
import SkeletonPreview from '../components/Skeletons.jsx'
import { getPublishedReels } from '../services/reelsService.js'

function getErrorMessage(error) {
  return [
    error.message,
    error.details,
    error.hint,
    error.code,
  ].filter(Boolean).join(' ')
}

function PublicReelCard({ reel }) {
  return (
    <article className="reel-card premium-reel-card real-reel-card">
      <div className="video-placeholder real-video-frame">
        <video
          controls
          loop
          playsInline
          poster={reel.thumbnailUrl || undefined}
          src={reel.videoUrl}
        />
        <div className="reel-location">{reel.location}</div>
        <div className="reel-side-actions">
          <span className="like-icon" aria-label={`${reel.likes} likes`}>♥</span>
          <small>{reel.likes}</small>
          <span className="comment-icon" aria-label={`${reel.views} views`}>👁</span>
          <small>{reel.views}</small>
        </div>
        <div className="reel-overlay">
          <div className="reel-profile">
            <span>{reel.initials}</span>
            <div>
              <strong>{reel.artisan}</strong>
              <p>{reel.service} • {reel.rating.toFixed(1)} ★ • {reel.reviewCount} reviews</p>
            </div>
          </div>
          <div className="reel-trust-row">
            {reel.verified && <span>Verified</span>}
            <span>{reel.category}</span>
          </div>
          <p className="reel-caption">{reel.caption}</p>
          <div className="reel-actions">
            <Button className="reel-book-button" to={reel.bookingPath}>
              Book Now
            </Button>
            <Button className="reel-profile-button" to="/messages">
              Message Artisan
            </Button>
            <Button className="reel-profile-button" to={reel.profilePath}>
              View Profile
            </Button>
          </div>
        </div>
      </div>
    </article>
  )
}

function Reels() {
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [reels, setReels] = useState([])

  useEffect(() => {
    let isMounted = true

    async function loadReels() {
      setError('')
      setIsLoading(true)

      try {
        const { data, error: reelsError } = await getPublishedReels()

        if (!isMounted) {
          return
        }

        if (reelsError) {
          setError(getErrorMessage(reelsError))
          return
        }

        setReels(data)
      } catch (loadError) {
        if (isMounted) {
          setError(getErrorMessage(loadError))
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadReels()

    return () => {
      isMounted = false
    }
  }, [])

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

      {error && <p className="auth-error page-error">{error}</p>}

      {isLoading ? (
        <SkeletonPreview
          className="reels-loading-preview"
          count={3}
          label="Loading reels"
          type="reel"
        />
      ) : reels.length > 0 ? (
        <section className="reels-showcase-grid">
          {reels.map((reel) => (
            <PublicReelCard key={reel.id} reel={reel} />
          ))}
        </section>
      ) : (
        <EmptyState title="No published reels yet">
          Verified artisan work videos will appear here after artisans publish reels.
        </EmptyState>
      )}
    </div>
  )
}

export default Reels
