import Avatar from '../ui/Avatar.jsx'
import Badge from '../ui/Badge.jsx'

function ProfileHero({ user, isArtisan, artisan, className = '' }) {
  const name = isArtisan ? (artisan?.businessName || artisan?.fullName || user?.name) : (user?.name || 'User')
  const email = isArtisan ? (artisan?.email || user?.email) : user?.email
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const avatarSrc = isArtisan ? (artisan?.avatarUrl || artisan?.profile?.avatar_url || '') : (user?.avatarUrl || '')

  return (
    <div className={`hw-profile-hero ${className}`.trim()}>
      <div className="hw-profile-hero-avatar">
        <Avatar name={name} src={avatarSrc} size="xl" />
      </div>
      <div className="hw-profile-hero-content">
        <p className="hw-section-kicker">My Profile</p>
        <h1>{name}</h1>
        <p>{email}</p>
        <Badge variant={isArtisan ? 'verified' : 'info'}>{isArtisan ? 'Professional' : 'Customer'}</Badge>
      </div>
    </div>
  )
}

export default ProfileHero
