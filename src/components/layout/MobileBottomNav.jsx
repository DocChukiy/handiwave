import { NavLink } from 'react-router-dom'
import { House, CalendarDays, UserRound, Briefcase, WalletCards, MessageCircle } from 'lucide-react'
import { useAuth } from '../../auth/useAuth.js'

function MobileBottomNav() {
  const { user, isAuthenticated } = useAuth()
  const isArtisan = user?.role === 'artisan'

  const customerLinks = [
    {
      path: '/',
      label: 'Home',
      icon: House,
    },
    {
      path: '/services',
      label: 'Services',
      icon: () => <span className="hw-mobile-nav-icon-search">⌕</span>,
    },
    {
      path: '/bookings',
      label: 'Bookings',
      icon: CalendarDays,
    },
    {
      path: '/messages',
      label: 'Messages',
      icon: MessageCircle,
    },
    {
      path: isAuthenticated ? '/profile' : '/login',
      label: isAuthenticated ? 'Wallet' : 'Profile',
      icon: UserRound,
    },
  ]

  const artisanLinks = [
    {
      path: '/artisan-dashboard',
      label: 'Dashboard',
      icon: House,
    },
    {
      path: '/artisan-jobs',
      label: 'Jobs',
      icon: Briefcase,
    },
    {
      path: '/messages',
      label: 'Messages',
      icon: MessageCircle,
    },
    {
      path: '/wallet',
      label: 'Wallet',
      icon: WalletCards,
    },
    {
      path: '/profile',
      label: 'Profile',
      icon: UserRound,
    },
  ]

  const links = isArtisan ? artisanLinks : customerLinks

  return (
    <nav className="hw-mobile-bottom-nav" aria-label="Mobile navigation">
      {links.map((link) => {
        const Icon = link.icon
        return (
          <NavLink
            key={link.path}
            to={link.path}
            className={({ isActive }) =>
              `hw-mobile-nav-item ${isActive ? 'active' : ''}`
            }
            end={link.path === '/' || link.path === '/artisan-dashboard'}
          >
            {Icon && <Icon size={19} />}
            <span>{link.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}

export default MobileBottomNav
