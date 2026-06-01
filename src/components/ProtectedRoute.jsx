import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'

function ProtectedRoute({ allowedRoles, children }) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <section className="auth-loading-state">
        <span></span>
        <p>Checking your Handiwave session...</p>
      </section>
    )
  }

  if (!isAuthenticated) {
    return <Navigate replace state={{ from: location }} to="/login" />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate replace to="/" />
  }

  return children
}

export default ProtectedRoute
