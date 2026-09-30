import { Link } from 'react-router-dom'
import Card from '../ui/Card.jsx'
import Avatar from '../ui/Avatar.jsx'

function getArtisanName(artisan) {
  return artisan.profile?.full_name || artisan.business_name || 'Handiwave artisan'
}

function getBookingArtisanTrust(artisan) {
  const rating = Number(artisan?.average_rating) || 0
  const reviewCount = artisan?.review_count || 0
  const completedJobs = artisan?.completed_jobs || 0
  const isVerified = artisan?.verification_status === 'verified'
  const isTopRated = rating >= 4.5 && reviewCount >= 3

  return {
    completedJobs,
    isTopRated,
    isVerified,
    primaryService: artisan?.primary_service?.name || 'Service professional',
    rating,
    reviewCount,
  }
}

function BookingArtisanTrustCard({ artisan }) {
  if (!artisan) return null

  const trust = getBookingArtisanTrust(artisan)

  return (
    <div className="hw-booking-artisan-trust-card">
      <div className="hw-booking-artisan-trust-header">
        <div>
          <strong>{getArtisanName(artisan)}</strong>
          <span>{trust.primaryService} in {artisan.city}, {artisan.state}</span>
        </div>
        {trust.isVerified && <span className="hw-booking-trust-badge verified">Verified Artisan</span>}
      </div>

      <div className="hw-booking-artisan-trust-grid">
        <span>
          <strong>{trust.reviewCount > 0 ? trust.rating.toFixed(1) : 'New'}</strong>
          {trust.reviewCount > 0 ? `${trust.reviewCount} review${trust.reviewCount === 1 ? '' : 's'}` : 'No reviews yet'}
        </span>
        <span>
          <strong>{trust.completedJobs}</strong>
          Completed jobs
        </span>
        <span>
          <strong>{trust.isTopRated ? 'Yes' : 'Building'}</strong>
          Top rated
        </span>
      </div>

      <div className="hw-booking-trust-badge-row">
        {trust.isTopRated && <span className="hw-booking-trust-badge top-rated">Top Rated</span>}
        <span className="hw-booking-trust-badge fast">Fast Responder</span>
        {trust.completedJobs >= 10 && (
          <span className="hw-booking-trust-badge jobs">
            {trust.completedJobs >= 100
              ? '100+ Jobs Completed'
              : trust.completedJobs >= 50
              ? '50+ Jobs Completed'
              : '10+ Jobs Completed'}
          </span>
        )}
      </div>
    </div>
  )
}

export default function BookingForm({
  form,
  updateForm,
  handleSubmit,
  handleArtisanChange,
  handleDateChange,
  handleAttachmentChange,
  handleRemoveAttachment,
  options,
  selectedArtisan,
  selectedService,
  availability,
  availabilityError,
  availableDayLabels,
  availableBookingDates,
  availableTimesForSelectedDate,
  dateDayOfWeek,
  slotsForSelectedDate,
  isSelectedDateUnavailable,
  isLoadingAvailability,
  isLoading,
  isSaving,
  imagePreviews,
  uploadProgress,
  attachmentInputKey,
}) {
  const getAvailableTimesForDate = (date) => {
    if (!date) return []

    const [year, month, day] = date.split('-').map(Number)
    const dayOfWeek = new Date(year, month - 1, day).getDay()
    const matchingDaySlots = availability.slots.filter((slot) => (
      Number(slot.dayOfWeek) === dayOfWeek
    ))
    const bookedTimes = new Set(
      availability.bookedSlots
        .filter((slot) => slot.date === date)
        .map((slot) => slot.time),
    )

    const timeToMinutes = (time) => {
      const [hours, minutes] = time.split(':').map(Number)
      return (hours * 60) + minutes
    }

    const minutesToTime = (totalMinutes) => {
      const hours = String(Math.floor(totalMinutes / 60)).padStart(2, '0')
      const minutes = String(totalMinutes % 60).padStart(2, '0')
      return `${hours}:${minutes}`
    }

    const times = []
    for (const slot of matchingDaySlots) {
      const startMinutes = timeToMinutes(slot.startTime)
      const endMinutes = timeToMinutes(slot.endTime)
      for (let currentMinutes = startMinutes; currentMinutes < endMinutes; currentMinutes += 60) {
        const timeValue = minutesToTime(currentMinutes)
        if (!bookedTimes.has(timeValue)) {
          times.push({
            label: timeValue,
            slotId: slot.id,
            value: timeValue,
          })
        }
      }
    }

    return times
  }

  const timesForSelectedDate = getAvailableTimesForDate(form.scheduledDate)

  return (
    <form onSubmit={handleSubmit}>
      <Card variant="default" padding="lg" className="hw-booking-form">
        <h2>Book a Service</h2>

      <div className="hw-booking-form-section">
        <h3 className="hw-booking-form-section-title">Choose Professional</h3>
        <div className="hw-booking-form-grid">
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="hw-booking-label">
              Preferred artisan
              <select
                className="hw-booking-select"
                disabled={isLoading || isSaving}
                value={form.artisanId}
                onChange={(event) => handleArtisanChange(event.target.value)}
              >
                <option value="">Select an artisan</option>
                {options.artisans.map((artisan) => (
                  <option key={artisan.id} value={artisan.id}>
                    {getArtisanName(artisan)} • {artisan.city}, {artisan.state}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label className="hw-booking-label">
              Service type
              <select
                className="hw-booking-select"
                disabled={isLoading || isSaving}
                value={form.serviceId}
                onChange={(event) => updateForm('serviceId', event.target.value)}
              >
                <option value="">Select a service</option>
                {options.services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {selectedArtisan && selectedService && (
          <p className="hw-booking-price-note">
            {getArtisanName(selectedArtisan)} usually handles {selectedService.name}
            {selectedArtisan.starting_price
              ? ` from NGN ${Number(selectedArtisan.starting_price).toLocaleString()}.`
              : '.'}
          </p>
        )}

        <BookingArtisanTrustCard artisan={selectedArtisan} />

        {selectedArtisan && (
          <div className="hw-booking-availability-panel">
            <strong>Available slots</strong>
            <p>
              Pick a date that matches this artisan's weekly schedule. Handiwave also checks blocked dates and existing bookings before submission.
            </p>
            {isLoadingAvailability ? (
              <p>Loading artisan availability...</p>
            ) : availabilityError ? (
              <p style={{ color: 'var(--hw-error-text)' }}>{availabilityError}</p>
            ) : availableDayLabels.length > 0 ? (
              <>
                <div className="hw-booking-availability-chip-row">
                  {availableDayLabels.map((day) => (
                    <span key={day}>{day}</span>
                  ))}
                </div>
                {availability.unavailableDates.length > 0 && (
                  <p>
                    Blocked dates: {availability.unavailableDates
                      .slice(0, 3)
                      .map((date) => date.unavailableDate)
                      .join(', ')}
                    {availability.unavailableDates.length > 3 ? '...' : ''}
                  </p>
                )}
              </>
            ) : (
              <>
                <p>This artisan has not added bookable availability yet.</p>
                <Link className="secondary-cta compact-cta" to="/messages">
                  Message Artisan
                </Link>
              </>
            )}
          </div>
        )}
      </div>

      <div className="hw-booking-form-section">
        <h3 className="hw-booking-form-section-title">Schedule</h3>
        <div className="hw-booking-form-row">
          <label className="hw-booking-label">
            Date
            <select
              className="hw-booking-select"
              disabled={
                isSaving ||
                isLoadingAvailability ||
                availableBookingDates.length === 0
              }
              value={form.scheduledDate}
              onChange={(event) => handleDateChange(event.target.value)}
            >
              <option value="">Select available date</option>
              {availableBookingDates.map((date) => (
                <option key={date.value} value={date.value}>
                  {date.label}
                </option>
              ))}
            </select>
          </label>

          <label className="hw-booking-label">
            Time
            <select
              className="hw-booking-select"
              disabled={
                isSaving ||
                isLoadingAvailability ||
                !form.scheduledDate ||
                isSelectedDateUnavailable ||
                timesForSelectedDate.length === 0
              }
              value={form.scheduledTime}
              onChange={(event) => updateForm('scheduledTime', event.target.value)}
            >
              <option value="">Select available time</option>
              {timesForSelectedDate.map((time) => (
                <option key={`${time.slotId}-${time.value}`} value={time.value}>
                  {time.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {selectedArtisan && !isLoadingAvailability && availableBookingDates.length === 0 && (
          <div className="hw-booking-empty-slot-panel">
            <p>No available slots for this date. Try another date or message artisan.</p>
            <Link className="secondary-cta compact-cta" to="/messages">
              Message Artisan
            </Link>
          </div>
        )}

        {form.scheduledDate && slotsForSelectedDate.length === 0 && (
          <p className="auth-hint">
            No available slots for this date. Try another date or message artisan.
          </p>
        )}

        {isSelectedDateUnavailable && (
          <p className="auth-error">
            This artisan is unavailable on the selected date.
          </p>
        )}

        {form.scheduledDate && slotsForSelectedDate.length > 0 && timesForSelectedDate.length === 0 && !isSelectedDateUnavailable && (
          <div className="hw-booking-empty-slot-panel">
            <p>No available slots for this date. Try another date or message artisan.</p>
            <Link className="secondary-cta compact-cta" to="/messages">
              Message Artisan
            </Link>
          </div>
        )}
      </div>

      <div className="hw-booking-form-section">
        <h3 className="hw-booking-form-section-title">Location</h3>
        <div className="hw-booking-form-grid">
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="hw-booking-label">
              Address
              <input
                className="hw-booking-input"
                disabled={isSaving}
                placeholder="House 12, Admiralty Way"
                value={form.address}
                onChange={(event) => updateForm('address', event.target.value)}
              />
            </label>
          </div>

          <div className="hw-booking-form-row">
            <label className="hw-booking-label">
              City
              <input
                className="hw-booking-input"
                disabled={isSaving}
                placeholder="Lekki"
                value={form.city}
                onChange={(event) => updateForm('city', event.target.value)}
              />
            </label>

            <label className="hw-booking-label">
              State
              <input
                className="hw-booking-input"
                disabled={isSaving}
                placeholder="Lagos"
                value={form.state}
                onChange={(event) => updateForm('state', event.target.value)}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="hw-booking-form-section">
        <h3 className="hw-booking-form-section-title">Describe Job</h3>
        <div className="hw-booking-form-grid">
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="hw-booking-label">
              Notes
              <textarea
                className="hw-booking-textarea"
                disabled={isSaving}
                placeholder="Describe the issue or service needed"
                value={form.notes}
                onChange={(event) => updateForm('notes', event.target.value)}
              />
            </label>
          </div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label className="hw-booking-label">
              Issue photos
              <input
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hw-booking-input"
                disabled={isSaving}
                key={attachmentInputKey}
                multiple
                type="file"
                onChange={(event) => handleAttachmentChange(event.target.files)}
              />
              <span className="hw-booking-label-hint">
                Upload photos of the issue so the artisan can estimate properly.
              </span>
            </label>
          </div>
        </div>

        {form.attachmentFiles.length > 0 && (
          <div className="hw-booking-preview-panel">
            <strong>Selected photos</strong>
            <div className="hw-booking-preview-grid">
              {form.attachmentFiles.map((file, index) => (
                <div className="hw-booking-preview-card" key={`${file.name}-${file.size}-${index}`}>
                  {imagePreviews[index]?.url ? (
                    <img alt={file.name} src={imagePreviews[index].url} />
                  ) : (
                    <span>{file.name}</span>
                  )}
                  <button type="button" onClick={() => handleRemoveAttachment(index)}>
                    ×
                  </button>
                  <small>{file.name}</small>
                </div>
              ))}
            </div>
          </div>
        )}

        {uploadProgress && (
          <div className="hw-booking-upload-progress">
            <strong>Uploading photos</strong>
            <span>
              {uploadProgress.current} of {uploadProgress.total}
              {uploadProgress.fileName ? ` • ${uploadProgress.fileName}` : ''}
            </span>
            <progress max={uploadProgress.total} value={uploadProgress.current} />
          </div>
        )}
      </div>

      <div className="hw-booking-submit">
        <button
          className="hw-booking-paystack-button"
          disabled={isLoading || isSaving}
          type="submit"
          style={{ width: '100%' }}
        >
          {isSaving ? 'Sending request...' : 'Send Booking Request'}
        </button>
      </div>
    </Card>
    </form>
  )
}
