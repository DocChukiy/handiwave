import { useMemo, useState } from 'react'
import { AuthContext, mockUsers } from './authContext.js'

const authStorageKey = 'handiwave-auth-user'

function getSavedUser() {
  const savedUser = localStorage.getItem(authStorageKey)

  if (!savedUser) {
    return null
  }

  try {
    return JSON.parse(savedUser)
  } catch {
    localStorage.removeItem(authStorageKey)
    return null
  }
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(getSavedUser)

  const auth = useMemo(() => {
    function login(role) {
      const nextUser = mockUsers[role] || mockUsers.customer
      setUser(nextUser)
      localStorage.setItem(authStorageKey, JSON.stringify(nextUser))
      return nextUser
    }

    function signup(role, name, email) {
      const fallbackUser = mockUsers[role] || mockUsers.customer
      const nextUser = {
        ...fallbackUser,
        name: name || fallbackUser.name,
        email: email || fallbackUser.email,
      }

      setUser(nextUser)
      localStorage.setItem(authStorageKey, JSON.stringify(nextUser))
      return nextUser
    }

    function logout() {
      setUser(null)
      localStorage.removeItem(authStorageKey)
    }

    return {
      isAuthenticated: Boolean(user),
      login,
      logout,
      signup,
      user,
    }
  }, [user])

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
}

export default AuthProvider
