import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import EmptyState from '../components/EmptyState.jsx'
import SkeletonPreview from '../components/Skeletons.jsx'
import {
  assignDispute,
  getDisputeDetails,
  getDisputesForUser,
  refundDisputeCustomer,
  rejectDispute,
  releaseDisputeEscrow,
  sendDisputeMessage,
  uploadDisputeEvidence,
} from '../services/disputeService.js'
import { showToast } from '../utils/toast.js'

const statusLabels = {
  awaiting_artisan: 'Awaiting Artisan',
  awaiting_customer: 'Awaiting Customer',
  closed: 'Closed',
  in_review: 'In Review',
  open: 'Open',
  refunded: 'Refunded',
  rejected: 'Rejected',
  resolved: 'Resolved',
}

function getErrorMessage(error) {
  return [
    error?.message,
    error?.details,
    error?.hint,
    error?.code,
  ].filter(Boolean).join(' ')
}

function formatDate(value) {
  if (!value) {
    return 'No date'
  }

  return new Intl.DateTimeFormat('en-NG', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function StatusBadge({ status }) {
  return (
    <span className={`dispute-status-badge ${status}`}>
      {statusLabels[status] || status?.replaceAll('_', ' ') || 'Open'}
    </span>
  )
}

function Disputes() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const [actionResolution, setActionResolution] = useState('')
  const [details, setDetails] = useState({ evidence: [], messages: [] })
  const [disputes, setDisputes] = useState([])
  const [error, setError] = useState('')
  const [evidenceFile, setEvidenceFile] = useState(null)
  const [evidenceNote, setEvidenceNote] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [message, setMessage] = useState('')
  const [refundAmount, setRefundAmount] = useState('')
  const [selectedDisputeId, setSelectedDisputeId] = useState(searchParams.get('id') || '')

  const selectedDispute = useMemo(() => (
    disputes.find((dispute) => dispute.id === selectedDisputeId) || disputes[0] || null
  ), [disputes, selectedDisputeId])

  async function loadDisputes() {
    setError('')
    setIsLoading(true)

    try {
      const { data, error: disputeError } = await getDisputesForUser(user)

      if (disputeError) {
        setError(getErrorMessage(disputeError))
        return
      }

      setDisputes(data)
      if (!selectedDisputeId && data[0]?.id) {
        setSelectedDisputeId(data[0].id)
      }
    } catch (loadError) {
      setError(getErrorMessage(loadError))
    } finally {
      setIsLoading(false)
    }
  }

  async function loadDetails(disputeId) {
    if (!disputeId) {
      setDetails({ evidence: [], messages: [] })
      return
    }

    const { data, error: detailError } = await getDisputeDetails(disputeId)

    if (detailError) {
      setError(getErrorMessage(detailError))
      return
    }

    setDetails(data)
  }

  useEffect(() => {
    Promise.resolve().then(loadDisputes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, user.role])

  useEffect(() => {
    Promise.resolve().then(() => loadDetails(selectedDispute?.id))
  }, [selectedDispute?.id])

  async function refreshSelectedDispute() {
    await Promise.all([
      loadDisputes(),
      loadDetails(selectedDispute?.id),
    ])
  }

  async function handleSendMessage(event) {
    event.preventDefault()

    if (!selectedDispute || !message.trim()) {
      return
    }

    setError('')
    setIsSending(true)

    try {
      const { error: messageError } = await sendDisputeMessage({
        body: message.trim(),
        disputeId: selectedDispute.id,
        internalOnly: user.role === 'admin',
        senderId: user.id,
      })

      if (messageError) {
        setError(getErrorMessage(messageError))
        return
      }

      setMessage('')
      await loadDetails(selectedDispute.id)
      showToast('Dispute message sent.')
    } catch (messageError) {
      setError(getErrorMessage(messageError))
    } finally {
      setIsSending(false)
    }
  }

  async function handleEvidenceSubmit(event) {
    event.preventDefault()

    if (!selectedDispute || !evidenceFile) {
      setError('Choose an evidence file to upload.')
      return
    }

    setError('')
    setIsSending(true)

    try {
      const { error: evidenceError } = await uploadDisputeEvidence({
        description: evidenceNote,
        disputeId: selectedDispute.id,
        file: evidenceFile,
        internalOnly: user.role === 'admin',
        userId: user.id,
      })

      if (evidenceError) {
        setError(getErrorMessage(evidenceError))
        return
      }

      setEvidenceFile(null)
      setEvidenceNote('')
      await loadDetails(selectedDispute.id)
      showToast('Evidence uploaded.')
    } catch (evidenceError) {
      setError(getErrorMessage(evidenceError))
    } finally {
      setIsSending(false)
    }
  }

  async function handleAdminAction(action) {
    if (!selectedDispute) {
      return
    }

    setError('')
    setIsSending(true)

    try {
      const payload = {
        disputeId: selectedDispute.id,
        refundAmount,
        resolution: actionResolution || `Admin action: ${action}`,
      }
      const result = action === 'assign'
        ? await assignDispute(selectedDispute.id)
        : action === 'refund'
          ? await refundDisputeCustomer(payload)
          : action === 'release'
            ? await releaseDisputeEscrow(payload)
            : await rejectDispute(payload)

      if (result.error) {
        setError(getErrorMessage(result.error))
        return
      }

      setActionResolution('')
      setRefundAmount('')
      await refreshSelectedDispute()
      showToast('Dispute action completed.')
    } catch (actionError) {
      setError(getErrorMessage(actionError))
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="starter-page disputes-page">
      <section className="page-hero compact">
        <p className="section-kicker">Disputes</p>
        <h1>{user.role === 'admin' ? 'Resolve platform disputes' : 'Manage booking issues'}</h1>
        <p>Review evidence, follow the timeline, and keep dispute messages in one clear workspace.</p>
      </section>

      {error && <p className="auth-error page-error">{error}</p>}

      {isLoading ? (
        <SkeletonPreview count={5} label="Loading disputes" type="service" />
      ) : disputes.length === 0 ? (
        <EmptyState title="No disputes yet">
          Booking issues and evidence will appear here once a dispute is opened.
        </EmptyState>
      ) : (
        <section className="disputes-layout">
          <aside className="list-panel dispute-list">
            {disputes.map((dispute) => (
              <button
                className={selectedDispute?.id === dispute.id ? 'dispute-list-item active' : 'dispute-list-item'}
                key={dispute.id}
                type="button"
                onClick={() => setSelectedDisputeId(dispute.id)}
              >
                <strong>{dispute.service}</strong>
                <span>{dispute.customer} • {dispute.artisan}</span>
                <StatusBadge status={dispute.status} />
              </button>
            ))}
          </aside>

          {selectedDispute && (
            <section className="dispute-detail-panel">
              <div className="dispute-detail-header">
                <div>
                  <p className="section-kicker">Dispute details</p>
                  <h2>{selectedDispute.reason}</h2>
                  <p>{selectedDispute.description || selectedDispute.requestedResolution || 'No extra description added.'}</p>
                </div>
                <StatusBadge status={selectedDispute.status} />
              </div>

              <div className="dispute-meta-grid">
                <article><strong>{selectedDispute.service}</strong><span>Booking</span></article>
                <article><strong>{selectedDispute.customer}</strong><span>Customer</span></article>
                <article><strong>{selectedDispute.artisan}</strong><span>Artisan</span></article>
                <article><strong>{formatDate(selectedDispute.createdAt)}</strong><span>Opened</span></article>
              </div>

              <section className="dispute-timeline">
                <h3>Timeline</h3>
                <div className="timeline-item">
                  <span></span>
                  <div>
                    <strong>Dispute opened</strong>
                    <p>{formatDate(selectedDispute.createdAt)}</p>
                  </div>
                </div>
                {details.messages.map((item) => (
                  <div className="timeline-item" key={item.id}>
                    <span></span>
                    <div>
                      <strong>{item.sender}{item.internalOnly ? ' internal note' : ''}</strong>
                      <p>{item.body}</p>
                      <small>{formatDate(item.createdAt)}</small>
                    </div>
                  </div>
                ))}
              </section>

              <section className="dispute-evidence-panel">
                <h3>Evidence</h3>
                {details.evidence.length > 0 ? (
                  <div className="evidence-grid">
                    {details.evidence.map((item) => (
                      <a href={item.signedUrl} key={item.id} rel="noreferrer" target="_blank">
                        <strong>{item.fileName}</strong>
                        <span>{item.uploadedBy}</span>
                        {item.description && <small>{item.description}</small>}
                      </a>
                    ))}
                  </div>
                ) : (
                  <EmptyState compact title="No evidence yet">
                    Uploaded photos, PDFs, or videos will appear here.
                  </EmptyState>
                )}
              </section>

              <form className="dispute-form-card" onSubmit={handleEvidenceSubmit}>
                <h3>Upload evidence</h3>
                <label>
                  Evidence note
                  <input
                    placeholder="Receipt, photo, or service proof"
                    value={evidenceNote}
                    onChange={(event) => setEvidenceNote(event.target.value)}
                  />
                </label>
                <label>
                  Evidence file
                  <input
                    type="file"
                    onChange={(event) => setEvidenceFile(event.target.files?.[0] || null)}
                  />
                </label>
                <button disabled={isSending} type="submit">
                  {isSending ? 'Uploading...' : 'Upload Evidence'}
                </button>
              </form>

              <form className="dispute-form-card" onSubmit={handleSendMessage}>
                <h3>{user.role === 'admin' ? 'Add internal note' : 'Send dispute message'}</h3>
                <label>
                  Message
                  <textarea
                    placeholder="Write your response..."
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                  />
                </label>
                <button disabled={isSending} type="submit">
                  {isSending ? 'Sending...' : 'Send Message'}
                </button>
              </form>

              {user.role === 'admin' && (
                <section className="dispute-admin-actions">
                  <h3>Admin resolution</h3>
                  <label>
                    Resolution note
                    <textarea
                      placeholder="Explain the decision."
                      value={actionResolution}
                      onChange={(event) => setActionResolution(event.target.value)}
                    />
                  </label>
                  <label>
                    Refund amount
                    <input
                      min="0"
                      placeholder="Optional"
                      type="number"
                      value={refundAmount}
                      onChange={(event) => setRefundAmount(event.target.value)}
                    />
                  </label>
                  <div className="dispute-action-grid">
                    <button disabled={isSending} type="button" onClick={() => handleAdminAction('assign')}>Assign to me</button>
                    <button disabled={isSending} type="button" onClick={() => handleAdminAction('refund')}>Refund Customer</button>
                    <button disabled={isSending} type="button" onClick={() => handleAdminAction('release')}>Release Escrow</button>
                    <button disabled={isSending} type="button" onClick={() => handleAdminAction('reject')}>Reject Dispute</button>
                  </div>
                </section>
              )}
            </section>
          )}
        </section>
      )}
    </div>
  )
}

export default Disputes
