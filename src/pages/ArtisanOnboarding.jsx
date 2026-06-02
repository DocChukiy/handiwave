import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import Button from '../components/Button.jsx'
import EmptyState from '../components/EmptyState.jsx'
import {
  createArtisanOnboardingProfile,
  getArtisanByProfileId,
} from '../services/artisanService.js'
import { getServiceOptions } from '../services/serviceService.js'
import { showToast } from '../utils/toast.js'

function ArtisanOnboarding() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [artisanProfile, setArtisanProfile] = useState(null)
  const [bio, setBio] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [city, setCity] = useState(user?.city || '')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [primaryServiceId, setPrimaryServiceId] = useState('')
  const [serviceArea, setServiceArea] = useState('')
  const [services, setServices] = useState([])
  const [state, setState] = useState(user?.state || '')
  const [startingPrice, setStartingPrice] = useState('')
  const [yearsExperience, setYearsExperience] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadOnboardingData() {
      setError('')
      setIsLoading(true)

      const [servicesResult, artisanResult] = await Promise.all([
        getServiceOptions(),
        getArtisanByProfileId(user.id),
      ])

      if (!isMounted) {
        return
      }

      if (servicesResult.error || artisanResult.error) {
        setError(
          servicesResult.error?.message ||
            artisanResult.error?.message ||
            'Unable to load onboarding data.',
        )
      }

      setServices(servicesResult.data)
      setPrimaryServiceId(servicesResult.data[0]?.id || '')
      setArtisanProfile(artisanResult.data)
      setIsLoading(false)
    }

    loadOnboardingData()

    return () => {
      isMounted = false
    }
  }, [user.id])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSaving(true)

    const { data, error: saveError } = await createArtisanOnboardingProfile({
      bio,
      businessName,
      city,
      primaryServiceId,
      profileId: user.id,
      serviceArea,
      state,
      startingPrice,
      yearsExperience,
    })

    if (saveError) {
      setError(saveError.message)
      setIsSaving(false)
      return
    }

    setArtisanProfile(data)
    setIsSaving(false)
    showToast('Artisan profile created successfully.')
    navigate('/artisan-profile')
  }

  if (isLoading) {
    return (
      <section className="auth-loading-state">
        <span></span>
        <p>Loading artisan onboarding...</p>
      </section>
    )
  }

  if (artisanProfile) {
    return (
      <div className="starter-page">
        <section className="page-hero compact">
          <p className="section-kicker">Artisan onboarding</p>
          <h1>Your artisan profile is ready</h1>
          <p>
            Customers can now discover your profile once verification is complete.
          </p>
          <div className="hero-actions">
            <Button className="primary-cta" to="/artisan-profile">
              View Profile
            </Button>
            <Button className="secondary-cta" to="/artisans">
              View Marketplace
            </Button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="starter-page">
      <section className="page-hero compact">
        <p className="section-kicker">Artisan onboarding</p>
        <h1>Create your artisan profile</h1>
        <p>
          Add your business details so customers can understand your skills,
          location, and experience.
        </p>
      </section>

      {services.length === 0 ? (
        <EmptyState title="No services available yet">
          Add active services in Supabase before onboarding artisans.
        </EmptyState>
      ) : (
        <form className="booking-form artisan-onboarding-form" onSubmit={handleSubmit}>
          <h2>Business details</h2>
          <label>
            Business name
            <input
              placeholder="Ada Electrical Works"
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
              required
            />
          </label>
          <label>
            Bio
            <textarea
              placeholder="Tell customers about your experience, specialties, and work style."
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              required
            />
          </label>
          <div className="form-split">
            <label>
              Years of experience
              <input
                min="0"
                type="number"
                value={yearsExperience}
                onChange={(event) => setYearsExperience(event.target.value)}
                required
              />
            </label>
            <label>
              Primary service
              <select
                value={primaryServiceId}
                onChange={(event) => setPrimaryServiceId(event.target.value)}
                required
              >
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="form-split">
            <label>
              City
              <input
                placeholder="Lekki"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                required
              />
            </label>
            <label>
              State
              <input
                placeholder="Lagos"
                value={state}
                onChange={(event) => setState(event.target.value)}
                required
              />
            </label>
          </div>
          <div className="form-split">
            <label>
              Starting price
              <input
                min="0"
                placeholder="7500"
                type="number"
                value={startingPrice}
                onChange={(event) => setStartingPrice(event.target.value)}
                required
              />
            </label>
            <label>
              Service area
              <input
                placeholder="Lekki, Victoria Island, Ikoyi"
                value={serviceArea}
                onChange={(event) => setServiceArea(event.target.value)}
                required
              />
            </label>
          </div>
          {error && <p className="auth-error">{error}</p>}
          <button disabled={isSaving} type="submit">
            {isSaving ? 'Saving profile...' : 'Create Artisan Profile'}
          </button>
        </form>
      )}
    </div>
  )
}

export default ArtisanOnboarding
