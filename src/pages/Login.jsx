import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import { getArtisanByProfileId } from '../services/artisanService.js'
import { showToast } from '../utils/toast.js'
import logger from '../utils/logger.js'

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

  const disabledReason = useMemo(() => {
    if (isSubmitting) {
      return 'login request is already submitting'
    }

    if (!email.trim()) {
      return 'email is missing'
    }

    if (!password) {
      return 'password is missing'
    }

    return ''
  }, [email, isSubmitting, password])
  const isLoginDisabled = Boolean(disabledReason)

  useEffect(() => {
    logger.debug('[Handiwave login debug]', {
      disabledReason: disabledReason || 'button enabled',
      email,
      isAuthLoading: isLoading,
      isSubmitting,
      passwordLength: password.length,
    })
  }, [disabledReason, email, isLoading, isSubmitting, password.length])

  async function handleLogin(event) {
    event.preventDefault()
    setFormError('')

    logger.debug('[Handiwave login debug] submit clicked', {
      disabledReason: disabledReason || 'button enabled',
      email,
      isAuthLoading: isLoading,
      isSubmitting,
      passwordLength: password.length,
    })

    if (disabledReason) {
      setFormError(`Cannot log in yet: ${disabledReason}.`)
      return
    }

    setIsSubmitting(true)

    try {
      const user = await login({ email, password, role: selectedRole })
      showToast(`Login successful as ${user.role}. Welcome back to Handiwave.`)

      if (user.role === 'artisan') {
        const { data: artisanProfile, error } = await getArtisanByProfileId(user.id)

        if (error) {
          setFormError(error.message)
          return
        }

        navigate(artisanProfile ? '/artisan-dashboard' : '/artisan-onboarding')
        return
      }

      navigate(location.state?.from?.pathname || (user.role === 'admin' ? '/admin' : '/'))
    } catch (error) {
      logger.error('[Handiwave login debug] Supabase login error:', error)
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
          <label>Email address<input type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label>Password<input type="password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          {disabledReason && !isSubmitting && (
            <p className="auth-hint">Login button disabled because {disabledReason}.</p>
          )}
          {(formError || authError) && (
            <p className="auth-error">{formError || authError}</p>
          )}
          <button
            disabled={isLoginDisabled}
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
