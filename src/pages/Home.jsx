import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

const serviceCategories = [
  {
    icon: '⚡',
    title: 'Electrician',
    description: 'Fix wiring, lighting, sockets, and power issues safely.',
  },
  {
    icon: '🚰',
    title: 'Plumber',
    description: 'Repair leaks, taps, pipes, toilets, and water systems.',
  },
  {
    icon: '🎨',
    title: 'Painter',
    description: 'Refresh homes and offices with neat interior painting.',
  },
  {
    icon: '✨',
    title: 'Cleaner',
    description: 'Book reliable cleaning for homes, apartments, and offices.',
  },
  {
    icon: '🪚',
    title: 'Carpenter',
    description: 'Get furniture repairs, fittings, shelves, and woodwork.',
  },
  {
    icon: '❄️',
    title: 'AC Repair',
    description: 'Service, install, and repair air conditioners quickly.',
  },
  {
    icon: '🔧',
    title: 'Generator Repair',
    description: 'Keep your generator running with trusted technicians.',
  },
  {
    icon: '🔌',
    title: 'Appliance Repair',
    description: 'Repair fridges, washing machines, cookers, and more.',
  },
  {
    icon: '🚗',
    title: 'Mechanic',
    description: 'Find mechanics for diagnostics, repairs, and servicing.',
  },
  {
    icon: '💈',
    title: 'Hair Stylist / Barber',
    description: 'Book grooming, styling, cuts, braids, and beauty services.',
  },
]

const featuredArtisans = [
  {
    initials: 'AO',
    name: 'Ada Okafor',
    skill: 'Certified Electrician',
    rating: '4.9',
    completedJobs: '186',
    location: 'Lekki, Lagos',
  },
  {
    initials: 'MU',
    name: 'Musa Usman',
    skill: 'AC Repair Specialist',
    rating: '4.8',
    completedJobs: '142',
    location: 'Wuse, Abuja',
  },
  {
    initials: 'CE',
    name: 'Chika Eze',
    skill: 'Professional Cleaner',
    rating: '5.0',
    completedJobs: '211',
    location: 'GRA, Port Harcourt',
  },
  {
    initials: 'BI',
    name: 'Bayo Ibrahim',
    skill: 'Plumber',
    rating: '4.7',
    completedJobs: '128',
    location: 'Yaba, Lagos',
  },
]

const howItWorksSteps = [
  {
    icon: '🔎',
    title: 'Search for a service',
    description: 'Find the exact home service you need in your area.',
  },
  {
    icon: '👷',
    title: 'Choose an artisan',
    description: 'Compare verified professionals by skill, rating, and location.',
  },
  {
    icon: '💬',
    title: 'Book and chat',
    description: 'Schedule the job and confirm details before they arrive.',
  },
  {
    icon: '🛡️',
    title: 'Get the job done safely',
    description: 'Complete your service with trusted support and secure payments.',
  },
]

const reelsPreview = [
  {
    initials: 'AO',
    artisan: 'Ada Okafor',
    category: 'Electrician',
    caption: 'Installed modern LED lighting for a Lekki apartment.',
    likes: '2.4k',
  },
  {
    initials: 'MU',
    artisan: 'Musa Usman',
    category: 'AC Repair',
    caption: 'Quick AC servicing before the afternoon heat hits.',
    likes: '1.8k',
  },
  {
    initials: 'CE',
    artisan: 'Chika Eze',
    category: 'Cleaner',
    caption: 'Deep-cleaned a shortlet and had it guest-ready fast.',
    likes: '3.1k',
  },
  {
    initials: 'BI',
    artisan: 'Bayo Ibrahim',
    category: 'Plumber',
    caption: 'Fixed a hidden kitchen leak without breaking tiles.',
    likes: '1.5k',
  },
]

const trustedMarkets = ['Lagos', 'Abuja', 'Port Harcourt', 'Ibadan', 'Enugu']

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
}

function Home() {
  return (
    <>
      <section className="hero-section">
        <motion.div
          className="hero-copy"
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        >
          <p className="hero-badge">Trusted home services across Nigeria</p>
          <h1>Find trusted artisans near you</h1>
          <p className="hero-subheadline">
            Book skilled professionals for home services quickly and safely.
          </p>

          <form
            className="hero-search"
            onSubmit={(event) => event.preventDefault()}
          >
            <input
              aria-label="Search for artisans or services"
              placeholder="Search plumbers, cleaners, electricians..."
              type="search"
            />
            <button type="submit">Search</button>
          </form>

          <div className="hero-actions">
            <Link className="primary-cta" to="/services">
              Book a Service
            </Link>
            <Link className="secondary-cta" to="/artisans">
              Browse Artisans
            </Link>
          </div>

          <div className="hero-stats" aria-label="Handiwave highlights">
            <span>
              <strong>2k+</strong>
              Verified artisans
            </span>
            <span>
              <strong>24/7</strong>
              Fast booking
            </span>
            <span>
              <strong>Safe</strong>
              Secure payments
            </span>
          </div>
        </motion.div>

        <motion.div
          className="hero-visual"
          aria-label="Hero image placeholder"
          initial={{ opacity: 0, scale: 0.96, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.1, ease: 'easeOut' }}
        >
          <div className="visual-card main-card">
            <span className="card-label">Top artisan</span>
            <div className="artisan-row">
              <div className="artisan-avatar">AO</div>
              <div>
                <strong>Ada Okafor</strong>
                <p>Expert electrician in Lekki</p>
              </div>
            </div>
            <div className="rating-row">
              <span>Rating 4.9</span>
              <span>Available today</span>
            </div>
          </div>

          <div className="visual-card service-card">
            <span>AC repair</span>
            <strong>From NGN 8,500</strong>
          </div>

          <div className="visual-card payment-card">
            <span>Booking secured</span>
            <strong>Escrow protected</strong>
          </div>
        </motion.div>
      </section>

      <motion.section
        className="trust-strip"
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <p>Trusted by homeowners and small businesses in</p>
        <div>
          {trustedMarkets.map((market) => (
            <span key={market}>{market}</span>
          ))}
        </div>
      </motion.section>

      <section className="categories-section">
        <div className="section-heading">
          <p className="section-kicker">Popular categories</p>
          <h2>Services people book every day</h2>
          <p>
            Choose from reliable local professionals for everyday repairs,
            maintenance, grooming, and home support.
          </p>
        </div>

        <motion.div
          className="categories-grid"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          transition={{ staggerChildren: 0.08 }}
        >
          {serviceCategories.map((category) => (
            <motion.article
              className="category-card"
              key={category.title}
              variants={cardVariants}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              whileHover={{ y: -8, scale: 1.02 }}
            >
              <span className="category-icon" aria-hidden="true">
                {category.icon}
              </span>
              <h3>{category.title}</h3>
              <p>{category.description}</p>
            </motion.article>
          ))}
        </motion.div>
      </section>

      <section className="featured-artisans-section">
        <div className="section-heading">
          <p className="section-kicker">Featured artisans</p>
          <h2>Highly rated professionals you can trust</h2>
          <p>
            Meet verified experts with strong reviews, completed jobs, and local
            availability across major Nigerian cities.
          </p>
        </div>

        <motion.div
          className="featured-artisans-grid"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          transition={{ staggerChildren: 0.1 }}
        >
          {featuredArtisans.map((artisan) => (
            <motion.article
              className="featured-artisan-card"
              key={artisan.name}
              variants={cardVariants}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              whileHover={{ y: -8 }}
            >
              <div className="profile-image-placeholder">
                <span>{artisan.initials}</span>
              </div>

              <div className="artisan-card-header">
                <div>
                  <h3>{artisan.name}</h3>
                  <p>{artisan.skill}</p>
                </div>
                <span className="verified-badge">Verified</span>
              </div>

              <div className="artisan-metrics">
                <span>
                  <strong>{artisan.rating}</strong>
                  Rating
                </span>
                <span>
                  <strong>{artisan.completedJobs}</strong>
                  Jobs
                </span>
              </div>

              <p className="artisan-location">{artisan.location}</p>

              <Link className="book-now-button" to="/bookings">
                Book Now
              </Link>
            </motion.article>
          ))}
        </motion.div>
      </section>

      <section className="how-it-works-section">
        <div className="section-heading">
          <p className="section-kicker">How Handiwave works</p>
          <h2>Book trusted help in four simple steps</h2>
          <p>
            From search to safe completion, Handiwave keeps the process clear,
            fast, and easy to follow.
          </p>
        </div>

        <motion.div
          className="steps-grid"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          transition={{ staggerChildren: 0.1 }}
        >
          {howItWorksSteps.map((step, index) => (
            <motion.article
              className="step-card"
              key={step.title}
              variants={cardVariants}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              whileHover={{ y: -6 }}
            >
              <span className="step-number">0{index + 1}</span>
              <span className="step-icon" aria-hidden="true">
                {step.icon}
              </span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </motion.article>
          ))}
        </motion.div>
      </section>

      <section className="reels-preview-section">
        <div className="section-heading">
          <p className="section-kicker">Handiwave reels</p>
          <h2>Watch artisans show their work</h2>
          <p>
            Preview real service moments, quick transformations, and skilled
            work before you book.
          </p>
        </div>

        <motion.div
          className="reels-grid"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          transition={{ staggerChildren: 0.1 }}
        >
          {reelsPreview.map((reel) => (
            <motion.article
              className="reel-card"
              key={`${reel.artisan}-${reel.category}`}
              variants={cardVariants}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              whileHover={{ y: -8, scale: 1.01 }}
            >
              <div className="video-placeholder">
                <div className="play-button" aria-hidden="true">
                  ▶
                </div>
                <div className="reel-side-actions">
                  <span className="like-icon" aria-label={`${reel.likes} likes`}>
                    ♥
                  </span>
                  <small>{reel.likes}</small>
                </div>
                <div className="reel-overlay">
                  <div className="reel-profile">
                    <span>{reel.initials}</span>
                    <div>
                      <strong>{reel.artisan}</strong>
                      <p>{reel.category}</p>
                    </div>
                  </div>
                  <p className="reel-caption">{reel.caption}</p>
                  <Link className="reel-book-button" to="/bookings">
                    Book
                  </Link>
                </div>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </section>

      <motion.section
        className="final-cta-section"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.35 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div>
          <p className="section-kicker">Ready when you are</p>
          <h2>Book a verified artisan without the stress</h2>
          <p>
            Search, compare, chat, and pay with confidence from one clean
            Handiwave experience.
          </p>
        </div>
        <div className="final-cta-actions">
          <Link className="primary-cta" to="/services">
            Start Booking
          </Link>
          <Link className="secondary-cta" to="/reels">
            Watch Reels
          </Link>
        </div>
      </motion.section>
    </>
  )
}

export default Home
