import { Link } from 'react-router-dom'

function Button({ children, className = 'primary-cta', to, type = 'button', ...props }) {
  if (to) {
    return (
      <Link className={className} to={to} {...props}>
        {children}
      </Link>
    )
  }

  return (
    <button className={className} type={type} {...props}>
      {children}
    </button>
  )
}

export default Button
