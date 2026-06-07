function Rating({ jobs, label = 'Rating', reviewCount = 0, value }) {
  return (
    <div className="mini-metrics">
      <span>
        <strong>{value}</strong> ★ {label}
      </span>
      <span>
        <strong>{reviewCount}</strong> Reviews
      </span>
      {jobs && (
        <span>
          <strong>{jobs}</strong> Jobs
        </span>
      )}
    </div>
  )
}

export default Rating
