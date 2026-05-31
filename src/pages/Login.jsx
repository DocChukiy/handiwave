import { Link } from 'react-router-dom'

function Login() {
  return (
    <div className="auth-page">
      <section className="auth-card">
        <p className="section-kicker">Welcome back</p>
        <h1>Log in to Handiwave</h1>
        <p>Manage bookings, chat with artisans, and keep payments protected.</p>
        <form className="auth-form">
          <label>Email address<input type="email" placeholder="you@example.com" /></label>
          <label>Password<input type="password" placeholder="Enter your password" /></label>
          <button type="button">Login</button>
        </form>
        <span>New here? <Link to="/signup">Create an account</Link></span>
      </section>
    </div>
  )
}

export default Login
