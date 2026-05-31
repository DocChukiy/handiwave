import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

const categories = ['All', 'Repairs', 'Home Care', 'Installation', 'Auto', 'Beauty']
const locations = ['All locations', 'Lagos', 'Abuja', 'Port Harcourt', 'Ibadan']

const services = [
  {
    icon: '⚡',
    title: 'Electrical Repairs',
    category: 'Repairs',
    description: 'Fix sockets, wiring, lighting, breakers, and power issues safely.',
    price: 'From NGN 7,500',
    priceValue: 7500,
    rating: 4.9,
    locations: ['Lagos', 'Ibadan'],
    duration: 'Same day',
    popular: true,
  },
  {
    icon: '🚰',
    title: 'Plumbing Service',
    category: 'Repairs',
    description: 'Repair leaks, blocked drains, taps, toilets, and water systems.',
    price: 'From NGN 6,000',
    priceValue: 6000,
    rating: 4.7,
    locations: ['Lagos', 'Port Harcourt'],
    duration: '2-4 hours',
    popular: true,
  },
  {
    icon: '❄️',
    title: 'AC Installation & Repair',
    category: 'Installation',
    description: 'Book AC servicing, installation, gas refill, and diagnostics.',
    price: 'From NGN 8,500',
    priceValue: 8500,
    rating: 4.8,
    locations: ['Abuja', 'Lagos'],
    duration: 'Same day',
    popular: true,
  },
  {
    icon: '✨',
    title: 'Deep Cleaning',
    category: 'Home Care',
    description: 'Reliable cleaning for apartments, offices, shortlets, and move-ins.',
    price: 'From NGN 12,000',
    priceValue: 12000,
    rating: 5.0,
    locations: ['Port Harcourt', 'Lagos'],
    duration: '3-6 hours',
    popular: true,
  },
  {
    icon: '🎨',
    title: 'Painting',
    category: 'Home Care',
    description: 'Refresh interiors and exteriors with clean professional finishing.',
    price: 'From NGN 25,000',
    priceValue: 25000,
    rating: 4.8,
    locations: ['Ibadan', 'Lagos'],
    duration: '1-3 days',
    popular: false,
  },
  {
    icon: '🪚',
    title: 'Carpentry',
    category: 'Installation',
    description: 'Furniture repairs, shelves, doors, cabinets, and custom fittings.',
    price: 'From NGN 10,000',
    priceValue: 10000,
    rating: 4.6,
    locations: ['Lagos', 'Abuja'],
    duration: 'By quote',
    popular: false,
  },
  {
    icon: '🔧',
    title: 'Generator Repair',
    category: 'Repairs',
    description: 'Service and repair petrol or diesel generators at your location.',
    price: 'From NGN 9,000',
    priceValue: 9000,
    rating: 4.8,
    locations: ['Lagos', 'Ibadan', 'Abuja'],
    duration: 'Same day',
    popular: true,
  },
  {
    icon: '🔌',
    title: 'Appliance Repair',
    category: 'Repairs',
    description: 'Fix fridges, washing machines, cookers, microwaves, and more.',
    price: 'From NGN 8,000',
    priceValue: 8000,
    rating: 4.7,
    locations: ['Port Harcourt', 'Lagos'],
    duration: 'Same day',
    popular: false,
  },
  {
    icon: '🚗',
    title: 'Mechanic',
    category: 'Auto',
    description: 'Diagnostics, servicing, battery checks, and emergency auto support.',
    price: 'From NGN 10,000',
    priceValue: 10000,
    rating: 4.6,
    locations: ['Lagos', 'Abuja'],
    duration: '1-5 hours',
    popular: false,
  },
  {
    icon: '💈',
    title: 'Hair Stylist / Barber',
    category: 'Beauty',
    description: 'Book cuts, styling, braids, grooming, and home beauty appointments.',
    price: 'From NGN 5,000',
    priceValue: 5000,
    rating: 4.9,
    locations: ['Lagos', 'Abuja'],
    duration: '1-3 hours',
    popular: true,
  },
]

const cardVariants = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0 },
}

function Services() {
  const [activeCategory, setActiveCategory] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')
  const [locationFilter, setLocationFilter] = useState('All locations')
  const [minimumRating, setMinimumRating] = useState('0')
  const [maximumPrice, setMaximumPrice] = useState(30000)

  const filteredServices = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    return services.filter((service) => {
      const matchesCategory =
        activeCategory === 'All' || service.category === activeCategory
      const matchesSearch =
        !query ||
        service.title.toLowerCase().includes(query) ||
        service.description.toLowerCase().includes(query) ||
        service.category.toLowerCase().includes(query) ||
        service.locations.some((location) => location.toLowerCase().includes(query))
      const matchesLocation =
        locationFilter === 'All locations' ||
        service.locations.includes(locationFilter)
      const matchesRating = service.rating >= Number(minimumRating)
      const matchesPrice = service.priceValue <= Number(maximumPrice)

      return matchesCategory && matchesSearch && matchesLocation && matchesRating && matchesPrice
    })
  }, [activeCategory, locationFilter, maximumPrice, minimumRating, searchTerm])

  const popularServices = services.filter((service) => service.popular)

  return (
    <div className="services-page">
      <section className="services-hero">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <p className="section-kicker">Handiwave services</p>
          <h1>Find the right service for your home</h1>
          <p>
            Search trusted service categories, compare options, and book
            verified artisans for everyday work across Nigeria.
          </p>
        </motion.div>

        <motion.form
          className="services-search"
          onSubmit={(event) => event.preventDefault()}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
        >
          <input
            aria-label="Search services"
            type="search"
            placeholder="Search electrical repairs, cleaning, AC repair..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
          <button type="submit">Search</button>
        </motion.form>
      </section>

      <section className="popular-services-section">
        <div className="services-section-header">
          <div>
            <p className="section-kicker">Most booked</p>
            <h2>Popular services</h2>
          </div>
          <Link to="/bookings">View bookings</Link>
        </div>

        <div className="popular-services-row">
          {popularServices.slice(0, 5).map((service) => (
            <motion.div
              className="popular-service-card"
              key={service.title}
              whileHover={{ y: -6 }}
            >
              <Link to="/artisans">
                <span>{service.icon}</span>
                <strong>{service.title}</strong>
                <small>{service.price}</small>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="services-list-section">
        <div className="services-section-header">
          <div>
            <p className="section-kicker">Browse categories</p>
            <h2>All services</h2>
          </div>
          <span>{filteredServices.length} available</span>
        </div>

        <div className="category-filters" aria-label="Service categories">
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
        </div>

        <div className="filter-panel">
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
        </div>

        <div className="loading-preview" aria-label="Service card loading placeholders">
          {[1, 2, 3].map((item) => (
            <div className="skeleton-card service-skeleton" key={item}>
              <span className="skeleton-icon"></span>
              <span className="skeleton-line wide"></span>
              <span className="skeleton-line"></span>
              <span className="skeleton-line short"></span>
            </div>
          ))}
        </div>

        <motion.div
          className="services-grid"
          initial="hidden"
          animate="visible"
          transition={{ staggerChildren: 0.06 }}
        >
          {filteredServices.length > 0 ? (
            filteredServices.map((service) => (
              <motion.article
                className="service-list-card"
                key={service.title}
                variants={cardVariants}
                transition={{ duration: 0.35, ease: 'easeOut' }}
                whileHover={{ y: -8, scale: 1.01 }}
              >
                <div className="service-card-top">
                  <span className="service-icon">{service.icon}</span>
                  <span className="service-category">{service.category}</span>
                </div>
                <h3>{service.title}</h3>
                <p>{service.description}</p>
                <div className="service-card-meta">
                  <span>{service.price}</span>
                  <span>{service.rating}+ rating</span>
                  <span>{service.duration}</span>
                  <span>{service.locations[0]}</span>
                </div>
                <Link className="service-book-link" to="/artisans">
                  Find Artisan
                </Link>
              </motion.article>
            ))
          ) : (
            <section className="empty-state services-empty-state">
              <h2>No services found</h2>
              <p>Try another keyword, category, location, rating, or price range.</p>
              <button
                type="button"
                onClick={() => {
                  setActiveCategory('All')
                  setSearchTerm('')
                  setLocationFilter('All locations')
                  setMinimumRating('0')
                  setMaximumPrice(30000)
                }}
              >
                Reset filters
              </button>
            </section>
          )}
        </motion.div>
      </section>
    </div>
  )
}

export default Services
