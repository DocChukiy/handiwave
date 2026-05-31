import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

const categories = ['All', 'Electrician', 'AC Repair', 'Cleaner', 'Plumber', 'Beauty', 'Painter']
const locations = ['All locations', 'Lagos', 'Abuja', 'Port Harcourt', 'Ibadan']

const artisans = [
  {
    name: 'Ada Okafor',
    skill: 'Electrician',
    category: 'Electrician',
    rating: 4.9,
    jobs: 186,
    area: 'Lekki',
    location: 'Lagos',
    price: 'From NGN 7,500',
    priceValue: 7500,
    topRated: true,
    verified: true,
  },
  {
    name: 'Musa Usman',
    skill: 'AC Repair',
    category: 'AC Repair',
    rating: 4.8,
    jobs: 142,
    area: 'Wuse',
    location: 'Abuja',
    price: 'From NGN 8,500',
    priceValue: 8500,
    topRated: true,
    verified: true,
  },
  {
    name: 'Chika Eze',
    skill: 'Cleaner',
    category: 'Cleaner',
    rating: 5.0,
    jobs: 211,
    area: 'GRA',
    location: 'Port Harcourt',
    price: 'From NGN 12,000',
    priceValue: 12000,
    topRated: true,
    verified: true,
  },
  {
    name: 'Bayo Ibrahim',
    skill: 'Plumber',
    category: 'Plumber',
    rating: 4.7,
    jobs: 128,
    area: 'Yaba',
    location: 'Lagos',
    price: 'From NGN 6,000',
    priceValue: 6000,
    topRated: false,
    verified: true,
  },
  {
    name: 'Joy Nwosu',
    skill: 'Hair Stylist',
    category: 'Beauty',
    rating: 4.9,
    jobs: 97,
    area: 'Surulere',
    location: 'Lagos',
    price: 'From NGN 5,000',
    priceValue: 5000,
    topRated: true,
    verified: true,
  },
  {
    name: 'Femi Lawal',
    skill: 'Painter',
    category: 'Painter',
    rating: 4.8,
    jobs: 118,
    area: 'Bodija',
    location: 'Ibadan',
    price: 'From NGN 25,000',
    priceValue: 25000,
    topRated: false,
    verified: true,
  },
]

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
        {categories.map((category) => (
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
            {locations.map((location) => (
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

      {filteredArtisans.length > 0 ? (
        <section className="starter-grid four">
          {filteredArtisans.map((artisan) => (
            <article className="person-card" key={artisan.name}>
              <div className="person-avatar">
                {artisan.name
                  .split(' ')
                  .map((part) => part[0])
                  .join('')}
              </div>
              <div className="artisan-badge-row">
                {artisan.verified && <span className="verified-badge">Verified</span>}
                {artisan.topRated && <span className="top-rated-badge">Top Rated</span>}
              </div>
              <h3>{artisan.name}</h3>
              <p>
                {artisan.skill} in {artisan.area}, {artisan.location}
              </p>
              <strong className="price-note">{artisan.price}</strong>
              <div className="mini-metrics">
                <span>
                  <strong>{artisan.rating}</strong> ★ Rating
                </span>
                <span>
                  <strong>{artisan.jobs}</strong> Jobs
                </span>
              </div>
              <div className="trust-indicators">
                <span>ID checked</span>
                <span>Escrow safe</span>
              </div>
              <div className="person-actions">
                <Link className="service-book-link" to="/artisan-profile">
                  View Profile
                </Link>
                <Link className="secondary-mini-link" to="/bookings">
                  Book Now
                </Link>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="empty-state">
          <h2>No artisans found</h2>
          <p>Try another service, location, rating, or price range.</p>
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
        </section>
      )}
    </div>
  )
}

export default Artisans
