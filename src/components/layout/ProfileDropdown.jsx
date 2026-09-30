import { NavLink } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth.js'

function ProfileDropdown({ onClose, onLogout }) {
  const { user } = useAuth()
  const isArtisan = user?.role === 'artisan'
  const isAdmin = user?.role === 'admin'

  return (
    <div className="hw-profile-dropdown" role="menu">
      <div className="hw-profile-dropdown-header">
        <strong>{user?.name || 'User'}</strong>
        <span>{user?.email || ''}</span>
      </div>

      <div className="hw-profile-dropdown-links">
        <NavLink
          className="hw-profile-dropdown-link"
          to="/profile"
          onClick={onClose}
          role="menuitem"
        >
          My Profile
        </NavLink>

        <NavLink className="hw-profile-dropdown-link" to="/messages" onClick={onClose} role="menuitem">
          Messages
        </NavLink>
        <NavLink className="hw-profile-dropdown-link" to="/wallet" onClick={onClose} role="menuitem">
          Wallet
        </NavLink>

        {isAdmin && (
          <NavLink
            className="hw-profile-dropdown-link"
            to="/admin"
            onClick={onClose}
            role="menuitem"
          >
            Admin Dashboard
          </NavLink>
        )}

        {isArtisan && (
          <>
            <NavLink
              className="hw-profile-dropdown-link"
              to="/artisan-availability"
              onClick={onClose}
              role="menuitem"
            >
              Manage Availability
            </NavLink>
            <NavLink
              className="hw-profile-dropdown-link"
              to="/artisan-reels"
              onClick={onClose}
              role="menuitem"
            >
              Manage Reels
            </NavLink>
            <NavLink
              className="hw-profile-dropdown-link"
              to="/artisan-analytics"
              onClick={onClose}
              role="menuitem"
            >
              Analytics
            </NavLink>
          </>
        )}

        <div className="hw-profile-dropdown-divider" />

        <button
          className="hw-profile-dropdown-link hw-logout-button"
          type="button"
          onClick={() => {
            onLogout()
            onClose()
          }}
          role="menuitem"
        >
          Logout
        </button>
      </div>
    </div>
  )
}

export default ProfileDropdown
