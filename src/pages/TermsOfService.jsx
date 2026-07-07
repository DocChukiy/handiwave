function TermsOfService() {
  const terms = [
    {
      title: 'Booking responsibly',
      body: 'Customers should describe requests clearly, provide accurate locations, and use Handiwave messaging to agree on scope before work begins.',
    },
    {
      title: 'Safe platform payments',
      body: 'Payments should move through Handiwave-supported checkout and escrow flows when available, so both customers and artisans have a clear record.',
    },
    {
      title: 'Artisan standards',
      body: 'Artisans are expected to keep profiles truthful, arrive as agreed, quote fairly, and deliver work with care and professionalism.',
    },
    {
      title: 'Account integrity',
      body: 'We may restrict accounts that submit fraudulent requests, misuse messaging, impersonate others, or create unsafe marketplace experiences.',
    },
  ]

  return (
    <section className="policy-page">
      <div className="policy-hero">
        <p className="section-kicker">Terms of service</p>
        <h1>Simple rules for safe, trusted work.</h1>
        <p>
          These terms explain how customers and artisans should use Handiwave while booking,
          quoting, messaging, paying, and resolving service requests.
        </p>
      </div>

      <div className="policy-content">
        <div className="policy-summary-card">
          <strong>By using Handiwave, you agree to communicate honestly, respect local laws, and keep service activity inside the platform where possible.</strong>
          <p>
            Please use the app respectfully and contact support if you need help with a booking,
            quote, payment, dispute, or account issue.
          </p>
        </div>

        <div className="policy-grid">
          {terms.map((item) => (
            <article key={item.title}>
              <span></span>
              <h2>{item.title}</h2>
              <p>{item.body}</p>
            </article>
          ))}
        </div>

        <div className="policy-note">
          <strong>Account enforcement</strong>
          <p>
            We reserve the right to suspend accounts that violate these policies, misuse the
            platform, or create risk for customers, artisans, or Handiwave operations.
          </p>
        </div>
      </div>
    </section>
  )
}

export default TermsOfService
