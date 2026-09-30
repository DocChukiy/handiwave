export default function BookingDisputeModal({
  isOpen,
  booking,
  disputeForm,
  isSubmitting,
  onClose,
  onSubmit,
  updateDisputeForm,
}) {
  if (!isOpen || !booking) {
    return null
  }

  return (
    <div className="hw-booking-modal-backdrop" role="presentation" onClick={onClose}>
      <form
        className="hw-booking-modal hw-booking-dispute-report-modal"
        onSubmit={onSubmit}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="hw-booking-modal-header">
          <h2>{booking.service}</h2>
          <button type="button" onClick={onClose}>×</button>
        </div>

        <div className="hw-booking-modal-body">
          <p className="section-kicker">Report issue</p>
          <p>Share what happened so Handiwave support can review the booking fairly.</p>

          <div className="hw-booking-form-grid" style={{ marginTop: 'var(--hw-space-4)' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="hw-booking-label">
                Reason
                <select
                  className="hw-booking-select"
                  required
                  value={disputeForm.reason}
                  onChange={(event) => updateDisputeForm('reason', event.target.value)}
                >
                  <option value="">Choose a reason</option>
                  <option value="Job was not completed">Job was not completed</option>
                  <option value="Poor quality work">Poor quality work</option>
                  <option value="Artisan did not arrive">Artisan did not arrive</option>
                  <option value="Payment or refund issue">Payment or refund issue</option>
                  <option value="Safety concern">Safety concern</option>
                </select>
              </label>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label className="hw-booking-label">
                Description
                <textarea
                  className="hw-booking-textarea"
                  required
                  placeholder="Describe the issue clearly."
                  value={disputeForm.description}
                  onChange={(event) => updateDisputeForm('description', event.target.value)}
                />
              </label>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label className="hw-booking-label">
                Requested resolution
                <input
                  className="hw-booking-input"
                  placeholder="Refund, rework, support review..."
                  value={disputeForm.requestedResolution}
                  onChange={(event) => updateDisputeForm('requestedResolution', event.target.value)}
                />
              </label>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label className="hw-booking-label">
                Optional refund amount
                <input
                  className="hw-booking-input"
                  min="0"
                  placeholder="25000"
                  type="number"
                  value={disputeForm.refundAmount}
                  onChange={(event) => updateDisputeForm('refundAmount', event.target.value)}
                />
              </label>
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <label className="hw-booking-label">
                Evidence
                <input
                  className="hw-booking-input"
                  type="file"
                  onChange={(event) => updateDisputeForm('evidenceFile', event.target.files?.[0] || null)}
                />
              </label>
            </div>
          </div>
        </div>

        <div className="hw-booking-modal-footer">
          <button
            className="secondary-cta"
            disabled={isSubmitting}
            type="button"
            onClick={onClose}
          >
            Cancel
          </button>
          <button className="primary-cta" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Submitting...' : 'Open Dispute'}
          </button>
        </div>
      </form>
    </div>
  )
}
