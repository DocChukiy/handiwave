function EmptyState({ action, children, compact = false, className = '', title }) {
  const classes = ['empty-state', compact ? 'compact' : '', className]
    .filter(Boolean)
    .join(' ')

  return (
    <section className={classes}>
      <h2>{title}</h2>
      {children && <p>{children}</p>}
      {action}
    </section>
  )
}

export default EmptyState
