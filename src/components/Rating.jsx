function Rating({ jobs, label = 'Rating', value }) {
  return (
    <div className="mini-metrics">
      <span>
        <strong>{value}</strong> ★ {label}
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
