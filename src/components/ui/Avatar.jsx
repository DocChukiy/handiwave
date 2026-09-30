/**
 * Avatar Component
 * 
 * User avatar with image support and fallback to initials.
 * 
 * Usage:
 *   <Avatar name="John Doe" />
 *   <Avatar name="John Doe" src="/avatar.jpg" />
 *   <Avatar name="John Doe" size="sm" />
 *   <Avatar name="John Doe" size="lg" />
 * 
 * Sizes:
 *   - sm: 32px (small)
 *   - md: 48px (medium, default)
 *   - lg: 80px (large)
 *   - xl: 120px (extra large)
 * 
 * Props:
 *   - name: User's display name (used for initials fallback)
 *   - src: Optional image URL
 *   - size: 'sm' | 'md' | 'lg' | 'xl' (default: 'md')
 *   - className: optional additional class names
 *   - alt: Custom alt text for image
 */

const sizeClasses = {
  sm: 'hw-avatar-sm',
  md: 'hw-avatar-md',
  lg: 'hw-avatar-lg',
  xl: 'hw-avatar-xl',
}

/**
 * Get initials from a name
 */
function getInitials(name) {
  if (!name) return '?'
  
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase()
  }
  
  // Return first letter of first and last name
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

/**
 * Generate a consistent color based on name
 */
function getAvatarColor(name) {
  if (!name) return 'var(--hw-primary)'
  
  // Simple hash based on name
  const colors = [
    'var(--hw-primary)',
    '#0891b2', // cyan
    '#7c3aed', // violet
    '#db2777', // pink
    '#ea580c', // orange
    '#4f46e5', // indigo
  ]
  
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  return colors[Math.abs(hash) % colors.length]
}

function Avatar({ 
  name = '', 
  src, 
  size = 'md', 
  className = '',
  alt,
  ...props 
}) {
  const sizeClass = sizeClasses[size] || sizeClasses.md
  const initials = getInitials(name)
  const bgColor = getAvatarColor(name)
  const classes = ['hw-avatar', sizeClass, className].filter(Boolean).join(' ')
  const altText = alt || `${name}'s avatar`
  
  // If src is provided and valid, render image
  if (src) {
    return (
      <div className={classes} {...props}>
        <img 
          src={src} 
          alt={altText}
          className="hw-avatar-image"
        />
      </div>
    )
  }
  
  // Otherwise render initials fallback
  return (
    <div 
      className={classes} 
      style={{ background: bgColor }}
      role="img"
      aria-label={altText}
      {...props}
    >
      <span className="hw-avatar-initials">{initials}</span>
    </div>
  )
}

export default Avatar
