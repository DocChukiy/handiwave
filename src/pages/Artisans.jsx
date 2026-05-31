import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import EmptyState from '../components/EmptyState.jsx'
import SkeletonPreview from '../components/Skeletons.jsx'
import SectionHeader from '../components/SectionHeader.jsx'
import { ArtisanCard, RecentArtisanCard } from '../components/cards.jsx'
import {
  artisanCategories,
  artisanLocations,
  artisans,
  recentlyViewedArtisans,
  savedArtisans,
} from '../data/artisans.js'

function Artisans() {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [locationFilter, setLocationFilter] = useState('All locations')
  const [minimumRating, setMinimumRating] = useState('0')
  const [maximumPrice, setMaximumPrice] = useState(30000)

  const filteredArtisans = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    return artisans.filter((artisan) => {
      const matchesSearch =
        !query ||
        artisan.name.toLowerCase().includes(query) ||
        artisan.skill.toLowerCase().includes(query) ||
        artisan.location.toLowerCase().includes(query) ||
        artisan.area.toLowerCase().includes(query)
      const matchesCategory =
        activeCategory === 'All' || artisan.category === activeCategory
      const matchesLocation =
        locationFilter === 'All locations' || artisan.location === locationFilter
      const matchesRating = artisan.rating >= Number(minimumRating)
      const matchesPrice = artisan.priceValue <= Number(maximumPrice)

      return (
        matchesSearch &&
        matchesCategory &&
        matchesLocation &&
        matchesRating &&
        matchesPrice
      )
    })
  }, [activeCategory, locationFilter, maximumPrice, minimumRating, searchTerm])

  return (
    <div className="starter-page">
      <section className="page-hero compact">
        <p className="section-kicker">Verified artisans</p>
        <h1>Find skilled professionals near you</h1>
        <p>
          Browse trusted Handiwave artisans with ratings, completed jobs, and
          local availability.
        </p>
      </section>

      <section className="toolbar-card filter-toolbar">
        <input
          placeholder="Search by service, artisan, or location"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
        <button type="button">Search</button>
      </section>

      <section className="category-filters" aria-label="Artisan categories">
        {artisanCategories.map((category) => (
          <button
            className={activeCategory === category ? 'active' : ''}
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
          >
            {category}
          </button>
        ))}
      </section>

      <section className="filter-panel">
        <label>
          Location
          <select
            value={locationFilter}
            onChange={(event) => setLocationFilter(event.target.value)}
          >
            {artisanLocations.map((location) => (
              <option key={location}>{location}</option>
            ))}
          </select>
        </label>
        <label>
          Minimum rating
          <select
            value={minimumRating}
            onChange={(event) => setMinimumRating(event.target.value)}
          >
            <option value="0">Any rating</option>
            <option value="4.5">4.5+</option>
            <option value="4.8">4.8+</option>
            <option value="4.9">4.9+</option>
          </select>
        </label>
        <label>
          Max price: NGN {Number(maximumPrice).toLocaleString()}
          <input
            type="range"
            min="5000"
            max="30000"
            step="1000"
            value={maximumPrice}
            onChange={(event) => setMaximumPrice(event.target.value)}
          />
        </label>
      </section>

      <section className="saved-artisans-section">
        <SectionHeader
          count={`${savedArtisans.length} saved`}
          kicker="Saved artisans"
          title="Your trusted shortlist"
        />

        {savedArtisans.length > 0 ? (
          <div className="starter-grid four">
            {savedArtisans.map((artisan) => (
              <article className="person-card compact-person-card" key={artisan.name}>
                <div className="person-avatar">{artisan.initials}</div>
                <h3>{artisan.name}</h3>
                <p>{artisan.skill}</p>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState compact title="No saved artisans yet">
            Tap the save badge on artisans you want to book again later.
          </EmptyState>
        )}
      </section>

      <SkeletonPreview label="Artisan card loading placeholders" type="artisan" />

      {filteredArtisans.length > 0 ? (
        <section className="starter-grid four">
          {filteredArtisans.map((artisan) => (
            <ArtisanCard artisan={artisan} key={artisan.name} />
          ))}
        </section>
      ) : (
        <EmptyState
          action={(
            <button
              type="button"
              onClick={() => {
                setSearchTerm('')
                setActiveCategory('All')
                setLocationFilter('All locations')
                setMinimumRating('0')
                setMaximumPrice(30000)
              }}
            >
              Reset filters
            </button>
          )}
          title="No artisans found"
        >
          Try another service, location, rating, or price range.
        </EmptyState>
      )}

      <section className="recently-viewed-section">
        <SectionHeader
          action={<Link to="/services">Explore services</Link>}
          kicker="Recently viewed"
          title="Pick up where you left off"
        />

        <div className="recently-viewed-row">
          {recentlyViewedArtisans.map((artisan) => (
            <RecentArtisanCard artisan={artisan} key={artisan.name} />
          ))}
        </div>
      </section>
    </div>
  )
}

export default Artisans
