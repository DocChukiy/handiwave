/**
 * Card Component
 * 
 * A versatile card component with multiple variants.
 * 
 * Usage:
 *   <Card>Default card content</Card>
 *   <Card variant="elevated">Elevated card</Card>
 *   <Card variant="outlined">Outlined card</Card>
 *   <Card variant="interactive" as="a" href="/link">Clickable card</Card>
 * 
 * Variants:
 *   - default: Clean white card with subtle shadow and border
 *   - elevated: Higher shadow for more prominence
 *   - outlined: No shadow, just border
 *   - interactive: For clickable cards, adds hover state
 * 
 * Props:
 *   - variant: 'default' | 'elevated' | 'outlined' | 'interactive' (default: 'default')
 *   - padding: 'none' | 'sm' | 'md' | 'lg' (default: 'md')
 *   - as: Element type (default: 'div')
 *   - children: Card content
 *   - className: optional additional class names
 */

const paddingClasses = {
  none: '',
  sm: 'hw-card-padding-sm',
  md: 'hw-card-padding-md',
  lg: 'hw-card-padding-lg',
}

const variantClasses = {
  default: 'hw-card',
  elevated: 'hw-card hw-card-elevated',
  outlined: 'hw-card hw-card-outlined',
  interactive: 'hw-card hw-card-interactive',
}

/**
 * Card component with variants
 */
function Card({
  children,
  className = '',
  variant = 'default',
  padding = 'md',
  as: Component = 'div',
  ...props
}) {
  const variantClass = variantClasses[variant] || variantClasses.default
  const paddingClass = paddingClasses[padding] || paddingClasses.md
  const classes = [variantClass, paddingClass, className].filter(Boolean).join(' ')
  
  return (
    <Component className={classes} {...props}>
      {children}
    </Component>
  )
}

export default Card
