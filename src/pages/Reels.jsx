import SkeletonPreview from '../components/Skeletons.jsx'
import { ReelCard } from '../components/cards.jsx'
import { reels } from '../data/reels.js'

function Reels() {
  return (
    <div className="reels-page">
      <section className="page-hero compact reels-hero">
        <p className="section-kicker">Handiwave reels</p>
        <h1>Watch artisans prove their craft</h1>
        <p>
          Swipe through real service moments, transformations, and behind-the-scenes
          work from verified professionals across Nigeria.
        </p>
      </section>

      <SkeletonPreview
        className="reels-loading-preview"
        label="Reel loading placeholders"
        type="reel"
      />

      <section className="reels-showcase-grid">
        {reels.map((reel, index) => (
          <ReelCard
            index={index}
            key={`${reel.artisan}-${reel.service}`}
            reel={reel}
          />
        ))}
      </section>
    </div>
  )
}

export default Reels
