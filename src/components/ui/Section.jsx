/**
 * Section Component
 * 
 * Provides consistent vertical spacing with optional title and description.
 * 
 * Usage:
 *   <Section 
 *     title="My Section Title"
 *     description="Optional description text"
 *     kicker="Optional kicker text"
 *   >
 *     <SectionContent />
 *   </Section>
 * 
 * Props:
 *   - title: Section title (renders h2)
 *   - description: Optional description text
 *   - kicker: Optional kicker text (e.g., "Featured", "Popular")
 *   - children: Section content
 *   - className: optional additional class names
 *   - headerClassName: optional class for header wrapper
 *   - align: 'left' | 'center' (default: 'left')
 */

function Section({
  children,
  className = '',
  headerClassName = '',
  title,
  description,
  kicker,
  align = 'left',
}) {
  const alignClass = align === 'center' ? 'hw-text-center' : ''
  
  const header = (title || description) && (
    <div className={`hw-section-header ${alignClass} ${headerClassName}`.trim()}>
      {kicker && <p className="hw-section-kicker">{kicker}</p>}
      {title && <h2 className="hw-section-title">{title}</h2>}
      {description && <p className="hw-section-description">{description}</p>}
    </div>
  )
  
  return (
    <section className={className}>
      {header}
      {children}
    </section>
  )
}

export default Section
