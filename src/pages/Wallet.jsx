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

  const isArtisan = user?.role === 'artisan'
  const walletCopy = isArtisan
    ? 'Track earnings, escrow releases, and withdrawal requests from completed Handiwave jobs.'
    : 'Track safe booking payments, escrow holds, refunds, and wallet activity.'

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
          <strong>{formatMoney(wallet?.totalCredited, wallet?.currency)}</strong>
          <span>{isArtisan ? 'Total earned/credited' : 'Total credited/refunded'}</span>
        </div>
        <div>
          <strong>{formatMoney(wallet?.totalDebited, wallet?.currency)}</strong>
          <span>{isArtisan ? 'Total withdrawn/held' : 'Total paid/held'}</span>
        </div>
      </section>

      <section className="wallet-layout">
        <form className="booking-form wallet-withdrawal-form" onSubmit={handleWithdrawalSubmit}>
          <h2>{isArtisan ? 'Request withdrawal' : 'Withdrawal request'}</h2>
          <p className="auth-hint">
            {isArtisan
              ? 'Withdraw available earnings. Payout processing will be handled manually for now.'
              : 'Payments are not connected yet. This request flow is ready for future refunds or wallet withdrawals.'}
          </p>
          <label>
            Amount
            <input
              disabled={isSubmitting}
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
              disabled={isSubmitting}
              placeholder="Kuda Bank"
              value={form.bankName}
              onChange={(event) => updateForm('bankName', event.target.value)}
            />
          </label>
          <label>
            Account name
            <input
              disabled={isSubmitting}
              placeholder="Ada Okafor"
              value={form.accountName}
              onChange={(event) => updateForm('accountName', event.target.value)}
            />
          </label>
          <label>
            Account number
            <input
              disabled={isSubmitting}
              inputMode="numeric"
              placeholder="0123456789"
              value={form.accountNumber}
              onChange={(event) => updateForm('accountNumber', event.target.value)}
            />
          </label>
          <button disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Submitting...' : 'Request Withdrawal'}
          </button>
        </form>

        <section className="list-panel wallet-panel">
          <div className="booking-history-header">
            <div>
              <p className="section-kicker">Pending withdrawals</p>
              <h2>{pendingWithdrawals.length} pending</h2>
            </div>
          </div>
          {pendingWithdrawals.length > 0 ? (
            pendingWithdrawals.map((withdrawal) => (
              <article className="list-row wallet-row" key={withdrawal.id}>
                <div>
                  <h3>{withdrawal.amountLabel}</h3>
                  <p>{withdrawal.bankName || 'Bank pending'} • {withdrawal.time}</p>
                </div>
                <span className="wallet-status-pill pending">{withdrawal.status}</span>
              </article>
            ))
          ) : (
            <EmptyState compact title="No pending withdrawals">
              New withdrawal requests will appear here until they are processed.
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
