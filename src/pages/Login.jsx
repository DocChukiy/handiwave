import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import { showToast } from '../utils/toast.js'

const roles = [
  {
    label: 'Customer',
    value: 'customer',
    description: 'Book services, chat with artisans, and manage wallet payments.',
  },
  {
    label: 'Artisan',
    value: 'artisan',
    description: 'Manage bookings, customer messages, and your service showcase.',
  },
  {
    label: 'Admin',
    value: 'admin',
    description: 'Review platform activity, verification queues, and reports.',
  },
]

function Login() {
  const { authError, isLoading, login } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [password, setPassword] = useState('')
  const [selectedRole, setSelectedRole] = useState('customer')

  async function handleLogin(event) {
    event.preventDefault()
    setFormError('')
    setIsSubmitting(true)

    try {
      const user = await login({ email, password, role: selectedRole })
      showToast(`Login successful as ${user.role}. Welcome back to Handiwave.`)
      navigate(location.state?.from?.pathname || (user.role === 'admin' ? '/admin' : '/bookings'))
    } catch (error) {
      setFormError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-card">
        <p className="section-kicker">Welcome back</p>
        <h1>Log in to Handiwave</h1>
        <p>Log in with Supabase Auth and continue with the right Handiwave role.</p>
        <form className="auth-form" onSubmit={handleLogin}>
          <div className="role-selector" aria-label="Login role">
            {roles.map((role) => (
              <button
                className={selectedRole === role.value ? 'active' : ''}
                key={role.value}
                type="button"
                onClick={() => setSelectedRole(role.value)}
              >
                <strong>{role.label}</strong>
                <span>{role.description}</span>
              </button>
            ))}
          </div>
          <label>Email address<input type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label>Password<input type="password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          {(formError || authError) && (
            <p className="auth-error">{formError || authError}</p>
          )}
          <button
            disabled={isSubmitting || isLoading}
            type="submit"
          >
            {isSubmitting ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <span>New here? <Link to="/signup">Create an account</Link></span>
      </section>
    </div>
  )
}

export default Login
