export default function BookingReviewForm({
  booking,
  form,
  isSubmitting,
  mode = 'create',
  onChange,
  onSubmit,
}) {
  return (
    <form className="hw-booking-review-form" onSubmit={(event) => onSubmit(event, booking)}>
      <div>
        <strong>Leave a verified review</strong>
        <p>Your feedback helps other customers choose trusted artisans.</p>
      </div>

      <label>
        <span>Rating</span>
        <select
          className="hw-booking-select"
          disabled={isSubmitting}
          value={form.rating}
          onChange={(event) => onChange(booking.id, 'rating', event.target.value)}
        >
          <option value="5">5 stars - Excellent</option>
          <option value="4">4 stars - Good</option>
          <option value="3">3 stars - Okay</option>
          <option value="2">2 stars - Poor</option>
          <option value="1">1 star - Bad</option>
        </select>
      </label>

      <label>
        <span>Review</span>
        <textarea
          className="hw-booking-textarea"
          disabled={isSubmitting}
          placeholder="Share what went well, timing, quality, and professionalism."
          value={form.reviewText}
          onChange={(event) => onChange(booking.id, 'reviewText', event.target.value)}
        />
      </label>

      <button
        disabled={isSubmitting}
        type="submit"
        className="hw-booking-paystack-button"
        style={{ alignSelf: 'flex-start' }}
      >
        {isSubmitting
          ? mode === 'edit' ? 'Saving review...' : 'Submitting review...'
          : mode === 'edit' ? 'Save Review' : 'Submit Review'}
      </button>
    </form>
  )
}
