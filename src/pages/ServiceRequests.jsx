import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import EmptyState from '../components/EmptyState.jsx'
import { getDiagnosticQuestions } from '../data/serviceDiagnostics.js'
import {
  acceptServiceRequestBid,
  createServiceRequest,
  getCustomerServiceRequests,
} from '../services/marketplaceService.js'
import { getServiceOptions } from '../services/serviceService.js'
import { showToast } from '../utils/toast.js'

const initialForm = {
  address: '',
  city: '',
  diagnosisAnswers: {},
  issueDetails: '',
  issueTitle: '',
  materialsPreference: 'professional_to_advise',
  preferredDate: '',
  preferredTime: '',
  serviceId: '',
  state: '',
  urgency: 'flexible',
}

function formatMoney(value) {
  return `NGN ${Number(value || 0).toLocaleString()}`
}

function getBidPrice(bid) {
  if (bid.pricingType === 'fixed') {
    return `${formatMoney((bid.laborAmount || 0) + (bid.materialsEstimate || 0))} fixed`
  }
  if (bid.pricingType === 'range') {
    return `${formatMoney(bid.minimumTotal)}–${formatMoney(bid.maximumTotal)}`
  }
  return `${formatMoney(bid.inspectionFee)} inspection`
}

function getErrorMessage(error) {
  return [error?.message, error?.details, error?.hint].filter(Boolean).join(' ')
}

const requestStatusLabels = {
  awarded: 'Professional selected',
  cancelled: 'Cancelled',
  closed: 'Closed',
  expired: 'Expired',
  open: 'Receiving offers',
}

function getRequestStatusLabel(status) {
  return requestStatusLabels[status] || status?.replaceAll('_', ' ') || 'Request update'
}

export default function ServiceRequests() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const requestedServiceId = searchParams.get('service') || ''
  const [form, setForm] = useState({
    ...initialForm,
    city: user?.city || '',
    state: user?.state || '',
  })
  const [services, setServices] = useState([])
  const [requests, setRequests] = useState([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [acceptingBidId, setAcceptingBidId] = useState('')
  const [formStep, setFormStep] = useState(1)
  const [offerToAccept, setOfferToAccept] = useState(null)
  const [requestView, setRequestView] = useState('active')

  const selectedService = services.find((service) => service.id === form.serviceId)
  const questions = useMemo(() => getDiagnosticQuestions(selectedService), [selectedService])
  const requestViews = useMemo(() => ({
    active: requests.filter((request) => request.status === 'open'),
    awarded: requests.filter((request) => request.status === 'awarded'),
    all: requests,
  }), [requests])
  const visibleRequests = requestViews[requestView]

  async function loadPage() {
    setError('')
    const [serviceResult, requestResult] = await Promise.all([
      getServiceOptions(),
      getCustomerServiceRequests(user.id),
    ])
    const loadError = serviceResult.error || requestResult.error
    if (loadError) setError(getErrorMessage(loadError))
    setServices(serviceResult.data || [])
    setRequests(requestResult.data || [])
    setIsLoading(false)
  }

  useEffect(() => {
    let isMounted = true
    Promise.all([
      getServiceOptions(),
      getCustomerServiceRequests(user.id),
    ]).then(([serviceResult, requestResult]) => {
      if (!isMounted) return
      const loadError = serviceResult.error || requestResult.error
      if (loadError) setError(getErrorMessage(loadError))
      setServices(serviceResult.data || [])
      if (requestedServiceId && serviceResult.data?.some((service) => service.id === requestedServiceId)) {
        setForm((current) => ({ ...current, serviceId: requestedServiceId }))
      }
      setRequests(requestResult.data || [])
      setIsLoading(false)
    })

    return () => {
      isMounted = false
    }
  }, [requestedServiceId, user.id])

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function updateAnswer(key, value) {
    setForm((current) => ({
      ...current,
      diagnosisAnswers: { ...current.diagnosisAnswers, [key]: value },
    }))
  }

  function handleServiceChange(serviceId) {
    setForm((current) => ({
      ...current,
      diagnosisAnswers: {},
      serviceId,
    }))
  }

  function goToNextStep() {
    setError('')

    if (formStep === 1) {
      const missingAnswer = questions.some((question) => !form.diagnosisAnswers[question.key]?.trim())
      if (!form.serviceId || !form.issueTitle.trim() || !form.issueDetails.trim() || missingAnswer) {
        setError('Choose a service and complete the job details. “I don’t know” is an acceptable answer.')
        return
      }
    }

    if (formStep === 2 && (!form.address.trim() || !form.city.trim() || !form.state.trim())) {
      setError('Enter the service address, city or area, and state before reviewing your request.')
      return
    }

    setFormStep((current) => Math.min(current + 1, 3))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setIsSaving(true)
    const { error: createError } = await createServiceRequest(form)
    if (createError) {
      setError(getErrorMessage(createError))
      setIsSaving(false)
      return
    }
    setForm({
      ...initialForm,
      city: user?.city || '',
      serviceId: requestedServiceId,
      state: user?.state || '',
    })
    setFormStep(1)
    await loadPage()
    setIsSaving(false)
    showToast('Your request is live. Matching professionals can now send sealed offers.')
  }

  async function handleAccept(request, bid) {
    setError('')
    setAcceptingBidId(bid.id)
    const { data, error: acceptError } = await acceptServiceRequestBid({ bid, requestId: request.id })
    if (acceptError) {
      setError(getErrorMessage(acceptError))
      setAcceptingBidId('')
      return
    }
    await loadPage()
    setAcceptingBidId('')
    setOfferToAccept(null)
    showToast('Offer accepted. Your booking and private conversation are ready.')
    if (data?.id) window.dispatchEvent(new CustomEvent('handiwave-awareness-refresh'))
  }

  return (
    <div className="starter-page marketplace-page">
      <section className="page-hero compact marketplace-hero">
        <p className="section-kicker">Request offers</p>
        <h1>Describe the job once. Compare trusted offers.</h1>
        <p>Handiwave shares your request with verified professionals who match the service and location. Their prices stay sealed from one another.</p>
        <div className="marketplace-hero-steps">
          <span><strong>1</strong> Describe the job</span>
          <span><strong>2</strong> Receive sealed offers</span>
          <span><strong>3</strong> Choose with confidence</span>
        </div>
      </section>

      {error && <p className="auth-error page-error">{error}</p>}

      <section className="marketplace-layout">
        <form className="marketplace-request-form" onSubmit={handleSubmit}>
          <div className="booking-history-header">
            <p className="section-kicker">New request</p>
            <h2>Help professionals understand the work</h2>
          </div>

          <div className="marketplace-stepper" aria-label="Request progress">
            {['Job details', 'Location & timing', 'Review'].map((label, index) => (
              <button
                className={formStep === index + 1 ? 'active' : formStep > index + 1 ? 'complete' : ''}
                disabled={index + 1 > formStep}
                key={label}
                type="button"
                onClick={() => setFormStep(index + 1)}
              >
                <strong>{formStep > index + 1 ? '✓' : index + 1}</strong>
                <span>{label}</span>
              </button>
            ))}
          </div>

          {formStep === 1 && (
            <>
              <div className="marketplace-form-grid">
                <label>
                  <span>Service</span>
                  <select disabled={isLoading} required value={form.serviceId} onChange={(event) => handleServiceChange(event.target.value)}>
                    <option value="">Choose a service</option>
                    {services.map((service) => <option key={service.id} value={service.id}>{service.icon} {service.name}</option>)}
                  </select>
                </label>
                <label>
                  <span>Short job title</span>
                  <input required placeholder="e.g. Printer powers on but will not print" value={form.issueTitle} onChange={(event) => updateForm('issueTitle', event.target.value)} />
                </label>
                <label className="full-width">
                  <span>Describe what you noticed</span>
                  <textarea required placeholder="You do not need to know the technical fault. Describe what you see, hear, or experience." value={form.issueDetails} onChange={(event) => updateForm('issueDetails', event.target.value)} />
                </label>
              </div>

              {form.serviceId && (
                <div className="marketplace-diagnosis-panel">
                  <div>
                    <strong>Quick questions</strong>
                    <p>“I don’t know” is a valid answer. These details help professionals quote responsibly.</p>
                  </div>
                  {questions.map((question) => (
                    <label key={question.key}>
                      <span>{question.label}</span>
                      <input required placeholder="Your answer or I don’t know" value={form.diagnosisAnswers[question.key] || ''} onChange={(event) => updateAnswer(question.key, event.target.value)} />
                    </label>
                  ))}
                </div>
              )}
            </>
          )}

          {formStep === 2 && (
            <div className="marketplace-form-grid">
              <label>
                <span>Urgency</span>
                <select value={form.urgency} onChange={(event) => updateForm('urgency', event.target.value)}>
                  <option value="urgent">Urgent</option>
                  <option value="today">Today</option>
                  <option value="this_week">This week</option>
                  <option value="flexible">Flexible</option>
                </select>
              </label>
              <label>
                <span>Materials</span>
                <select value={form.materialsPreference} onChange={(event) => updateForm('materialsPreference', event.target.value)}>
                  <option value="professional_to_advise">Professional should advise</option>
                  <option value="professional_to_supply">Professional should supply</option>
                  <option value="customer_has_materials">I already have materials</option>
                </select>
              </label>
              <label><span>Preferred date (optional)</span><input min={new Date().toISOString().slice(0, 10)} type="date" value={form.preferredDate} onChange={(event) => updateForm('preferredDate', event.target.value)} /></label>
              <label><span>Preferred time (optional)</span><input type="time" value={form.preferredTime} onChange={(event) => updateForm('preferredTime', event.target.value)} /></label>
              <label className="full-width"><span>Exact address</span><input required placeholder="Hidden until you choose a professional" value={form.address} onChange={(event) => updateForm('address', event.target.value)} /></label>
              <label><span>City / area</span><input required placeholder="Kaduna North or Wuse" value={form.city} onChange={(event) => updateForm('city', event.target.value)} /></label>
              <label>
                <span>State</span>
                <input list="handiwave-pilot-states" placeholder="Kaduna or FCT" required value={form.state} onChange={(event) => updateForm('state', event.target.value)} />
                <datalist id="handiwave-pilot-states">
                  <option value="Kaduna" />
                  <option value="FCT" />
                </datalist>
              </label>
              {form.state && !['kaduna', 'fct', 'abuja'].includes(form.state.trim().toLowerCase()) && <p className="marketplace-expansion-note full-width">Handiwave is starting in Kaduna and Abuja. You can still register this request, and we will contact you as coverage expands.</p>}
            </div>
          )}

          {formStep === 3 && (
            <div className="marketplace-review-panel">
              <span>Ready to publish</span>
              <h3>{form.issueTitle}</h3>
              <p>{selectedService?.icon} {selectedService?.name} • {form.city}, {form.state}</p>
              <p>{form.issueDetails}</p>
              <div>
                <strong>What happens next?</strong>
                <ul>
                  <li>Matching verified professionals can send private, sealed offers.</li>
                  <li>Your exact address stays hidden until you choose an offer.</li>
                  <li>You are not charged when publishing this request.</li>
                </ul>
              </div>
            </div>
          )}

          <div className="marketplace-step-actions">
            {formStep > 1 && <button className="secondary-cta" disabled={isSaving} type="button" onClick={() => setFormStep((current) => current - 1)}>Back</button>}
            {formStep < 3 ? (
              <button className="primary-cta" type="button" onClick={goToNextStep}>Continue</button>
            ) : (
              <button className="primary-cta" disabled={isSaving} type="submit">{isSaving ? 'Publishing...' : 'Publish Free Request'}</button>
            )}
          </div>
        </form>

        <section className="marketplace-request-list">
          <div className="booking-history-header">
            <p className="section-kicker">Your requests</p>
            <h2>Offers and progress</h2>
          </div>
          {requests.length > 0 && (
            <div className="marketplace-request-tabs">
              {[['active', 'Active'], ['awarded', 'Selected'], ['all', 'All']].map(([value, label]) => (
                <button className={requestView === value ? 'active' : ''} key={value} type="button" onClick={() => setRequestView(value)}>
                  {label} <span>{requestViews[value].length}</span>
                </button>
              ))}
            </div>
          )}
          {isLoading ? <p>Loading requests...</p> : requests.length === 0 ? (
            <EmptyState title="No requests yet">Your first request will appear here.</EmptyState>
          ) : visibleRequests.length === 0 ? (
            <EmptyState title={`No ${requestView} requests`}>Choose another tab to view your requests.</EmptyState>
          ) : visibleRequests.map((request) => (
            <article className="marketplace-request-card" key={request.id}>
              <div className="marketplace-card-header">
                <div><span>{request.service.icon} {request.service.name}</span><h3>{request.issueTitle}</h3></div>
                <span className={`request-status status-${request.status}`}>{getRequestStatusLabel(request.status)}</span>
              </div>
              <p>{request.issueDetails}</p>
              <small>{request.city}, {request.state} • {request.urgency.replaceAll('_', ' ')} • {request.bids.length} offer{request.bids.length === 1 ? '' : 's'}</small>
              {request.status === 'awarded' && request.bookingId && (
                <div className="marketplace-awarded-actions">
                  <Link to={`/messages?booking=${request.bookingId}`}>Open private conversation</Link>
                  <Link to="/bookings">View booking</Link>
                </div>
              )}
              {request.status === 'open' && request.bids.map((bid) => (
                <div className="marketplace-bid-card" key={bid.id}>
                  <div><strong>{bid.artisanName}</strong><span>{bid.verified ? 'Verified professional' : 'Professional'} • {bid.reviewCount ? `${bid.rating.toFixed(1)} from ${bid.reviewCount} review${bid.reviewCount === 1 ? '' : 's'}` : 'New on Handiwave'}{bid.completedJobs ? ` • ${bid.completedJobs} completed job${bid.completedJobs === 1 ? '' : 's'}` : ''}</span></div>
                  <strong className="marketplace-bid-price">{getBidPrice(bid)}</strong>
                  <p>{bid.message}</p>
                  <small>{bid.durationEstimate || 'Duration to be agreed'}{bid.guaranteeText ? ` • ${bid.guaranteeText}` : ''}</small>
                  <div className="marketplace-bid-actions">
                    <Link to={`/artisan-profile/${bid.artisanId}`}>View profile</Link>
                    <button disabled={acceptingBidId === bid.id} type="button" onClick={() => setOfferToAccept({ bid, request })}>Review & Choose</button>
                  </div>
                </div>
              ))}
              {request.status === 'open' && request.bids.length === 0 && (
                <p className="marketplace-waiting-note">Your request is live. Suitable verified professionals will see it and can send sealed offers.</p>
              )}
            </article>
          ))}
        </section>
      </section>

      {offerToAccept && (
        <div className="marketplace-confirm-backdrop" role="presentation" onClick={() => setOfferToAccept(null)}>
          <div aria-modal="true" className="marketplace-confirm-card" role="dialog" onClick={(event) => event.stopPropagation()}>
            <span>Confirm your choice</span>
            <h2>{offerToAccept.bid.artisanName}</h2>
            <strong>{getBidPrice(offerToAccept.bid)}</strong>
            <p>Choosing this offer closes the request, creates a booking, and opens a private conversation with this professional.</p>
            <div>
              <button className="secondary-cta" disabled={acceptingBidId === offerToAccept.bid.id} type="button" onClick={() => setOfferToAccept(null)}>Keep comparing</button>
              <button className="primary-cta" disabled={acceptingBidId === offerToAccept.bid.id} type="button" onClick={() => handleAccept(offerToAccept.request, offerToAccept.bid)}>{acceptingBidId === offerToAccept.bid.id ? 'Choosing offer...' : 'Confirm This Offer'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
