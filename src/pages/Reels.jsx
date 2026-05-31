const reels = [
  { artisan: 'Ada Okafor', service: 'Electrician', caption: 'Smart lighting install in Lekki', likes: '2.4k' },
  { artisan: 'Musa Usman', service: 'AC Repair', caption: 'Fast AC servicing before noon', likes: '1.8k' },
  { artisan: 'Chika Eze', service: 'Cleaner', caption: 'Shortlet reset in under 3 hours', likes: '3.1k' },
]

function Reels() {
  return (
    <div className="starter-page">
      <section className="page-hero compact">
        <p className="section-kicker">Reels</p>
        <h1>Watch artisans prove their craft</h1>
        <p>Short previews of real work, transformations, and service moments from Handiwave professionals.</p>
      </section>

      <section className="reels-grid">
        {reels.map((reel) => (
          <article className="reel-card" key={reel.caption}>
            <div className="video-placeholder">
              <div className="play-button">▶</div>
              <div className="reel-side-actions"><span className="like-icon">♥</span><small>{reel.likes}</small></div>
              <div className="reel-overlay">
                <div className="reel-profile"><span>{reel.artisan[0]}</span><div><strong>{reel.artisan}</strong><p>{reel.service}</p></div></div>
                <p className="reel-caption">{reel.caption}</p>
                <button className="reel-book-button" type="button">Book</button>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}

export default Reels
