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
  const { login } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [selectedRole, setSelectedRole] = useState('customer')

  function handleLogin() {
    const user = login(selectedRole)
    showToast(`Login successful as ${user.role}. Welcome back to Handiwave.`)
    navigate(location.state?.from?.pathname || (user.role === 'admin' ? '/admin' : '/bookings'))
  }

  return (
    <div className="auth-page">
      <section className="auth-card">
        <p className="section-kicker">Welcome back</p>
        <h1>Log in to Handiwave</h1>
        <p>Choose a mock role to preview the future authenticated experience.</p>
        <form className="auth-form">
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
          <label>Email address<input type="email" placeholder="you@example.com" /></label>
          <label>Password<input type="password" placeholder="Enter your password" /></label>
          <button
            type="button"
            onClick={handleLogin}
          >
            Login
          </button>
        </form>
        <span>New here? <Link to="/signup">Create an account</Link></span>
      </section>
    </div>
  )
}

export default Login
