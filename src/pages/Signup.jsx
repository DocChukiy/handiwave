import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.js'
import { getArtisanByProfileId } from '../services/artisanService.js'
import { showToast } from '../utils/toast.js'
import logger from '../utils/logger.js'
import {
  getRecruitmentAttribution,
  rememberRecruitmentAttribution,
} from '../utils/recruitmentTracking.js'

const professionalConsentVersion = 'kaduna-pilot-v1-2026-10-07'

const signupTypes = [
  {
    label: 'Customer',
    value: 'customer',
    description: 'Find artisans, book home services, and pay safely.',
  },
  {
    label: 'Artisan',
    value: 'artisan',
    description: 'Offer your services, receive bookings, and build trust.',
  },
]

function Signup() {
  const { authError, signup } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isProfessionalApplication = searchParams.get('role') === 'artisan'
  const [accountType, setAccountType] = useState(isProfessionalApplication ? 'artisan' : 'customer')
  const [consentAccepted, setConsentAccepted] = useState(false)
  const [email, setEmail] = useState('')
  const [formError, setFormError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [primarySkill, setPrimarySkill] = useState('')

  const disabledReason = useMemo(() => {
    if (isSubmitting) {
      return 'signup request is already submitting'
    }

    if (!name.trim()) {
      return 'full name is missing'
    }

    if (!email.trim()) {
      return 'email is missing'
    }

    if (!password) {
      return 'password is missing'
    }

    if (accountType === 'artisan' && !primarySkill.trim()) {
      return 'primary skill is missing'
    }

    if (accountType === 'artisan' && !consentAccepted) {
      return 'professional application consent is required'
    }

    return ''
  }, [accountType, consentAccepted, email, isSubmitting, name, password, primarySkill])
  const isSignupDisabled = Boolean(disabledReason)

  useEffect(() => {
    rememberRecruitmentAttribution(location.search)
  }, [location.search])

  useEffect(() => {
    logger.debug('[Handiwave signup debug]', {
      accountType,
      disabledReason: disabledReason || 'button enabled',
      email,
      isSubmitting,
      passwordLength: password.length,
    })
  }, [accountType, disabledReason, email, isSubmitting, password.length])

  async function handleSignup(event) {
    event.preventDefault()
    setFormError('')

    logger.debug('[Handiwave signup debug] submit clicked', {
      accountType,
      disabledReason: disabledReason || 'button enabled',
      email,
      isSubmitting,
      passwordLength: password.length,
    })

    if (disabledReason) {
      setFormError(`Cannot sign up yet: ${disabledReason}.`)
      return
    }

    setIsSubmitting(true)

    try {
      const { session, user } = await signup({
        consent: accountType === 'artisan'
          ? {
              acceptedAt: new Date().toISOString(),
              version: professionalConsentVersion,
            }
          : null,
        email,
        name,
        password,
        primarySkill,
        recruitmentAttribution: getRecruitmentAttribution(),
        role: accountType,
      })

      if (session) {
        showToast(`${user.role} account created for ${user.name}.`)

        if (user.role === 'artisan') {
          const { data: artisanProfile, error } = await getArtisanByProfileId(user.id)

          if (error) {
            setFormError(error.message)
            return
          }

          navigate(artisanProfile ? '/artisan-dashboard' : '/artisan-onboarding')
          return
        }

        navigate('/')
      } else {
        setFormError('Signup created an auth user, but no active session was returned. Check Supabase email confirmation settings or confirm the email, then log in.')
        showToast('Account created. Please confirm your email if required, then log in.')
      }
    } catch (error) {
      logger.error('[Handiwave signup debug] Supabase signup error:', error)
      setFormError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-card">
        <p className="section-kicker">{isProfessionalApplication ? 'Kaduna professional application' : 'Join Handiwave'}</p>
        <h1>{isProfessionalApplication ? 'Create your professional account' : 'Create your account'}</h1>
        <p>
          {isProfessionalApplication
            ? 'Registration is free. After signup, complete your profile and verification with the Handiwave team.'
            : 'Start as a customer or apply as a professional.'}
        </p>
        <form className="auth-form" onSubmit={handleSignup}>
          {!isProfessionalApplication && (
            <div className="role-selector two-column" aria-label="Signup account type">
              {signupTypes.map((type) => (
                <button
                  className={accountType === type.value ? 'active' : ''}
                  key={type.value}
                  type="button"
                  onClick={() => setAccountType(type.value)}
                >
                  <strong>{type.label} signup</strong>
                  <span>{type.description}</span>
                </button>
              ))}
            </div>
          )}
          <label>Full name<input placeholder="Enter your name" value={name} onChange={(event) => setName(event.target.value)} /></label>
          <label>Email address<input type="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label>Password<input type="password" placeholder="Create a password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          {accountType === 'artisan' && (
            <>
              <label>Primary skill<input placeholder="Electrician, plumber, AC technician..." value={primarySkill} onChange={(event) => setPrimarySkill(event.target.value)} /></label>
              <label className="professional-consent">
                <input
                  checked={consentAccepted}
                  onChange={(event) => setConsentAccepted(event.target.checked)}
                  type="checkbox"
                />
                <span>
                  I confirm that my application information is accurate. I consent to Handiwave
                  collecting and using my contact details, identity documents, location, work samples,
                  references, and verification records to assess my application, create and manage my
                  professional profile, prevent fraud, and contact me about the pilot and service
                  opportunities. I understand that verification does not guarantee jobs and may be
                  withdrawn if information is false. I agree to the <Link to="/terms">Terms</Link> and
                  {' '}<Link to="/privacy">Privacy Policy</Link>.
                </span>
              </label>
            </>
          )}
          {(formError || authError) && (
            <p className="auth-error">{formError || authError}</p>
          )}
          {disabledReason && !isSubmitting && (
            <p className="auth-hint">Sign up button disabled because {disabledReason}.</p>
          )}
          <button disabled={isSignupDisabled} type="submit">
            {isSubmitting ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>
        <span>Already have an account? <Link to="/login">Log in</Link></span>
      </section>
    </div>
  )
}

export default Signup
