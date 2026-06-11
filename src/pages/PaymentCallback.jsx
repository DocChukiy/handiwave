import { CheckCircle2, Clock3, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import SkeletonPreview from '../components/Skeletons.jsx'
import { verifyBookingPayment } from '../services/paymentService.js'

function PaymentResultCard({ error, result, status }) {
  if (status === 'loading') {
    return (
      <section className="payment-callback-card">
        <Clock3 size={34} />
        <p className="section-kicker">Verification pending</p>
        <h1>Confirming your payment</h1>
        <p>Please wait while Handiwave verifies your Paystack payment and updates escrow.</p>
        <SkeletonPreview count={2} label="Verifying payment" type="service" />
      </section>
    )
  }

  if (status === 'success') {
    return (
      <section className="payment-callback-card success">
        <CheckCircle2 size={38} />
        <p className="section-kicker">Payment successful</p>
        <h1>Your payment is held safely in escrow.</h1>
        <p>
          The artisan can now see that payment is protected. Funds release after
          you confirm the job is complete.
        </p>
        <div className="hero-actions">
          <Link className="primary-cta" to="/bookings">View Bookings</Link>
          <Link className="secondary-cta" to="/wallet">Open Wallet</Link>
        </div>
      </section>
    )
  }

  return (
    <section className="payment-callback-card failed">
      <XCircle size={38} />
      <p className="section-kicker">Payment failed</p>
      <h1>We could not verify this payment.</h1>
      <p>{error || result?.message || 'Paystack did not confirm a successful payment.'}</p>
      <div className="hero-actions">
        <Link className="primary-cta" to="/bookings">Try Again</Link>
        <Link className="secondary-cta" to="/messages">Contact Artisan</Link>
      </div>
    </section>
  )
}

function PaymentCallback() {
  const [searchParams] = useSearchParams()
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [status, setStatus] = useState('loading')
  const reference = searchParams.get('reference') || searchParams.get('trxref') || ''

  useEffect(() => {
    let isMounted = true

    async function verifyPayment() {
      if (!reference) {
        setError('Payment reference was not found in the callback URL.')
        setStatus('failed')
        return
      }

      setError('')
      setStatus('loading')

      try {
        const { data, error: verifyError } = await verifyBookingPayment(reference)

        if (!isMounted) {
          return
        }

        if (verifyError) {
          setError(verifyError.message)
          setResult(data)
          setStatus('failed')
          return
        }

        setResult(data)
        setStatus(data?.status === 'success' ? 'success' : 'failed')
      } catch (verifyError) {
        if (isMounted) {
          setError(verifyError.message)
          setStatus('failed')
        }
      }
    }

    verifyPayment()

    return () => {
      isMounted = false
    }
  }, [reference])

  return (
    <div className="starter-page payment-callback-page">
      <PaymentResultCard error={error} result={result} status={status} />
    </div>
  )
}

export default PaymentCallback
