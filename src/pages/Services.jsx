import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import EmptyState from '../components/EmptyState.jsx'
import SkeletonPreview from '../components/Skeletons.jsx'
import { ServiceCard } from '../components/cards.jsx'
import { getServices } from '../services/serviceService.js'
import PageShell from '../components/ui/PageShell.jsx'
import Section from '../components/ui/Section.jsx'
import Card from '../components/ui/Card.jsx'
import Badge from '../components/ui/Badge.jsx'
import {
  Laptop,
  Zap,
  Snowflake,
  Droplets,
  ShieldCheck,
  Wrench,
} from 'lucide-react'

const baseCategories = ['All']
const baseLocations = ['All locations', 'Lagos', 'Abuja', 'Port Harcourt', 'Ibadan']

// Presentation categories with Lucide icons
const presentationCategories = [
  {
    id: 'it-tech',
    title: 'IT & Technology',
    icon: Laptop,
    searchQuery: 'Technology',
    keywords: ['technology', 'computer', 'laptop', 'phone', 'it', 'network', 'software'],
  },
  {
    id: 'electrical',
    title: 'Electrical & Power',
    icon: Zap,
    searchQuery: 'Electrical',
    keywords: ['electrical', 'electrician', 'wiring', 'power', 'generator', 'solar'],
  },
  {
    id: 'ac-cooling',
    title: 'AC & Cooling',
    icon: Snowflake,
    searchQuery: 'AC',
    keywords: ['ac', 'air', 'cooling', 'refrigeration', 'fridge', 'freezer'],
  },
  {
    id: 'plumbing',
    title: 'Plumbing & Water',
    icon: Droplets,
    searchQuery: 'Plumbing',
    keywords: ['plumbing', 'plumber', 'pipe', 'drain', 'water', 'leak', 'toilet'],
  },
  {
    id: 'security',
    title: 'Security & Smart',
    icon: ShieldCheck,
    searchQuery: 'Security',
    keywords: ['security', 'cctv', 'camera', 'smart', 'lock', 'access', 'alarm'],
  },
  {
    id: 'maintenance',
    title: 'Maintenance & Repairs',
    icon: Wrench,
    searchQuery: 'Maintenance',
    keywords: ['maintenance', 'repair', 'carpenter', 'painting', 'furniture', 'general'],
  },
]

// Map search query to presentation category
function getPresentationCategoryFromSearch(searchQuery) {
  if (!searchQuery) return null

  const lowerQuery = searchQuery.toLowerCase()

  for (const category of presentationCategories) {
    if (category.searchQuery.toLowerCase().includes(lowerQuery)) {
      return category
    }
    if (category.keywords.some(keyword => lowerQuery.includes(keyword))) {
      return category
    }
  }

  return null
}

function serviceMatchesPresentationCategory(service, activeCategory) {
  if (activeCategory === 'All') return true
  const category = presentationCategories.find((item) => item.searchQuery === activeCategory)
  if (!category) return service.category === activeCategory
  const serviceText = [service.title, service.description, service.category].filter(Boolean).join(' ').toLowerCase()
  const serviceWords = serviceText.split(/[^a-z0-9]+/).filter(Boolean)
  return category.keywords.some((keyword) => (
    keyword.includes(' ')
      ? serviceText.includes(keyword)
      : serviceWords.includes(keyword)
  ))
}

// Get context header content based on search
function getHeaderContext(searchTerm, activeCategory) {
  if (searchTerm && activeCategory === 'All') {
    const matchedCategory = getPresentationCategoryFromSearch(searchTerm)
    if (matchedCategory) {
      return {
        title: matchedCategory.title,
        description: `Find help with ${matchedCategory.title.toLowerCase()} services.`,
        isSearch: true,
        searchTerm,
      }
    }
    return {
      title: `Services matching "${searchTerm}"`,
      description: 'Browse available services below.',
      isSearch: true,
      searchTerm,
    }
  }

  if (activeCategory !== 'All') {
    const matchedCategory = presentationCategories.find(
      cat => cat.searchQuery.toLowerCase() === activeCategory.toLowerCase()
    )
    if (matchedCategory) {
      return {
        title: matchedCategory.title,
        description: `Browse ${matchedCategory.title.toLowerCase()} services.`,
        isCategory: true,
      }
    }
    return {
      title: activeCategory,
      description: `Browse ${activeCategory} services.`,
      isCategory: true,
    }
  }

  return {
    title: 'What do you need done?',
    description: 'Choose a category or search for a specific service.',
    isDefault: true,
  }
}

function Services() {
  const [searchParams] = useSearchParams()
  const [activeCategory, setActiveCategory] = useState('All')
  const [availableServices, setAvailableServices] = useState([])
  const [dataError, setDataError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('search') || '')
  const [locationFilter, setLocationFilter] = useState('All locations')
  const [minimumRating, setMinimumRating] = useState('0')
  const [maximumPrice, setMaximumPrice] = useState(30000)
  const [showFilters, setShowFilters] = useState(false)

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
        serviceMatchesPresentationCategory(service, activeCategory)
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

  // Determine header context
  const headerContext = getHeaderContext(searchTerm, activeCategory)

  return (
    <PageShell>
      <div className="hw-services-page">

        {/* ============================================
            SECTION 1: SMART CONTEXT HEADER
            ============================================ */}
        <header className="hw-services-header">
          <h1>{headerContext.title}</h1>
          <p>{headerContext.description}</p>
        </header>

        {/* ============================================
            SECTION 2: CATEGORY NAVIGATION
            ============================================ */}
        <nav className="hw-category-nav" aria-label="Service categories">
          <div className="hw-category-scroll">
            {presentationCategories.map((category) => {
              const Icon = category.icon
              const isActive = activeCategory === category.searchQuery

              return (
                <motion.button
                  key={category.id}
                  className={`hw-category-chip ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveCategory(isActive ? 'All' : category.searchQuery)}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                >
                  <Icon size={18} />
                  <span>{category.title}</span>
                </motion.button>
              )
            })}
          </div>
        </nav>

        {/* ============================================
            SECTION 3: SEARCH
            ============================================ */}
        <section className="hw-services-search-section">
          <form
            className="hw-services-search-form"
            onSubmit={(event) => event.preventDefault()}
          >
            <div className="hw-search-input-wrapper">
              <svg className="hw-search-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.3-4.3"/>
              </svg>
              <input
                className="hw-search-input"
                type="search"
                placeholder="Search repairs, installation, cleaning, AC servicing..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                aria-label="Search services"
              />
              {searchTerm && (
                <button
                  type="button"
                  className="hw-search-clear"
                  onClick={() => setSearchTerm('')}
                  aria-label="Clear search"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18"/>
                    <path d="m6 6 12 12"/>
                  </svg>
                </button>
              )}
            </div>
          </form>
        </section>

        {/* ============================================
            SECTION 4: POPULAR SERVICES
            ============================================ */}
        {popularServices.length > 0 && !searchTerm && activeCategory === 'All' && (
          <section className="hw-popular-services">
            <div className="hw-section-header hw-flex-between">
              <h2>Popular services</h2>
            </div>
            <div className="hw-popular-scroll">
              {popularServices.slice(0, 6).map((service) => (
                <motion.div
                  key={service.title}
                  className="hw-popular-card"
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link to="/artisans">
                    <span className="hw-popular-icon">{service.icon}</span>
                    <div className="hw-popular-info">
                      <strong>{service.title}</strong>
                      <span>{service.price}</span>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* ============================================
            SECTION 5: FILTER TOGGLE (Mobile)
            ============================================ */}
        <div className="hw-filter-toggle">
          <button
            className="hw-btn hw-btn-secondary"
            type="button"
            onClick={() => setShowFilters(!showFilters)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            Filters
            {(locationFilter !== 'All locations' || minimumRating !== '0' || maximumPrice < 30000) && (
              <Badge variant="info" className="hw-filter-badge">Active</Badge>
            )}
          </button>
          <span className="hw-results-count">
            {filteredServices.length} service{filteredServices.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* ============================================
            SECTION 6: FILTER PANEL
            ============================================ */}
        <section className={`hw-filter-panel ${showFilters ? 'show' : ''}`}>
          <div className="hw-filter-grid">
            <div className="hw-filter-group">
              <label htmlFor="location-filter">Location</label>
              <select
                id="location-filter"
                className="hw-select"
                value={locationFilter}
                onChange={(event) => setLocationFilter(event.target.value)}
              >
                {baseLocations.map((location) => (
                  <option key={location}>{location}</option>
                ))}
              </select>
            </div>

            <div className="hw-filter-group">
              <label htmlFor="rating-filter">Minimum rating</label>
              <select
                id="rating-filter"
                className="hw-select"
                value={minimumRating}
                onChange={(event) => setMinimumRating(event.target.value)}
              >
                <option value="0">Any rating</option>
                <option value="4.5">4.5+</option>
                <option value="4.8">4.8+</option>
                <option value="4.9">4.9+</option>
              </select>
            </div>

            <div className="hw-filter-group hw-filter-range">
              <label htmlFor="price-filter">
                Max price: <strong>NGN {Number(maximumPrice).toLocaleString()}</strong>
              </label>
              <input
                id="price-filter"
                type="range"
                className="hw-range-input"
                min="5000"
                max="30000"
                step="1000"
                value={maximumPrice}
                onChange={(event) => setMaximumPrice(event.target.value)}
              />
              <div className="hw-range-labels">
                <span>NGN 5,000</span>
                <span>NGN 30,000</span>
              </div>
            </div>
          </div>

          <div className="hw-filter-actions">
            <button
              type="button"
              className="hw-btn hw-btn-ghost"
              onClick={() => {
                setActiveCategory('All')
                setSearchTerm('')
                setLocationFilter('All locations')
                setMinimumRating('0')
                setMaximumPrice(30000)
              }}
            >
              Reset all
            </button>
            <button
              type="button"
              className="hw-btn hw-btn-primary hw-hide-desktop"
              onClick={() => setShowFilters(false)}
            >
              Show results
            </button>
          </div>
        </section>

        {/* ============================================
            SECTION 7: SERVICE DISCOVERY GRID
            ============================================ */}
        <section className="hw-services-grid-section">
          <div className="hw-section-header hw-flex-between hw-hide-mobile">
            <h2>Explore services</h2>
            <span className="hw-results-count">
              {filteredServices.length} service{filteredServices.length !== 1 ? 's' : ''} available
            </span>
          </div>

          {dataError && (
            <Card variant="outlined" className="hw-error-card">
              <p className="hw-error">
                Supabase services could not load. {dataError}
              </p>
              <button
                type="button"
                className="hw-btn hw-btn-primary"
                onClick={() => window.location.reload()}
              >
                Retry
              </button>
            </Card>
          )}

          <motion.div
            className="hw-services-grid"
            initial="hidden"
            animate="visible"
            transition={{ staggerChildren: 0.06 }}
          >
            {isLoading ? (
              <SkeletonPreview label="Loading services" type="service" />
            ) : dataError ? (
              <EmptyState
                action={
                  <button type="button" onClick={() => window.location.reload()}>
                    Retry
                  </button>
                }
                className="services-empty-state"
                title="Unable to load services"
              >
                Please check your Supabase connection and try again.
              </EmptyState>
            ) : filteredServices.length > 0 ? (
              <>
                {filteredServices.map((service) => (
                  <ServiceCard key={service.title} service={service} />
                ))}
              </>
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

        {/* ============================================
            SECTION 8: CATEGORY FILTER CHIPS (Desktop)
            ============================================ */}
        <section className="hw-category-filters-section hw-hide-mobile">
          <div className="hw-section-header">
            <h2>Browse by category</h2>
          </div>
          <div className="hw-category-chips">
            {categories.map((category) => (
              <button
                className={`hw-chip ${activeCategory === category ? 'active' : ''}`}
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </section>

        {/* ============================================
            CTA: FIND PROFESSIONALS
            ============================================ */}
        <section className="hw-services-cta">
          <Card variant="elevated" className="hw-cta-card">
            <div className="hw-cta-content">
              <h3>Ready to book?</h3>
              <p>Find and compare verified professionals in your area.</p>
              <Link to="/artisans" className="hw-btn hw-btn-primary hw-btn-lg">
                Find professionals
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14"/>
                  <path d="m12 5 7 7-7 7"/>
                </svg>
              </Link>
            </div>
          </Card>
        </section>

      </div>
    </PageShell>
  )
}

export default Services
