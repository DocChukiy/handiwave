import {
  BadgeCheck,
  BriefcaseBusiness,
  CheckCircle2,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Smartphone,
} from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  buildTrackedPath,
  kadunaFlyerParameters,
  rememberRecruitmentAttribution,
} from '../utils/recruitmentTracking.js'
const benefits = [
  {
    icon: BriefcaseBusiness,
    title: 'Receive suitable requests',
    text: 'See service opportunities that match your trade and coverage area when they are available.',
  },
  {
    icon: BadgeCheck,
    title: 'Build a trusted profile',
    text: 'Show customers your work, service area, experience, and completed Handiwave jobs.',
  },
  {
    icon: MessageCircle,
    title: 'Get pilot support',
    text: 'A Handiwave representative helps you complete verification and learn the job process.',
  },
]

const applicationSteps = [
  'Create your free professional account.',
  'Add your trade, service area, pricing, and work samples.',
  'Complete identity, phone, address, and reference checks.',
  'Practise accepting, quoting, and updating a service request.',
  'Become active after your checks are approved.',
]

const requiredChecks = [
  'Government-issued ID and a matching live selfie',
  'Working phone number and operating address',
  'Two previous customer references',
  'Three recent work samples',
  'Trade, service area, inspection fee, and price range',
  'Bank-account name match where possible',
]

function JoinProfessionals() {
  const location = useLocation()
  const attribution = useMemo(() => (
    rememberRecruitmentAttribution(location.search)
  ), [location.search])
  const signupPath = buildTrackedPath('/signup?role=artisan', attribution)

  useEffect(() => {
    document.title = 'Join Handiwave Kaduna Professionals'

    return () => {
      document.title = 'Handiwave'
    }
  }, [])

  return (
    <main className="join-professionals-page">
      <section className="professional-join-hero">
        <div className="professional-join-copy">
          <p className="section-kicker">Kaduna founding professionals</p>
          <h1>Let your skill bring you more work.</h1>
          <p className="professional-join-lead">
            Handiwave is selecting a small founding network of dependable electricians,
            plumbers, AC technicians, solar installers, generator technicians, cleaners,
            carpenters, and handymen for our Kaduna South pilot.
          </p>
          <div className="pilot-area-callout">
            <MapPin aria-hidden="true" size={22} />
            <div>
              <strong>First pilot area: Barnawa–Narayi corridor</strong>
              <span>Apply if you can reliably serve Barnawa, Narayi, and nearby communities.</span>
            </div>
          </div>
          <div className="professional-join-actions">
            <Link className="hw-btn hw-btn-primary" to={signupPath}>Apply as a professional</Link>
            <a className="hw-btn hw-btn-secondary" href="#how-it-works">See how approval works</a>
          </div>
          <p className="professional-join-fineprint">
            Registration is free. Handiwave does not guarantee jobs. Approved professionals
            receive suitable service opportunities when available.
          </p>
        </div>

        <aside className="founding-offer-card" aria-label="Founding professional offer">
          <img src="/handiwave-mark.svg" alt="" />
          <p>Founding network target</p>
          <strong>20 responsive professionals</strong>
          <ul>
            <li><CheckCircle2 size={18} /> Free profile setup support</li>
            <li><CheckCircle2 size={18} /> No fee to view pilot requests</li>
            <li><CheckCircle2 size={18} /> Clear quotes and job records</li>
            <li><CheckCircle2 size={18} /> Human support when issues arise</li>
          </ul>
        </aside>
      </section>

      <section className="professional-benefits" aria-labelledby="benefits-title">
        <div className="professional-section-heading">
          <p className="section-kicker">Why join</p>
          <h2 id="benefits-title">A professional profile backed by a real process</h2>
        </div>
        <div className="professional-benefit-grid">
          {benefits.map(({ icon: Icon, text, title }) => (
            <article key={title}>
              <Icon aria-hidden="true" size={26} />
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="professional-process" id="how-it-works">
        <div>
          <p className="section-kicker">Simple application</p>
          <h2>Apply now. Complete verification with our team.</h2>
          <ol>
            {applicationSteps.map((step) => <li key={step}>{step}</li>)}
          </ol>
        </div>
        <aside className="verification-preview">
          <ShieldCheck aria-hidden="true" size={34} />
          <h3>Prepare these checks</h3>
          <ul>
            {requiredChecks.map((check) => <li key={check}>{check}</li>)}
          </ul>
          <p>
            “Identity checked” means identity was reviewed. It does not mean Handiwave has
            certified every technical skill.
          </p>
        </aside>
      </section>

      <section className="professional-demo-strip">
        <Smartphone aria-hidden="true" size={36} />
        <div>
          <h2>Bring your phone when you apply</h2>
          <p>We will show you how to accept a request, send a quote, update a job, and add Handiwave to your Home Screen.</p>
        </div>
        <Link className="hw-btn hw-btn-primary" to={signupPath}>Start free application</Link>
      </section>
    </main>
  )
}

export const kadunaProfessionalFlyerLink = buildTrackedPath(
  '/join-professionals',
  kadunaFlyerParameters,
)

export function KadunaProfessionalRedirect() {
  window.location.replace(kadunaProfessionalFlyerLink)
  return null
}

export default JoinProfessionals
