import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/useAuth.js'
import EmptyState from '../components/EmptyState.jsx'
import RoleNotice from '../components/RoleNotice.jsx'
import SkeletonPreview from '../components/Skeletons.jsx'
import {
  getWalletOverview,
  requestWalletWithdrawal,
} from '../services/walletService.js'
import { showToast } from '../utils/toast.js'

const initialWithdrawalForm = {
  accountName: '',
  accountNumber: '',
  amount: '',
  bankName: '',
}

function getErrorMessage(error) {
  return [
    error.message,
    error.details,
    error.hint,
    error.code,
  ].filter(Boolean).join(' ')
}

function formatMoney(value, currency = 'NGN') {
  return `${currency} ${Number(value || 0).toLocaleString()}`
}

function getWithdrawalStatusLabel(status) {
  if (['successful', 'approved', 'processed'].includes(status)) {
    return 'Approved / Paid manually'
  }

  if (['failed', 'rejected', 'cancelled'].includes(status)) {
    return 'Rejected / Failed'
  }

  return 'Pending'
}

function getWithdrawalStatusTone(status) {
  if (['successful', 'approved', 'processed'].includes(status)) {
    return 'successful'
  }

  if (['failed', 'rejected', 'cancelled'].includes(status)) {
    return 'failed'
  }

  return 'pending'
}

function sumTransactions(transactions, type) {
  return transactions
    .filter((transaction) => transaction.type === type && transaction.status === 'successful')
    .reduce((total, transaction) => total + Number(transaction.amount || 0), 0)
}

function Wallet() {
  const { user } = useAuth()
  const [error, setError] = useState('')
  const [form, setForm] = useState(initialWithdrawalForm)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [transactions, setTransactions] = useState([])
  const [wallet, setWallet] = useState(null)
  const [withdrawals, setWithdrawals] = useState([])

  const pendingWithdrawals = useMemo(() => (
    withdrawals.filter((withdrawal) => withdrawal.status === 'pending')
  ), [withdrawals])
  const releasedEarnings = useMemo(() => (
    sumTransactions(transactions, 'escrow_release')
  ), [transactions])
  const refundedPayments = useMemo(() => (
    sumTransactions(transactions, 'refund')
  ), [transactions])

  const isArtisan = user?.role === 'artisan'
  const walletCopy = isArtisan
    ? 'Track earnings, escrow releases, and withdrawal requests from completed Handiwave jobs.'
    : 'Track safe booking payments, escrow holds, refunds, and wallet activity.'
  const canWithdraw = Number(wallet?.availableBalance || 0) > 0

  async function loadWallet() {
    setError('')
    setIsLoading(true)

    try {
      const { data, error: walletError } = await getWalletOverview(user.id)

      if (walletError) {
        setError(getErrorMessage(walletError))
        return
      }

      setWallet(data.wallet)
      setTransactions(data.transactions)
      setWithdrawals(data.withdrawals)
    } catch (loadError) {
      setError(getErrorMessage(loadError))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    Promise.resolve().then(loadWallet)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id])

  function updateForm(field, value) {
    setForm((currentForm) => ({
      ...currentForm,
      [field]: value,
    }))
  }

  async function handleWithdrawalSubmit(event) {
    event.preventDefault()
    setError('')

    if (!form.amount || Number(form.amount) <= 0) {
      setError('Enter a withdrawal amount greater than zero.')
      return
    }

    if (!form.bankName.trim() || !form.accountName.trim() || !form.accountNumber.trim()) {
      setError('Enter bank name, account name, and account number.')
      return
    }

    if (Number(form.amount) > Number(wallet?.availableBalance || 0)) {
      setError('Insufficient available balance for this withdrawal.')
      return
    }

    setIsSubmitting(true)

    try {
      const { data, error: withdrawalError } = await requestWalletWithdrawal({
        accountName: form.accountName,
        accountNumber: form.accountNumber,
        amount: form.amount,
        bankName: form.bankName,
      })

      if (withdrawalError) {
        setError(getErrorMessage(withdrawalError))
        return
      }

      if (!data) {
        setError('Supabase did not return the withdrawal request id.')
        return
      }

      setForm(initialWithdrawalForm)
      await loadWallet()
      showToast('Withdrawal request created.')
    } catch (withdrawalError) {
      setError(getErrorMessage(withdrawalError))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="starter-page wallet-page">
        <SkeletonPreview count={4} label="Loading wallet" type="service" />
      </div>
    )
  }

  return (
    <div className="starter-page wallet-page">
      <section className="wallet-hero">
        <p className="section-kicker">{isArtisan ? 'Artisan wallet' : 'Customer wallet'}</p>
        <h1>{formatMoney(wallet?.availableBalance, wallet?.currency)}</h1>
        <p>{walletCopy}</p>
        <p className="wallet-payment-note">
          Paystack booking payments move into escrow first, then release after customer confirmation.
        </p>
        <div className="hero-actions">
          <button className="primary-cta coming-soon-button" disabled type="button">
            Top Up Wallet - Coming Soon
          </button>
        </div>
      </section>

      <RoleNotice />

      {error && <p className="auth-error page-error">{error}</p>}

      <section className="summary-grid wallet-summary-grid">
        <div>
          <strong>{formatMoney(wallet?.availableBalance, wallet?.currency)}</strong>
          <span>Available balance</span>
        </div>
        <div>
          <strong>{formatMoney(wallet?.escrowBalance, wallet?.currency)}</strong>
          <span>Escrow balance</span>
        </div>
        <div>
          <strong>{formatMoney(wallet?.escrowBalance, wallet?.currency)}</strong>
          <span>{isArtisan ? 'Pending earnings' : 'Protected payments'}</span>
        </div>
        <div>
          <strong>{formatMoney(isArtisan ? releasedEarnings : refundedPayments, wallet?.currency)}</strong>
          <span>{isArtisan ? 'Released earnings' : 'Refunds received'}</span>
        </div>
        <div>
          <strong>{formatMoney(wallet?.totalCredited, wallet?.currency)}</strong>
          <span>{isArtisan ? 'Total earned/credited' : 'Total credited/refunded'}</span>
        </div>
        <div>
          <strong>{formatMoney(wallet?.totalDebited, wallet?.currency)}</strong>
          <span>{isArtisan ? 'Total withdrawn/held' : 'Total paid/held'}</span>
        </div>
      </section>

      <section className="wallet-layout">
        {isArtisan ? (
          <form className="booking-form wallet-withdrawal-form" onSubmit={handleWithdrawalSubmit}>
            <h2>Request withdrawal</h2>
            <p className="auth-hint">
              {canWithdraw
                ? 'Withdraw available earnings. Payout processing is manual for now, with Paystack transfer readiness coming later.'
                : 'You\'ll be able to withdraw after completed paid jobs.'}
            </p>
            <label>
              Amount
              <input
                disabled={isSubmitting || !canWithdraw}
                max={wallet?.availableBalance || 0}
                min="1"
                placeholder="10000"
                type="number"
                value={form.amount}
                onChange={(event) => updateForm('amount', event.target.value)}
              />
            </label>
            <label>
              Bank name
              <input
                disabled={isSubmitting || !canWithdraw}
                placeholder="Kuda Bank"
                value={form.bankName}
                onChange={(event) => updateForm('bankName', event.target.value)}
              />
            </label>
            <label>
              Account name
              <input
                disabled={isSubmitting || !canWithdraw}
                placeholder="Ada Okafor"
                value={form.accountName}
                onChange={(event) => updateForm('accountName', event.target.value)}
              />
            </label>
            <label>
              Account number
              <input
                disabled={isSubmitting || !canWithdraw}
                inputMode="numeric"
                placeholder="0123456789"
                value={form.accountNumber}
                onChange={(event) => updateForm('accountNumber', event.target.value)}
              />
            </label>
            <button disabled={isSubmitting || !canWithdraw} type="submit">
              {isSubmitting ? 'Submitting...' : 'Request Withdrawal'}
            </button>
          </form>
        ) : (
          <section className="list-panel wallet-panel">
            <div className="booking-history-header">
              <div>
                <p className="section-kicker">Customer wallet</p>
                <h2>Payments and refunds</h2>
              </div>
            </div>
            <EmptyState compact title="Withdrawals are for artisans">
              Customer payments, refunds, and escrow updates will appear in wallet history.
            </EmptyState>
          </section>
        )}

        <section className="list-panel wallet-panel">
          <div className="booking-history-header">
            <div>
              <p className="section-kicker">{isArtisan ? 'Withdrawal requests' : 'Pending refunds/payments'}</p>
              <h2>{isArtisan ? `${withdrawals.length} total` : `${pendingWithdrawals.length} pending`}</h2>
            </div>
          </div>
          {withdrawals.length > 0 ? (
            withdrawals.map((withdrawal) => (
              <article className="list-row wallet-row" key={withdrawal.id}>
                <div>
                  <h3>{withdrawal.amountLabel}</h3>
                  <p>
                    {withdrawal.bankName || 'Bank pending'} • {withdrawal.accountNumber || 'Account pending'} • {withdrawal.time}
                  </p>
                  {withdrawal.rejectionReason && (
                    <small>Reason: {withdrawal.rejectionReason}</small>
                  )}
                  {['successful', 'approved', 'processed'].includes(withdrawal.status) && (
                    <small>Manual payout recorded.</small>
                  )}
                </div>
                <span className={`wallet-status-pill ${getWithdrawalStatusTone(withdrawal.status)}`}>
                  {getWithdrawalStatusLabel(withdrawal.status)}
                </span>
              </article>
            ))
          ) : (
            <EmptyState compact title={isArtisan ? 'No withdrawal requests yet' : 'No pending refunds or payments'}>
              {isArtisan
                ? 'New withdrawal requests will appear here until they are processed.'
                : 'Future refunds, escrow releases, and payment updates will appear here.'}
            </EmptyState>
          )}
        </section>
      </section>

      <section className="list-panel wallet-panel">
        <div className="booking-history-header">
          <div>
            <p className="section-kicker">Transactions</p>
            <h2>Wallet history</h2>
          </div>
        </div>
        {transactions.length > 0 ? (
          transactions.map((transaction) => (
            <article className="list-row wallet-row" key={transaction.id}>
              <div>
                <h3>{transaction.description}</h3>
                <p>
                  {transaction.type.replaceAll('_', ' ')} • {transaction.time}
                  {transaction.reference ? ` • ${transaction.reference}` : ''}
                </p>
              </div>
              <div className="wallet-row-amount">
                <strong>{transaction.amountLabel}</strong>
                <span className={`wallet-status-pill ${transaction.status}`}>
                  {transaction.status}
                </span>
              </div>
            </article>
          ))
        ) : (
          <EmptyState compact title="No wallet transactions yet">
            Booking payments, escrow holds, refunds, and withdrawals will appear here.
          </EmptyState>
        )}
      </section>
    </div>
  )
}

export default Wallet
