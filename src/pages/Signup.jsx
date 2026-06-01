import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import { showToast } from '../utils/toast.js'

const signupTypes = [
  {
    label: 'Customer',
    value: 'customer',
    description: 'Find artisans, book home services, and pay safely.',
  },
  {
    label: 'Artisan',
    value: 'artisan',
    description: 'Offer your services, receive bookings, and build trust.',
  },
]

function Signup() {
  const { authError, signup } = useAuth()
  const navigate = useNavigate()
  const [accountType, setAccountType] = useState('customer')
  const [email, setEmail] = useState('')
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [primarySkill, setPrimarySkill] = useState('')

  async function handleSignup(event) {
    event.preventDefault()
    setFormError('')
    setIsSubmitting(true)

    try {
      const { session, user } = await signup({
        email,
        name,
        password,
        primarySkill,
        role: accountType,
      })

      if (session) {
        showToast(`${user.role} account created for ${user.name}.`)
        navigate(user.role === 'artisan' ? '/messages' : '/bookings')
      } else {
        showToast('Account created. Please check your email to confirm your signup.')
        navigate('/login')
      }
    } catch (error) {
      setFormError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-card">
        <p className="section-kicker">Join Handiwave</p>
        <h1>Create your account</h1>
        <p>Start as a customer or apply as an artisan with Supabase Auth.</p>
        <form className="auth-form" onSubmit={handleSignup}>
          <div className="role-selector two-column" aria-label="Signup account type">
            {signupTypes.map((type) => (
              <button
                className={accountType === type.value ? 'active' : ''}
                key={type.value}
                type="button"
                onClick={() => setAccountType(type.value)}
              >
                <strong>{type.label} signup</strong>
                <span>{type.description}</span>
              </button>
            ))}
          </div>
          <label>Full name<input placeholder="Enter your name" value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label>Email address<input type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label>Password<input type="password" placeholder="Create a password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          {accountType === 'artisan' && (
            <label>Primary skill<input placeholder="Electrician, cleaner, barber..." value={primarySkill} onChange={(event) => setPrimarySkill(event.target.value)} /></label>
          )}
          {(formError || authError) && (
            <p className="auth-error">{formError || authError}</p>
          )}
          <button disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>
        <span>Already have an account? <Link to="/login">Log in</Link></span>
      </section>
    </div>
  )
}

export default Signup
