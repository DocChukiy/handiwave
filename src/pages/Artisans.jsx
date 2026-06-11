import { useEffect, useMemo, useState } from 'react'
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
import { getVerifiedArtisans } from '../services/artisanService.js'

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
        artisan.category === activeCategory ||
        artisan.skill === activeCategory
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
    <div className="starter-page">
      <section className="page-hero compact">
        <p className="section-kicker">Verified artisans</p>
        <h1>Find skilled professionals near you</h1>
        <p>
          Browse trusted Handiwave artisans with ratings, completed jobs, and
          local availability.
        </p>
      </section>

      <section className="toolbar-card filter-toolbar artisan-search-toolbar">
        <label className="global-artisan-search">
          <span>Search artisans</span>
          <input
            placeholder="Search name, service, category, city, state, or keyword"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </label>
        <label className="sort-select-label">
          <span>Sort</span>
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
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
        <label className="toggle-filter">
          <input
            checked={verifiedOnly}
            type="checkbox"
            onChange={(event) => setVerifiedOnly(event.target.checked)}
          />
          Verified Only
        </label>
        <label className="toggle-filter">
          <input
            checked={topRatedOnly}
            type="checkbox"
            onChange={(event) => setTopRatedOnly(event.target.checked)}
          />
          Top Rated
        </label>
        <label className="toggle-filter">
          <input
            checked={isAvailableOnly}
            type="checkbox"
            onChange={(event) => setIsAvailableOnly(event.target.checked)}
          />
          Available Now
        </label>
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
          Completed jobs
          <select
            value={completedJobsFilter}
            onChange={(event) => setCompletedJobsFilter(event.target.value)}
          >
            <option value="0">{getCompletedJobLabel('0')}</option>
            <option value="10">{getCompletedJobLabel('10')}</option>
            <option value="50">{getCompletedJobLabel('50')}</option>
            <option value="100">{getCompletedJobLabel('100')}</option>
          </select>
        </label>
      </section>

      <div className="search-results-meta">
        <span>
          {isLoading ? 'Searching artisans...' : `${filteredAndSortedArtisans.length} artisan${filteredAndSortedArtisans.length === 1 ? '' : 's'} found`}
        </span>
        {activeFilterCount > 0 && (
          <button type="button" onClick={resetFilters}>
            Clear {activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'}
          </button>
        )}
      </div>

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

      {dataError && (
        <p className="auth-error">
          Supabase artisans could not load, so Handiwave is showing starter data. {dataError}
        </p>
      )}

      {isLoading ? (
        <SkeletonPreview label="Loading artisans" type="artisan" />
      ) : filteredAndSortedArtisans.length > 0 ? (
        <section className="starter-grid four">
          {filteredAndSortedArtisans.map((artisan) => (
            <ArtisanCard artisan={artisan} key={artisan.id || artisan.name} />
          ))}
        </section>
      ) : (
        <EmptyState
          action={(
            <button
              type="button"
              onClick={resetFilters}
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
