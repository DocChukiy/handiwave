/**
 * Badge Component
 * 
 * Status badges for displaying state information.
 * 
 * Usage:
 *   <Badge variant="success">Active</Badge>
 *   <Badge variant="warning">Pending</Badge>
 *   <Badge variant="error">Failed</Badge>
 *   <Badge variant="info">New</Badge>
 *   <Badge variant="neutral">Draft</Badge>
 *   <Badge variant="verified">Verified</Badge>
 * 
 * Variants:
 *   - success: Green badge for positive states
 *   - warning: Amber badge for caution states
 *   - error: Red badge for error/danger states
 *   - info: Blue badge for informational states
 *   - neutral: Gray badge for neutral states
 *   - verified: Green badge with checkmark style for verified states
 * 
 * Props:
 *   - variant: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'verified' (default: 'neutral')
 *   - children: Badge content
 *   - className: optional additional class names
 *   - icon: Optional icon element to display before text
 */

const variantClasses = {
  success: 'hw-badge hw-badge-success',
  warning: 'hw-badge hw-badge-warning',
  error: 'hw-badge hw-badge-error',
  info: 'hw-badge hw-badge-info',
  neutral: 'hw-badge hw-badge-neutral',
  verified: 'hw-badge hw-badge-verified',
}

function Badge({ 
  children, 
  className = '', 
  variant = 'neutral',
  icon,
  ...props 
}) {
  const variantClass = variantClasses[variant] || variantClasses.neutral
  const classes = [variantClass, className].filter(Boolean).join(' ')
  
  return (
    <span className={classes} {...props}>
      {icon && icon}
      {children}
    </span>
  )
}

export default Badge
