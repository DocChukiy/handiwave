import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
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
      setPrimaryServiceId(artisanResult.data?.primaryService?.id || servicesResult.data[0]?.id || '')
      setArtisanProfile(artisanResult.data)
      if (artisanResult.data) {
        setBio(artisanResult.data.bio || '')
        setBusinessName(artisanResult.data.businessName || '')
        setCity(artisanResult.data.area || user?.city || '')
        setServiceArea(artisanResult.data.serviceArea || '')
        setState(artisanResult.data.location || user?.state || '')
        setStartingPrice(artisanResult.data.startingPrice || '')
        setYearsExperience(artisanResult.data.yearsExperience || '')
      }
      setIsLoading(false)
    }

    loadOnboardingData()

    return () => {
      isMounted = false
    }
  }, [user.id, user?.city, user?.state])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSaving(true)

    const { data, error: saveError } = await createArtisanOnboardingProfile({
      artisanId: artisanProfile?.id,
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
    showToast(artisanProfile ? 'Professional profile updated.' : 'Professional profile created successfully.')
    navigate('/artisan-dashboard')
  }

  if (isLoading) {
    return (
      <section className="auth-loading-state">
        <span></span>
        <p>Loading artisan onboarding...</p>
      </section>
    )
  }

  return (
    <div className="starter-page">
      <section className="page-hero compact">
        <p className="section-kicker">Professional profile</p>
        <h1>{artisanProfile ? 'Strengthen your professional profile' : 'Create your professional profile'}</h1>
        <p>
          Complete these core details to improve your visibility and become eligible for verification.
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
              minLength="40"
              placeholder="Tell customers about your experience, specialties, and work style."
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              required
            />
            <small>Use at least 40 characters so customers can understand your experience.</small>
          </label>
          <div className="form-split">
            <label>
              Years of experience
              <input
                min="1"
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
                min="1"
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
            {isSaving ? 'Saving profile...' : artisanProfile ? 'Save Profile Changes' : 'Create Professional Profile'}
          </button>
        </form>
      )}
    </div>
  )
}

export default ArtisanOnboarding
