function SkeletonCard({ type = 'service' }) {
  const isReel = type === 'reel'
  const isAvatarCard = type === 'artisan' || type === 'review'
  const classes = ['skeleton-card', `${type}-skeleton`].join(' ')

  return (
    <div className={classes}>
      {isReel ? (
        <>
          <span className="skeleton-line short"></span>
          <span className="skeleton-line wide"></span>
          <span className="skeleton-line"></span>
        </>
      ) : (
        <>
          <span className={isAvatarCard ? 'skeleton-avatar' : 'skeleton-icon'}></span>
          <span className="skeleton-line wide"></span>
          <span className="skeleton-line"></span>
          <span className="skeleton-line short"></span>
        </>
      )}
    </div>
  )
}

function SkeletonPreview({ count = 3, label, type = 'service', className = '' }) {
  return (
    <div className={`loading-preview ${className}`.trim()} aria-label={label}>
      {Array.from({ length: count }, (_, index) => (
        <SkeletonCard key={`${type}-${index}`} type={type} />
      ))}
    </div>
  )
}

export default SkeletonPreview
