const transactions = [
  { title: 'AC Repair escrow', amount: '-NGN 8,500', status: 'Held safely' },
  { title: 'Wallet top up', amount: '+NGN 25,000', status: 'Successful' },
  { title: 'Cleaning service', amount: '-NGN 12,000', status: 'Released' },
]

function Wallet() {
  return (
    <div className="starter-page">
      <section className="wallet-hero">
        <p className="section-kicker">Wallet</p>
        <h1>NGN 42,500</h1>
        <p>Available balance for safe bookings, escrow payments, and refunds.</p>
        <div className="hero-actions"><button className="primary-cta" type="button">Top Up</button><button className="secondary-cta" type="button">Withdraw</button></div>
      </section>

      <section className="list-panel">
        {transactions.map((item) => (
          <article className="list-row" key={item.title}>
            <div><h3>{item.title}</h3><p>{item.status}</p></div>
            <strong>{item.amount}</strong>
          </article>
        ))}
      </section>
    </div>
  )
}

export default Wallet
