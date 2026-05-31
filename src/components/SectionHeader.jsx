function SectionHeader({ action, count, kicker, title }) {
  return (
    <div className="services-section-header">
      <div>
        <p className="section-kicker">{kicker}</p>
        <h2>{title}</h2>
      </div>
      {action || (count ? <span>{count}</span> : null)}
    </div>
  )
}

export default SectionHeader
