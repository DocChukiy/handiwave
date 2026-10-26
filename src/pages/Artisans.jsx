import { motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import EmptyState from '../components/EmptyState.jsx'
import SkeletonPreview from '../components/Skeletons.jsx'
import PageShell from '../components/ui/PageShell.jsx'
import Card from '../components/ui/Card.jsx'
import Badge from '../components/ui/Badge.jsx'
import { ArtisanCard } from '../components/cards.jsx'
import { getPublicProfessionals } from '../services/artisanService.js'
import {
  Laptop,
  Zap,
  Snowflake,
  Droplets,
  ShieldCheck,
  Wrench,
  Scissors,
  Sparkles,
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
  {
    id: 'cleaning',
    title: 'Cleaning Services',
    icon: Sparkles,
    keywords: ['cleaning', 'cleaner', 'laundry', 'housekeeping', 'fumigation'],
  },
  {
    id: 'beauty',
    title: 'Beauty & Grooming',
    icon: Scissors,
    keywords: ['beauty', 'barber', 'hair', 'stylist', 'braider', 'makeup', 'nails'],
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
  { label: 'Recently Joined', value: 'recently-joined' },
]

const verificationTierRank = {
  building: 1,
  ready: 2,
  verified: 3,
  trusted: 4,
  elite: 5,
}

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

function Artisans() {
  const [searchTerm, setSearchTerm] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [availableArtisans, setAvailableArtisans] = useState([])
  const [dataError, setDataError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [locationFilter, setLocationFilter] = useState('All locations')
  const [sortBy, setSortBy] = useState('recommended')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadArtisans() {
      setDataError('')
      setIsLoading(true)

      try {
        const { data, error } = await getPublicProfessionals()

        if (!isMounted) {
          return
        }

        if (error) {
          setDataError(error.message)
          setAvailableArtisans([])
          return
        }

        setAvailableArtisans(data)
      } catch (error) {
        if (isMounted) {
          setDataError(error.message)
          setAvailableArtisans([])
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
      return matchesSearch && matchesCategory && matchesLocation
    })

    return [...filtered].sort((first, second) => {
      const tierDifference = (verificationTierRank[second.verificationTier] || 0) -
        (verificationTierRank[first.verificationTier] || 0)

      if (tierDifference !== 0) {
        return tierDifference
      }

      if (sortBy === 'highest-rated') {
        return (second.rating || 0) - (first.rating || 0)
      }

      if (sortBy === 'recently-joined') {
        return new Date(second.createdAt || 0) - new Date(first.createdAt || 0)
      }

      return (
        (second.rankingScore || 0) - (first.rankingScore || 0) ||
        new Date(second.createdAt || 0) - new Date(first.createdAt || 0)
      )
    })
  }, [
    activeCategory,
    availableArtisans,
    locationFilter,
    searchTerm,
    sortBy,
  ])

  const locations = useMemo(
    () => [
      ...new Set([
        'All locations',
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
  ].filter(Boolean).length

  function resetFilters() {
    setSearchTerm('')
    setActiveCategory('All')
    setLocationFilter('All locations')
    setSortBy('recommended')
  }

  return (
    <PageShell>
      <div className="hw-professionals-page">

        {/* ============================================
            SECTION 1: CONTEXT HEADER
            ============================================ */}
        <header className="hw-professionals-header">
          <span className="hw-professionals-eyebrow">Growing Handiwave network</span>
          <h1>Find a professional</h1>
          <p>Explore real professionals, compare their progress and work history, and book verified profiles with confidence.</p>
          <div className="hw-professionals-trust-row">
            <span>Verified profiles rank first</span>
            <span>Trust grows through completed work</span>
            <span>New profiles are clearly labelled</span>
          </div>
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
            <p className="hw-filter-note">Verified professionals appear first. Profiles still completing verification remain visible but cannot receive direct bookings yet.</p>
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
            SECTION 8: ERROR STATE
            ============================================ */}
        {dataError && (
          <Card variant="outlined" className="hw-error-card">
            <p>Professionals could not load right now. Please refresh and try again.</p>
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
        ) : dataError ? null : availableArtisans.length === 0 ? (
          <EmptyState
            action={<Link className="hw-btn hw-btn-primary" to="/requests">Post a service request</Link>}
            title="Professionals are joining"
          >
            Tell us what you need and Handiwave will share your request with suitable professionals as they become available.
          </EmptyState>
        ) : (
          <EmptyState
            action={(
              <button type="button" className="hw-btn hw-btn-primary" onClick={resetFilters}>
                Reset filters
              </button>
            )}
            title="No professionals found"
          >
            Try another service, skill, or location.
          </EmptyState>
        )}

        <section className="hw-professionals-request-cta">
          <div>
            <span>Prefer professionals to come to you?</span>
            <h2>Describe the job once and compare sealed offers.</h2>
          </div>
          <Link className="hw-btn hw-btn-primary" to="/requests">Post a service request</Link>
        </section>

      </div>
    </PageShell>
  )
}

export default Artisans
