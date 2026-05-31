import { useAuth } from '../auth/useAuth.js'

const roleMessages = {
  customer: {
    title: 'Customer mode',
    text: 'You can book artisans, manage payments, save favorites, and chat safely.',
  },
  artisan: {
    title: 'Artisan mode',
    text: 'You can track customer requests, respond to messages, and prepare for jobs.',
  },
  admin: {
    title: 'Admin mode',
    text: 'You can monitor platform activity, bookings, wallets, and verification flows.',
  },
}

function RoleNotice() {
  const { user } = useAuth()
  const message = roleMessages[user?.role] || roleMessages.customer

  return (
    <section className="role-notice">
      <span>{user?.role}</span>
      <div>
        <h2>{message.title}</h2>
        <p>{message.text}</p>
      </div>
    </section>
  )
}

export default RoleNotice
