/**
 * PageShell Component
 * 
 * Provides consistent page width and responsive padding for pages.
 * 
 * Usage:
 *   <PageShell>
 *     <YourPageContent />
 *   </PageShell>
 * 
 * Props:
 *   - maxWidth: 'default' | 'narrow' | 'wide' (default: 'default')
 *   - children: React nodes
 *   - className: optional additional class names
 */

const maxWidthClasses = {
  default: 'hw-container',
  narrow: 'hw-container-narrow',
  wide: 'hw-container',
}

function PageShell({ 
  children, 
  className = '', 
  maxWidth = 'default',
  as: Component = 'div' 
}) {
  const containerClass = maxWidthClasses[maxWidth] || maxWidthClasses.default
  const classes = [containerClass, className].filter(Boolean).join(' ')
  
  return (
    <Component className={classes}>
      {children}
    </Component>
  )
}

export default PageShell
