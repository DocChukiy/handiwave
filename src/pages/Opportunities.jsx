import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import EmptyState from '../components/EmptyState.jsx'
import { getProfessionalOpportunities, submitServiceRequestBid } from '../services/marketplaceService.js'
import { showToast } from '../utils/toast.js'

const emptyBid = {
  availableDate: '',
  availableTime: '',
  durationEstimate: '',
  guaranteeText: '',
  inspectionFee: '',
  laborAmount: '',
  materialsEstimate: '',
  maximumTotal: '',
  message: '',
  minimumTotal: '',
  pricingType: 'fixed',
}

function getErrorMessage(error) {
  return [error?.message, error?.details, error?.hint].filter(Boolean).join(' ')
}

export default function Opportunities() {
  const { user } = useAuth()
  const [artisan, setArtisan] = useState(null)
  const [requests, setRequests] = useState([])
  const [forms, setForms] = useState({})
  const [openRequestId, setOpenRequestId] = useState('')
  const [savingRequestId, setSavingRequestId] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  async function loadOpportunities() {
    setError('')
    const result = await getProfessionalOpportunities(user.id)
    setArtisan(result.artisan || null)
    setRequests(result.data || [])
    if (result.error) setError(getErrorMessage(result.error))
    setIsLoading(false)
  }

  useEffect(() => {
    let isMounted = true
    getProfessionalOpportunities(user.id).then((result) => {
      if (!isMounted) return
      setArtisan(result.artisan || null)
      setRequests(result.data || [])
      if (result.error) setError(getErrorMessage(result.error))
      setIsLoading(false)
    })

    return () => {
      isMounted = false
    }
  }, [user.id])

  function getForm(requestId) {
    return forms[requestId] || emptyBid
  }

  function updateForm(requestId, field, value) {
    setForms((current) => ({
      ...current,
      [requestId]: { ...emptyBid, ...current[requestId], [field]: value },
    }))
  }

  function toggleOfferForm(requestId, ownBid) {
    if (openRequestId === requestId) {
      setOpenRequestId('')
      return
    }

    if (ownBid) {
      setForms((current) => ({
        ...current,
        [requestId]: {
          availableDate: ownBid.availableDate,
          availableTime: ownBid.availableTime,
          durationEstimate: ownBid.durationEstimate,
          guaranteeText: ownBid.guaranteeText,
          inspectionFee: ownBid.inspectionFee ?? '',
          laborAmount: ownBid.laborAmount ?? '',
          materialsEstimate: ownBid.materialsEstimate ?? '',
          maximumTotal: ownBid.maximumTotal ?? '',
          message: ownBid.message,
          minimumTotal: ownBid.minimumTotal ?? '',
          pricingType: ownBid.pricingType,
        },
      }))
    }
    setOpenRequestId(requestId)
  }

  async function handleSubmit(event, request) {
    event.preventDefault()
    const bid = getForm(request.id)
    if (!bid.message.trim()) {
      setError('Explain what your offer includes before submitting it.')
      return
    }
    setError('')
    setSavingRequestId(request.id)
    const { error: submitError } = await submitServiceRequestBid({ artisanId: artisan.id, bid, requestId: request.id })
    if (submitError) {
      setError(getErrorMessage(submitError))
      setSavingRequestId('')
      return
    }
    await loadOpportunities()
    setSavingRequestId('')
    setOpenRequestId('')
    showToast('Your sealed offer was sent to the customer.')
  }

  return (
    <div className="starter-page marketplace-page">
      <section className="page-hero compact marketplace-hero professional-marketplace-hero">
        <p className="section-kicker">Nearby opportunities</p>
        <h1>Compete on fit, reliability, and clear pricing.</h1>
        <p>These requests match your verified service and state. Other professionals cannot see your offer price.</p>
      </section>

      {error && <p className="auth-error page-error">{error}</p>}

      {!artisan && !isLoading ? (
        <EmptyState title="Complete your professional profile">
          <p>Only verified professionals with a completed service profile can receive matched opportunities.</p>
          <Link className="primary-cta" to="/artisan-onboarding">Complete Onboarding</Link>
        </EmptyState>
      ) : (
        <section className="opportunity-feed">
          <div className="booking-history-header">
            <p className="section-kicker">Opportunity feed</p>
            <h2>{requests.length} matching request{requests.length === 1 ? '' : 's'}</h2>
          </div>
          {isLoading ? <p>Finding matching work...</p> : requests.length === 0 ? (
            <EmptyState title="No matching requests right now">We will show new work here when customers in your service area publish it.</EmptyState>
          ) : requests.map((request) => {
            const ownBid = request.bids.find((bid) => bid.artisanId === artisan.id)
            const form = getForm(request.id)
            return (
              <article className="opportunity-card" key={request.id}>
                <div className="marketplace-card-header">
                  <div><span>{request.service.icon} {request.service.name}</span><h3>{request.issueTitle}</h3></div>
                  <span className={`urgency-badge urgency-${request.urgency}`}>{request.urgency.replaceAll('_', ' ')}</span>
                </div>
                <p>{request.issueDetails}</p>
                <div className="opportunity-facts">
                  <span><strong>Area</strong>{request.city}, {request.state}</span>
                  <span><strong>Preferred</strong>{request.preferredDate || 'Flexible'} {request.preferredTime}</span>
                  <span><strong>Materials</strong>{request.materialsPreference.replaceAll('_', ' ')}</span>
                </div>
                <div className="opportunity-diagnosis">
                  {Object.entries(request.diagnosisAnswers).map(([key, value]) => (
                    <span key={key}><strong>{key.replaceAll('_', ' ')}</strong>{value}</span>
                  ))}
                </div>
                {ownBid && <p className="offer-submitted-note">Offer submitted • {ownBid.pricingType} pricing • Customer decision pending</p>}
                <button className="primary-cta" type="button" onClick={() => toggleOfferForm(request.id, ownBid)}>
                  {ownBid ? 'Review or Update Offer' : 'Send Sealed Offer'}
                </button>

                {openRequestId === request.id && (
                  <form className="opportunity-bid-form" onSubmit={(event) => handleSubmit(event, request)}>
                    <label>
                      <span>Offer type</span>
                      <select value={form.pricingType} onChange={(event) => updateForm(request.id, 'pricingType', event.target.value)}>
                        <option value="fixed">Fixed total</option>
                        <option value="range">Estimated range</option>
                        <option value="inspection">Inspection required</option>
                      </select>
                    </label>
                    {form.pricingType === 'fixed' && <>
                      <label><span>Labour</span><input required min="0" type="number" value={form.laborAmount} onChange={(event) => updateForm(request.id, 'laborAmount', event.target.value)} /></label>
                      <label><span>Materials estimate</span><input min="0" type="number" value={form.materialsEstimate} onChange={(event) => updateForm(request.id, 'materialsEstimate', event.target.value)} /></label>
                    </>}
                    {form.pricingType === 'range' && <>
                      <label><span>Minimum total</span><input required min="0" type="number" value={form.minimumTotal} onChange={(event) => updateForm(request.id, 'minimumTotal', event.target.value)} /></label>
                      <label><span>Maximum total</span><input required min="0" type="number" value={form.maximumTotal} onChange={(event) => updateForm(request.id, 'maximumTotal', event.target.value)} /></label>
                    </>}
                    {form.pricingType === 'inspection' && (
                      <label><span>Inspection / call-out fee</span><input required min="0" type="number" value={form.inspectionFee} onChange={(event) => updateForm(request.id, 'inspectionFee', event.target.value)} /></label>
                    )}
                    <label><span>Available date</span><input type="date" value={form.availableDate} onChange={(event) => updateForm(request.id, 'availableDate', event.target.value)} /></label>
                    <label><span>Available time</span><input type="time" value={form.availableTime} onChange={(event) => updateForm(request.id, 'availableTime', event.target.value)} /></label>
                    <label><span>Estimated duration</span><input placeholder="e.g. 2–3 hours" value={form.durationEstimate} onChange={(event) => updateForm(request.id, 'durationEstimate', event.target.value)} /></label>
                    <label><span>Work guarantee</span><input placeholder="e.g. 30-day workmanship guarantee" value={form.guaranteeText} onChange={(event) => updateForm(request.id, 'guaranteeText', event.target.value)} /></label>
                    <label className="full-width"><span>What is included?</span><textarea required placeholder="Explain your assumptions, labour, materials, exclusions, and why you are a good fit." value={form.message} onChange={(event) => updateForm(request.id, 'message', event.target.value)} /></label>
                    <button disabled={savingRequestId === request.id} type="submit">{savingRequestId === request.id ? 'Sending...' : ownBid ? 'Update Offer' : 'Submit Sealed Offer'}</button>
                  </form>
                )}
              </article>
            )
          })}
        </section>
      )}
    </div>
  )
}
