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
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [accountType, setAccountType] = useState('customer')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')

  function handleSignup() {
    const user = signup(accountType, name, email)
    showToast(`${user.role} account created for ${user.name}.`)
    navigate(user.role === 'artisan' ? '/messages' : '/bookings')
  }

  return (
    <div className="auth-page">
      <section className="auth-card">
        <p className="section-kicker">Join Handiwave</p>
        <h1>Create your account</h1>
        <p>Start as a customer or apply as an artisan with a mock account.</p>
        <form className="auth-form">
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
          <label>Email address<input type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label>Password<input type="password" placeholder="Create a password" /></label>
          {accountType === 'artisan' && (
            <label>Primary skill<input placeholder="Electrician, cleaner, barber..." /></label>
          )}
          <button type="button" onClick={handleSignup}>Sign Up</button>
        </form>
        <span>Already have an account? <Link to="/login">Log in</Link></span>
      </section>
    </div>
  )
}

export default Signup
