import { createContext } from 'react'

export const mockUsers = {
  customer: {
    name: 'Tomi Customer',
    role: 'customer',
    email: 'customer@handiwave.test',
  },
  artisan: {
    name: 'Ada Artisan',
    role: 'artisan',
    email: 'artisan@handiwave.test',
  },
  admin: {
    name: 'Handiwave Admin',
    role: 'admin',
    email: 'admin@handiwave.test',
  },
}

export const AuthContext = createContext(null)
