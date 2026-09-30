import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import EmptyState from '../components/EmptyState.jsx'
import SkeletonPreview from '../components/Skeletons.jsx'
import PageShell from '../components/ui/PageShell.jsx'
import Card from '../components/ui/Card.jsx'
import Badge from '../components/ui/Badge.jsx'
import Avatar from '../components/ui/Avatar.jsx'
import { ArtisanCard, RecentArtisanCard } from '../components/cards.jsx'
import {
  artisanCategories,
  artisanLocations,
  artisans,
  recentlyViewedArtisans,
  savedArtisans,
} from '../data/artisans.js'
import { getVerifiedArtisans } from '../services/artisanService.js'
import {
  Laptop,
  Zap,
  Snowflake,
  Droplets,
  ShieldCheck,
  Wrench,
} from 'lucide-react'

// Presentation categories with Lucide icons
const presentationCategories = [
  {
    id: 'it-tech',
    title: 'IT & Technology',
    icon: Laptop,
    keywords: ['technology', 'computer', 'laptop', 'it', 'network', 'software'],
  },
  {
    id: 'electrical',
    title: 'Electrical & Power',
    icon: Zap,
    keywords: ['electrical', 'electrician', 'wiring', 'power', 'generator', 'solar'],
  },
  {
    id: 'ac-cooling',
    title: 'AC & Cooling',
    icon: Snowflake,
    keywords: ['ac', 'air', 'cooling', 'refrigeration', 'fridge', 'freezer'],
  },
  {
    id: 'plumbing',
    title: 'Plumbing & Water',
    icon: Droplets,
    keywords: ['plumbing', 'plumber', 'pipe', 'drain', 'water', 'leak', 'toilet'],
  },
  {
    id: 'security',
    title: 'Security & Smart',
    icon: ShieldCheck,
    keywords: ['security', 'cctv', 'camera', 'smart', 'lock', 'access', 'alarm'],
  },
  {
    id: 'maintenance',
    title: 'Maintenance & Repairs',
    icon: Wrench,
    keywords: ['maintenance', 'repair', 'carpenter', 'painting', 'furniture', 'general'],
  },
]

// Map category keywords to presentation category
function getPresentationCategoryFromSkill(skill) {
  if (!skill) return null
  const lowerSkill = skill.toLowerCase()
  const skillWords = lowerSkill.split(/[^a-z0-9]+/).filter(Boolean)
  for (const category of presentationCategories) {
    if (category.keywords.some((keyword) => (
      keyword.includes(' ')
        ? lowerSkill.includes(keyword)
        : skillWords.includes(keyword)
    ))) {
      return category
    }
  }
  return null
}

const sortOptions = [
  { label: 'Recommended', value: 'recommended' },
  { label: 'Highest Rated', value: 'highest-rated' },
  { label: 'Most Reviews', value: 'most-reviews' },
  { label: 'Most Jobs Completed', value: 'most-jobs' },
  { label: 'Recently Joined', value: 'recently-joined' },
]

function getSearchText(artisan) {
  return [
    artisan.name,
    artisan.businessName,
    artisan.skill,
    artisan.featuredSkill,
    artisan.category,
    artisan.area,
    artisan.location,
    artisan.fullLocation,
    artisan.serviceArea,
    artisan.bio,
  ].filter(Boolean).join(' ').toLowerCase()
}

function getCompletedJobLabel(value) {
  if (value === '100') {
    return '100+ jobs'
  }

  if (value === '50') {
    return '50+ jobs'
  }

  if (value === '10') {
    return '10+ jobs'
  }

  return 'Any jobs'
}

function Artisans() {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [availableArtisans, setAvailableArtisans] = useState(artisans)
  const [dataError, setDataError] = useState('')
  const [completedJobsFilter, setCompletedJobsFilter] = useState('0')
  const [isAvailableOnly, setIsAvailableOnly] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [locationFilter, setLocationFilter] = useState('All locations')
  const [minimumRating, setMinimumRating] = useState('0')
  const [sortBy, setSortBy] = useState('recommended')
  const [topRatedOnly, setTopRatedOnly] = useState(false)
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadArtisans() {
      setDataError('')
      setIsLoading(true)

      try {
        const { data, error } = await getVerifiedArtisans()

        if (!isMounted) {
          return
        }

        if (error) {
          setDataError(error.message)
          setAvailableArtisans(artisans)
          return
        }

        setAvailableArtisans(data.length > 0 ? data : artisans)
      } catch (error) {
        if (isMounted) {
          setDataError(error.message)
          setAvailableArtisans(artisans)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadArtisans()

    return () => {
      isMounted = false
    }
  }, [])

  const filteredAndSortedArtisans = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    const filtered = availableArtisans.filter((artisan) => {
      const matchesSearch = !query || getSearchText(artisan).includes(query)
      const matchesCategory =
        activeCategory === 'All' ||
        getPresentationCategoryFromSkill(getSearchText(artisan))?.title === activeCategory
      const matchesLocation =
        locationFilter === 'All locations' ||
        artisan.location === locationFilter ||
        artisan.area === locationFilter ||
        artisan.fullLocation === locationFilter
      const matchesRating = artisan.rating >= Number(minimumRating)
      const matchesCompletedJobs = (artisan.completedJobs || 0) >= Number(completedJobsFilter)
      const matchesVerified = !verifiedOnly || artisan.verified
      const matchesTopRated = !topRatedOnly || (
        Number(artisan.rating) >= 4.5 &&
        Number(artisan.reviewCount || 0) >= 3
      )
      const matchesAvailability = !isAvailableOnly || artisan.isAvailable !== false

      return (
        matchesSearch &&
        matchesCategory &&
        matchesLocation &&
        matchesRating &&
        matchesCompletedJobs &&
        matchesVerified &&
        matchesTopRated &&
        matchesAvailability
      )
    })

    return [...filtered].sort((first, second) => {
      if (sortBy === 'highest-rated') {
        return (second.rating || 0) - (first.rating || 0)
      }

      if (sortBy === 'most-reviews') {
        return (second.reviewCount || 0) - (first.reviewCount || 0)
      }

      if (sortBy === 'most-jobs') {
        return (second.completedJobs || 0) - (first.completedJobs || 0)
      }

      if (sortBy === 'recently-joined') {
        return new Date(second.createdAt || 0) - new Date(first.createdAt || 0)
      }

      return (
        Number(second.verified) - Number(first.verified) ||
        Number(second.topRated) - Number(first.topRated) ||
        (second.rating || 0) - (first.rating || 0) ||
        (second.completedJobs || 0) - (first.completedJobs || 0)
      )
    })
  }, [
    activeCategory,
    availableArtisans,
    completedJobsFilter,
    isAvailableOnly,
    locationFilter,
    minimumRating,
    searchTerm,
    sortBy,
    topRatedOnly,
    verifiedOnly,
  ])

  const categories = useMemo(
    () => [
      ...new Set([
        ...artisanCategories,
        ...availableArtisans.map((artisan) => artisan.category).filter(Boolean),
      ]),
    ],
    [availableArtisans],
  )
  const locations = useMemo(
    () => [
      ...new Set([
        ...artisanLocations,
        ...availableArtisans.map((artisan) => artisan.location).filter(Boolean),
        ...availableArtisans.map((artisan) => artisan.area).filter(Boolean),
      ]),
    ],
    [availableArtisans],
  )
  const activeFilterCount = [
    searchTerm.trim(),
    activeCategory !== 'All',
    locationFilter !== 'All locations',
    minimumRating !== '0',
    completedJobsFilter !== '0',
    verifiedOnly,
    topRatedOnly,
    isAvailableOnly,
  ].filter(Boolean).length

  function resetFilters() {
    setSearchTerm('')
    setActiveCategory('All')
    setLocationFilter('All locations')
    setMinimumRating('0')
    setCompletedJobsFilter('0')
    setVerifiedOnly(false)
    setTopRatedOnly(false)
    setIsAvailableOnly(false)
    setSortBy('recommended')
  }

  return (
    <PageShell>
      <div className="hw-professionals-page">

        {/* ============================================
            SECTION 1: CONTEXT HEADER
            ============================================ */}
        <header className="hw-professionals-header">
          <h1>Find a professional</h1>
          <p>Browse trusted professionals for your next job.</p>
        </header>

        {/* ============================================
            SECTION 2: CATEGORY NAVIGATION
            ============================================ */}
        <nav className="hw-category-nav" aria-label="Service categories">
          <div className="hw-category-scroll">
            {presentationCategories.map((category) => {
              const Icon = category.icon
              const isActive = activeCategory === category.title

              return (
                <motion.button
                  key={category.id}
                  className={`hw-category-chip ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveCategory(isActive ? 'All' : category.title)}
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
        <section className="hw-professionals-search-section">
          <form
            className="hw-professionals-search-form"
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
                placeholder="Search professionals, skills or services..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                aria-label="Search professionals"
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
            SECTION 4: FILTER TOGGLE (Mobile)
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
            {activeFilterCount > 0 && (
              <Badge variant="info" className="hw-filter-badge">{activeFilterCount}</Badge>
            )}
          </button>

          <select
            className="hw-select hw-sort-select"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* ============================================
            SECTION 5: FILTER PANEL
            ============================================ */}
        <section className={`hw-filter-panel ${showFilters ? 'show' : ''}`}>
          <div className="hw-filter-grid">
            <label className="hw-toggle-filter">
              <input
                checked={verifiedOnly}
                type="checkbox"
                onChange={(event) => setVerifiedOnly(event.target.checked)}
              />
              <span>Verified Only</span>
            </label>

            <label className="hw-toggle-filter">
              <input
                checked={topRatedOnly}
                type="checkbox"
                onChange={(event) => setTopRatedOnly(event.target.checked)}
              />
              <span>Top Rated</span>
            </label>

            <label className="hw-toggle-filter">
              <input
                checked={isAvailableOnly}
                type="checkbox"
                onChange={(event) => setIsAvailableOnly(event.target.checked)}
              />
              <span>Available Now</span>
            </label>

            <div className="hw-filter-group">
              <label htmlFor="location-filter">Location</label>
              <select
                id="location-filter"
                className="hw-select"
                value={locationFilter}
                onChange={(event) => setLocationFilter(event.target.value)}
              >
                {locations.map((location) => (
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

            <div className="hw-filter-group">
              <label htmlFor="jobs-filter">Completed jobs</label>
              <select
                id="jobs-filter"
                className="hw-select"
                value={completedJobsFilter}
                onChange={(event) => setCompletedJobsFilter(event.target.value)}
              >
                <option value="0">Any</option>
                <option value="10">10+ jobs</option>
                <option value="50">50+ jobs</option>
                <option value="100">100+ jobs</option>
              </select>
            </div>
          </div>

          <div className="hw-filter-actions">
            <button
              type="button"
              className="hw-btn hw-btn-ghost"
              onClick={resetFilters}
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
            SECTION 6: RESULTS META
            ============================================ */}
        <div className="hw-results-meta">
          <span className="hw-results-count">
            {isLoading ? 'Searching...' : `${filteredAndSortedArtisans.length} professional${filteredAndSortedArtisans.length !== 1 ? 's' : ''} found`}
          </span>
          {activeFilterCount > 0 && (
            <button type="button" className="hw-btn hw-btn-ghost hw-btn-sm" onClick={resetFilters}>
              Clear filters
            </button>
          )}
        </div>

        {/* ============================================
            SECTION 7: SAVED ARTISANS (if any)
            ============================================ */}
        {savedArtisans.length > 0 && (
          <section className="hw-saved-artisans">
            <div className="hw-section-header">
              <h2>Your saved professionals</h2>
              <span className="hw-count-badge">{savedArtisans.length}</span>
            </div>
            <div className="hw-saved-scroll">
              {savedArtisans.map((artisan) => (
                <Link key={artisan.name} to={`/artisan-profile/${artisan.id}`} className="hw-saved-card">
                  <Avatar name={artisan.name} src={artisan.avatarUrl} size="sm" />
                  <div>
                    <strong>{artisan.name}</strong>
                    <span>{artisan.skill}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ============================================
            SECTION 8: ERROR STATE
            ============================================ */}
        {dataError && (
          <Card variant="outlined" className="hw-error-card">
            <p>Supabase professionals could not load. {dataError}</p>
          </Card>
        )}

        {/* ============================================
            SECTION 9: PROFESSIONAL GRID
            ============================================ */}
        {isLoading ? (
          <SkeletonPreview label="Loading professionals" type="artisan" />
        ) : filteredAndSortedArtisans.length > 0 ? (
          <motion.div
            className="hw-professionals-grid"
            initial="hidden"
            animate="visible"
            transition={{ staggerChildren: 0.06 }}
          >
            {filteredAndSortedArtisans.map((artisan) => (
              <ArtisanCard key={artisan.id || artisan.name} artisan={artisan} />
            ))}
          </motion.div>
        ) : (
          <EmptyState
            action={(
              <button type="button" className="hw-btn hw-btn-primary" onClick={resetFilters}>
                Reset filters
              </button>
            )}
            title="No professionals found"
          >
            Try another service, location, rating, or price range.
          </EmptyState>
        )}

        {/* ============================================
            SECTION 10: CATEGORY FILTERS (Desktop)
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
            SECTION 11: RECENTLY VIEWED
            ============================================ */}
        {recentlyViewedArtisans.length > 0 && (
          <section className="hw-recently-viewed">
            <div className="hw-section-header hw-flex-between">
              <h2>Recently viewed</h2>
              <Link to="/services" className="hw-link">Explore services</Link>
            </div>
            <div className="hw-recently-viewed-row">
              {recentlyViewedArtisans.map((artisan) => (
                <RecentArtisanCard key={artisan.name} artisan={artisan} />
              ))}
            </div>
          </section>
        )}

      </div>
    </PageShell>
  )
}

export default Artisans
