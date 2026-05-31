import { mockUsers } from '../auth/authContext.js'

export async function signInWithRole(role = 'customer') {
  return {
    data: mockUsers[role] || mockUsers.customer,
    error: null,
  }
}

export async function signUpWithRole({ email, name, role = 'customer' }) {
  const fallbackUser = mockUsers[role] || mockUsers.customer

  return {
    data: {
      ...fallbackUser,
      email: email || fallbackUser.email,
      name: name || fallbackUser.name,
    },
    error: null,
  }
}

export async function signOut() {
  return {
    data: true,
    error: null,
  }
}

export async function getCurrentUser() {
  return {
    data: null,
    error: null,
  }
}
