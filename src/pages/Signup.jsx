import { Link } from 'react-router-dom'

function Signup() {
  return (
    <div className="auth-page">
      <section className="auth-card">
        <p className="section-kicker">Join Handiwave</p>
        <h1>Create your account</h1>
        <p>Book trusted services, save favorite artisans, and pay safely.</p>
        <form className="auth-form">
          <label>Full name<input placeholder="Enter your name" /></label>
          <label>Email address<input type="email" placeholder="you@example.com" /></label>
          <label>Password<input type="password" placeholder="Create a password" /></label>
          <button type="button">Sign Up</button>
        </form>
        <span>Already have an account? <Link to="/login">Log in</Link></span>
      </section>
    </div>
  )
}

export default Signup
