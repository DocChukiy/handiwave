import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import EmptyState from '../components/EmptyState.jsx'
import SkeletonPreview from '../components/Skeletons.jsx'
import { ServiceCard } from '../components/cards.jsx'
import { getServices } from '../services/serviceService.js'

const baseCategories = ['All']
const baseLocations = ['All locations', 'Lagos', 'Abuja', 'Port Harcourt', 'Ibadan']

function Services() {
  const [activeCategory, setActiveCategory] = useState('All')
  const [availableServices, setAvailableServices] = useState([])
  const [dataError, setDataError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [locationFilter, setLocationFilter] = useState('All locations')
  const [minimumRating, setMinimumRating] = useState('0')
  const [maximumPrice, setMaximumPrice] = useState(30000)
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const query = searchParams.get('search') || ''

    if (query !== searchTerm) {
      setSearchTerm(query)
    }
  }, [searchParams])

  useEffect(() => {
    let isMounted = true

    async function loadServices() {
      setDataError('')
      setIsLoading(true)

      try {
        const { data, error } = await getServices()

        if (!isMounted) {
          return
        }

        if (error) {
          setDataError(error.message)
          setAvailableServices([])
          return
        }

        setAvailableServices(data)
      } catch (error) {
        if (isMounted) {
          setDataError(error.message)
          setAvailableServices([])
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadServices()

    return () => {
      isMounted = false
    }
  }, [])

  const filteredServices = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    return availableServices.filter((service) => {
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
  }, [activeCategory, availableServices, locationFilter, maximumPrice, minimumRating, searchTerm])

  const popularServices = availableServices.filter((service) => service.popular)
  const categories = useMemo(
    () => [
      ...new Set([
        ...baseCategories,
        ...availableServices.map((service) => service.category).filter(Boolean),
      ]),
    ],
    [availableServices],
  )

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
              {baseLocations.map((location) => (
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

        <SkeletonPreview label="Service card loading placeholders" type="service" />

        {dataError && (
          <p className="auth-error">
            Supabase services could not load. {dataError}
          </p>
        )}

        <motion.div
          className="services-grid"
          initial="hidden"
          animate="visible"
          transition={{ staggerChildren: 0.06 }}
        >
          {isLoading ? (
            <SkeletonPreview label="Loading services" type="service" />
          ) : dataError ? (
            <EmptyState
              action={<button type="button" onClick={() => window.location.reload()}>Retry</button>}
              className="services-empty-state"
              title="Unable to load services"
            >
              Please check your Supabase connection and try again.
            </EmptyState>
          ) : filteredServices.length > 0 ? (
            filteredServices.map((service) => (
              <ServiceCard key={service.title} service={service} />
            ))
          ) : availableServices.length === 0 ? (
            <EmptyState
              className="services-empty-state"
              title="No services in Supabase yet"
            >
              Run the Handiwave service seed SQL in Supabase to populate this page.
            </EmptyState>
          ) : (
            <EmptyState
              action={(
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
              )}
              className="services-empty-state"
              title="No services found"
            >
              Try another keyword, category, location, rating, or price range.
            </EmptyState>
          )}
        </motion.div>
      </section>
    </div>
  )
}

export default Services
