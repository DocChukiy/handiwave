import { NavLink } from 'react-router-dom'
import { House, CalendarDays, UserRound, Briefcase, WalletCards, MessageCircle, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../auth/useAuth.js'

function MobileBottomNav() {
  const { user, isAuthenticated } = useAuth()
  const isArtisan = user?.role === 'artisan'
  const isAdmin = user?.role === 'admin'

  const customerLinks = [
    {
      path: '/',
      label: 'Home',
      icon: House,
    },
    {
      path: '/requests',
      label: 'Post Job',
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
      label: 'Profile',
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
      path: '/opportunities',
      label: 'Opportunities',
      icon: Briefcase,
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
  ]

  const adminLinks = [
    {
      path: '/admin',
      label: 'Overview',
      icon: House,
    },
    {
      path: '/admin/professionals',
      label: 'Professionals',
      icon: ShieldCheck,
    },
    {
      path: '/admin/bookings',
      label: 'Operations',
      icon: Briefcase,
    },
    {
      path: '/messages',
      label: 'Messages',
      icon: MessageCircle,
    },
    {
      path: '/admin/finance',
      label: 'Finance',
      icon: WalletCards,
    },
  ]

  const links = isAdmin ? adminLinks : isArtisan ? artisanLinks : customerLinks

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
            end={link.path === '/' || link.path === '/artisan-dashboard' || link.path === '/admin'}
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
