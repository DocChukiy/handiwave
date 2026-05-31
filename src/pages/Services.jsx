import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

const categories = ['All', 'Repairs', 'Home Care', 'Installation', 'Auto', 'Beauty']

const services = [
  {
    icon: '⚡',
    title: 'Electrical Repairs',
    category: 'Repairs',
    description: 'Fix sockets, wiring, lighting, breakers, and power issues safely.',
    price: 'From NGN 7,500',
    duration: 'Same day',
    popular: true,
  },
  {
    icon: '🚰',
    title: 'Plumbing Service',
    category: 'Repairs',
    description: 'Repair leaks, blocked drains, taps, toilets, and water systems.',
    price: 'From NGN 6,000',
    duration: '2-4 hours',
    popular: true,
  },
  {
    icon: '❄️',
    title: 'AC Installation & Repair',
    category: 'Installation',
    description: 'Book AC servicing, installation, gas refill, and diagnostics.',
    price: 'From NGN 8,500',
    duration: 'Same day',
    popular: true,
  },
  {
    icon: '✨',
    title: 'Deep Cleaning',
    category: 'Home Care',
    description: 'Reliable cleaning for apartments, offices, shortlets, and move-ins.',
    price: 'From NGN 12,000',
    duration: '3-6 hours',
    popular: true,
  },
  {
    icon: '🎨',
    title: 'Painting',
    category: 'Home Care',
    description: 'Refresh interiors and exteriors with clean professional finishing.',
    price: 'From NGN 25,000',
    duration: '1-3 days',
    popular: false,
  },
  {
    icon: '🪚',
    title: 'Carpentry',
    category: 'Installation',
    description: 'Furniture repairs, shelves, doors, cabinets, and custom fittings.',
    price: 'From NGN 10,000',
    duration: 'By quote',
    popular: false,
  },
  {
    icon: '🔧',
    title: 'Generator Repair',
    category: 'Repairs',
    description: 'Service and repair petrol or diesel generators at your location.',
    price: 'From NGN 9,000',
    duration: 'Same day',
    popular: true,
  },
  {
    icon: '🔌',
    title: 'Appliance Repair',
    category: 'Repairs',
    description: 'Fix fridges, washing machines, cookers, microwaves, and more.',
    price: 'From NGN 8,000',
    duration: 'Same day',
    popular: false,
  },
  {
    icon: '🚗',
    title: 'Mechanic',
    category: 'Auto',
    description: 'Diagnostics, servicing, battery checks, and emergency auto support.',
    price: 'From NGN 10,000',
    duration: '1-5 hours',
    popular: false,
  },
  {
    icon: '💈',
    title: 'Hair Stylist / Barber',
    category: 'Beauty',
    description: 'Book cuts, styling, braids, grooming, and home beauty appointments.',
    price: 'From NGN 5,000',
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

  const filteredServices = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    return services.filter((service) => {
      const matchesCategory =
        activeCategory === 'All' || service.category === activeCategory
      const matchesSearch =
        !query ||
        service.title.toLowerCase().includes(query) ||
        service.description.toLowerCase().includes(query) ||
        service.category.toLowerCase().includes(query)

      return matchesCategory && matchesSearch
    })
  }, [activeCategory, searchTerm])

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
            <motion.article
              className="popular-service-card"
              key={service.title}
              whileHover={{ y: -6 }}
            >
              <span>{service.icon}</span>
              <strong>{service.title}</strong>
              <small>{service.price}</small>
            </motion.article>
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

        <motion.div
          className="services-grid"
          initial="hidden"
          animate="visible"
          transition={{ staggerChildren: 0.06 }}
        >
          {filteredServices.map((service) => (
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
                <span>{service.duration}</span>
              </div>
              <Link className="service-book-link" to="/bookings">
                Book Service
              </Link>
            </motion.article>
          ))}
        </motion.div>
      </section>
    </div>
  )
}

export default Services
