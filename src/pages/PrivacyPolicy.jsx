function PrivacyPolicy() {
  const privacyItems = [
    {
      title: 'What we collect',
      body: 'Profile details, booking information, location inputs, messages, payment references, reviews, and support activity needed to run the service.',
    },
    {
      title: 'How we use it',
      body: 'We use your data to match customers with artisans, power bookings and messaging, improve trust signals, process payments, and protect the marketplace.',
    },
    {
      title: 'Who sees it',
      body: 'Relevant booking participants can see the details needed to complete a job. Admins may review records when support, safety, or disputes require it.',
    },
    {
      title: 'Your control',
      body: 'You can update profile details from your account and contact support for data access, correction, or account-related privacy requests.',
    },
  ]

  return (
    <section className="policy-page">
      <div className="policy-hero">
        <p className="section-kicker">Privacy policy</p>
        <h1>Your information should work for trust, not noise.</h1>
        <p>
          Handiwave collects the details needed to coordinate safe home service bookings,
          protect payments, support messaging, and resolve issues clearly.
        </p>
      </div>

      <div className="policy-content">
        <div className="policy-summary-card">
          <strong>We do not sell your personal information.</strong>
          <p>
            We share details only when needed to provide bookings, payments, customer support,
            safety review, legal compliance, or dispute resolution.
          </p>
        </div>

        <div className="policy-grid">
          {privacyItems.map((item) => (
            <article key={item.title}>
              <span></span>
              <h2>{item.title}</h2>
              <p>{item.body}</p>
            </article>
          ))}
        </div>

        <div className="policy-note">
          <strong>Security and payments</strong>
          <p>
            Payment secrets are handled outside the frontend, and sensitive payment processing
            should happen through trusted providers and secure backend functions.
          </p>
        </div>
      </div>
    </section>
  )
}

export default PrivacyPolicy
