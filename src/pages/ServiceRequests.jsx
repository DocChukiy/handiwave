import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
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

export default function ServiceRequests() {
  const { user } = useAuth()
  const [form, setForm] = useState(initialForm)
  const [services, setServices] = useState([])
  const [requests, setRequests] = useState([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [acceptingBidId, setAcceptingBidId] = useState('')

  const selectedService = services.find((service) => service.id === form.serviceId)
  const questions = useMemo(() => getDiagnosticQuestions(selectedService), [selectedService])

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
      setRequests(requestResult.data || [])
      setIsLoading(false)
    })

    return () => {
      isMounted = false
    }
  }, [user.id])

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function updateAnswer(key, value) {
    setForm((current) => ({
      ...current,
      diagnosisAnswers: { ...current.diagnosisAnswers, [key]: value },
    }))
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
    setForm(initialForm)
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
    showToast('Offer accepted. Your booking and private conversation are ready.')
    if (data?.id) window.dispatchEvent(new CustomEvent('handiwave-awareness-refresh'))
  }

  return (
    <div className="starter-page marketplace-page">
      <section className="page-hero compact marketplace-hero">
        <p className="section-kicker">Request offers</p>
        <h1>Describe the job once. Compare trusted offers.</h1>
        <p>Handiwave shares your request with verified professionals who match the service and location. Their prices stay sealed from one another.</p>
      </section>

      {error && <p className="auth-error page-error">{error}</p>}

      <section className="marketplace-layout">
        <form className="marketplace-request-form" onSubmit={handleSubmit}>
          <div className="booking-history-header">
            <p className="section-kicker">New request</p>
            <h2>Help professionals understand the work</h2>
          </div>

          <div className="marketplace-form-grid">
            <label>
              <span>Service</span>
              <select required value={form.serviceId} onChange={(event) => updateForm('serviceId', event.target.value)}>
                <option value="">Choose a service</option>
                {services.map((service) => <option key={service.id} value={service.id}>{service.icon} {service.name}</option>)}
              </select>
            </label>
            <label>
              <span>Short job title</span>
              <input required placeholder="e.g. Printer powers on but will not print" value={form.issueTitle} onChange={(event) => updateForm('issueTitle', event.target.value)} />
            </label>
            <label className="full-width">
              <span>Describe what you need</span>
              <textarea required placeholder="Tell us what you noticed. You do not need to know the technical fault." value={form.issueDetails} onChange={(event) => updateForm('issueDetails', event.target.value)} />
            </label>
          </div>

          {form.serviceId && (
            <div className="marketplace-diagnosis-panel">
              <div>
                <strong>Quick questions</strong>
                <p>“I don't know” is a valid answer. These details only help professionals price responsibly.</p>
              </div>
              {questions.map((question) => (
                <label key={question.key}>
                  <span>{question.label}</span>
                  <input required placeholder="Your answer or I don't know" value={form.diagnosisAnswers[question.key] || ''} onChange={(event) => updateAnswer(question.key, event.target.value)} />
                </label>
              ))}
            </div>
          )}

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
            <label><span>Preferred date</span><input type="date" value={form.preferredDate} onChange={(event) => updateForm('preferredDate', event.target.value)} /></label>
            <label><span>Preferred time</span><input type="time" value={form.preferredTime} onChange={(event) => updateForm('preferredTime', event.target.value)} /></label>
            <label className="full-width"><span>Exact address</span><input required placeholder="Kept hidden until you choose a professional" value={form.address} onChange={(event) => updateForm('address', event.target.value)} /></label>
            <label><span>City / area</span><input required placeholder="Kaduna North" value={form.city} onChange={(event) => updateForm('city', event.target.value)} /></label>
            <label><span>State</span><input required placeholder="Kaduna" value={form.state} onChange={(event) => updateForm('state', event.target.value)} /></label>
          </div>
          <button className="primary-cta" disabled={isSaving} type="submit">{isSaving ? 'Publishing...' : 'Publish Request'}</button>
        </form>

        <section className="marketplace-request-list">
          <div className="booking-history-header">
            <p className="section-kicker">Your requests</p>
            <h2>Offers and progress</h2>
          </div>
          {isLoading ? <p>Loading requests...</p> : requests.length === 0 ? (
            <EmptyState title="No requests yet">Your first request will appear here.</EmptyState>
          ) : requests.map((request) => (
            <article className="marketplace-request-card" key={request.id}>
              <div className="marketplace-card-header">
                <div><span>{request.service.icon} {request.service.name}</span><h3>{request.issueTitle}</h3></div>
                <span className={`request-status status-${request.status}`}>{request.status}</span>
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
                  <div><strong>{bid.artisanName}</strong><span>{bid.verified ? 'Verified' : 'Professional'} • {bid.rating ? `${bid.rating.toFixed(1)} rating` : 'New'} • {bid.completedJobs} jobs</span></div>
                  <strong className="marketplace-bid-price">{getBidPrice(bid)}</strong>
                  <p>{bid.message}</p>
                  <small>{bid.durationEstimate || 'Duration to be agreed'}{bid.guaranteeText ? ` • ${bid.guaranteeText}` : ''}</small>
                  <button disabled={acceptingBidId === bid.id} type="button" onClick={() => handleAccept(request, bid)}>{acceptingBidId === bid.id ? 'Accepting...' : 'Choose This Offer'}</button>
                </div>
              ))}
            </article>
          ))}
        </section>
      </section>
    </div>
  )
}
