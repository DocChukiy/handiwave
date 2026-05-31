import { adminStats, verificationQueue } from '../data/admin.js'

function AdminDashboard() {
  return (
    <div className="starter-page">
      <section className="page-hero compact">
        <p className="section-kicker">Admin dashboard</p>
        <h1>Monitor Handiwave operations</h1>
        <p>Track bookings, artisans, wallet activity, and verification workflows.</p>
      </section>

      <section className="summary-grid">
        {adminStats.map((item) => <div key={item.label}><strong>{item.value}</strong><span>{item.label}</span></div>)}
      </section>

      <section className="admin-layout">
        <div className="list-panel">
          {verificationQueue.map((item) => (
            <article className="list-row" key={item.name}>
              <div><h3>{item.name}</h3><p>{item.skill}</p></div>
              <span>{item.status}</span>
            </article>
          ))}
        </div>
        <div className="admin-card">
          <h3>Platform health</h3>
          <p>Bookings are trending up 18% this week. Response times remain under 12 minutes for featured artisans.</p>
          <button type="button">Review Reports</button>
        </div>
      </section>
    </div>
  )
}

export default AdminDashboard
