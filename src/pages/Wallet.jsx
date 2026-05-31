import Button from '../components/Button.jsx'
import RoleNotice from '../components/RoleNotice.jsx'
import { transactions } from '../data/bookings.js'
import { showToast } from '../utils/toast.js'

function Wallet() {
  return (
    <div className="starter-page">
      <section className="wallet-hero">
        <p className="section-kicker">Wallet</p>
        <h1>NGN 42,500</h1>
        <p>Available balance for safe bookings, escrow payments, and refunds.</p>
        <div className="hero-actions">
          <Button
            className="primary-cta"
            onClick={() => showToast('Wallet top up started.')}
          >
            Top Up
          </Button>
          <Button
            className="secondary-cta"
            onClick={() => showToast('Withdrawal request created.')}
          >
            Withdraw
          </Button>
        </div>
      </section>

      <RoleNotice />

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
