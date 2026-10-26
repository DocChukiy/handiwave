import { BadgeCheck, BriefcaseBusiness, Eye, MapPin, PencilLine, Sparkles, WalletCards } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/useAuth.js'
import Button from '../components/Button.jsx'
import SkeletonPreview from '../components/Skeletons.jsx'
import { getArtisanByProfileId } from '../services/artisanService.js'

function formatMoney(value) {
  return value ? `NGN ${Number(value).toLocaleString()}` : 'Add a starting price'
}

function ArtisanServices() {
  const { user } = useAuth()
  const [artisan, setArtisan] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    getArtisanByProfileId(user.id).then(({ data, error: loadError }) => {
      if (!isMounted) return
      setArtisan(data)
      setError(loadError?.message || '')
      setIsLoading(false)
    })

    return () => {
      isMounted = false
    }
  }, [user.id])

  const readinessItems = useMemo(() => artisan ? [
    { done: Boolean(artisan.primaryService), label: 'Primary service selected' },
    { done: Boolean(artisan.startingPrice), label: 'Starting price added' },
    { done: Boolean(artisan.serviceArea), label: 'Service area defined' },
    { done: artisan.bio?.trim().length >= 40, label: 'Customer-friendly description added' },
    { done: artisan.workEvidenceCount > 0, label: 'Work evidence uploaded' },
  ] : [], [artisan])
  const completedItems = readinessItems.filter((item) => item.done).length

  if (isLoading) {
    return (
      <div className="starter-page artisan-services-page">
        <SkeletonPreview count={4} label="Loading your services" type="artisan" />
      </div>
    )
  }

  if (!artisan) {
    return (
      <div className="starter-page artisan-services-page">
        <section className="page-hero compact">
          <p className="section-kicker">My services</p>
          <h1>Build the service profile customers will discover.</h1>
          <p>Add your trade, price, location, and experience before publishing your professional profile.</p>
          <div className="hero-actions">
            <Button className="primary-cta" to="/artisan-onboarding">Create Professional Profile</Button>
          </div>
        </section>
        {error && <p className="auth-error page-error">{error}</p>}
      </div>
    )
  }

  return (
    <div className="starter-page artisan-services-page">
      <section className="artisan-services-hero">
        <div>
          <p className="section-kicker">My services</p>
          <h1>Package your work for the right customers.</h1>
          <p>Control how your skills, pricing, service area, and proof of work appear before a customer contacts you.</p>
          <div className="hero-actions">
            <Button className="primary-cta" to="/artisan-onboarding"><PencilLine size={17} /> Edit Service Details</Button>
            <Button className="secondary-cta" to={`/artisan-profile/${artisan.id}`}><Eye size={17} /> View Public Profile</Button>
          </div>
        </div>
        <div className="artisan-service-score-card">
          <span>Service profile strength</span>
          <strong>{artisan.profileCompletion || 0}%</strong>
          <div aria-hidden="true"><i style={{ width: `${artisan.profileCompletion || 0}%` }} /></div>
          <small>{completedItems} of {readinessItems.length} service essentials ready</small>
        </div>
      </section>

      {error && <p className="auth-error page-error">{error}</p>}

      <section className="artisan-service-summary-grid">
        <article><BriefcaseBusiness /><span>Primary service</span><strong>{artisan.skill}</strong></article>
        <article><WalletCards /><span>Customer starting point</span><strong>{formatMoney(artisan.startingPrice)}</strong></article>
        <article><MapPin /><span>Service area</span><strong>{artisan.serviceArea || artisan.fullLocation}</strong></article>
        <article><BadgeCheck /><span>Customer access</span><strong>{artisan.verified ? 'Verified & bookable' : 'Visible, awaiting verification'}</strong></article>
      </section>

      <section className="artisan-service-workspace">
        <article className="artisan-service-offer-card">
          <div className="section-heading-row">
            <div>
              <p className="section-kicker">Your customer offer</p>
              <h2>{artisan.businessName || artisan.fullName}</h2>
            </div>
            <span className={`verification-badge verification-${artisan.verificationStatus}`}>
              {artisan.verificationStatus.replaceAll('_', ' ')}
            </span>
          </div>
          <p className="artisan-service-description">{artisan.bio || 'Add a clear description of the problems you solve and what customers can expect.'}</p>
          <div className="artisan-service-chip-list">
            {artisan.skills.map((service) => <span key={service}>{service}</span>)}
          </div>
          <div className="artisan-service-detail-grid">
            <span><strong>{artisan.yearsExperience || 0} years</strong>Experience</span>
            <span><strong>{artisan.completedJobs || 0}</strong>Completed jobs</span>
            <span><strong>{artisan.rating.toFixed(1)}</strong>Customer rating</span>
            <span><strong>{artisan.reviewCount || 0}</strong>Reviews</span>
          </div>
        </article>

        <aside className="artisan-service-readiness-card">
          <p className="section-kicker">Publish checklist</p>
          <h2>Make every visit count</h2>
          <div className="artisan-service-checklist">
            {readinessItems.map((item) => (
              <span className={item.done ? 'done' : ''} key={item.label}>
                <i>{item.done ? '✓' : '○'}</i>{item.label}
              </span>
            ))}
          </div>
          <Button className="secondary-cta" to="/artisan-onboarding">Complete Service Profile</Button>
        </aside>
      </section>

      <section className="artisan-service-growth-grid">
        <article>
          <Sparkles />
          <div><h3>Show proof, not promises</h3><p>Upload before-and-after work, short videos, and project evidence that build customer confidence.</p></div>
          <Button className="secondary-cta" to="/artisan-reels">Manage Showcase</Button>
        </article>
        <article>
          <BriefcaseBusiness />
          <div><h3>Turn your profile into work</h3><p>Review matched customer requests and send clear, private offers based on the job details.</p></div>
          <Button className="secondary-cta" to="/opportunities">Browse Opportunities</Button>
        </article>
      </section>
    </div>
  )
}

export default ArtisanServices
