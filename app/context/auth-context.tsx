'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  name: string
  email: string
  avatar?: string
}

interface AuthContextValue {
  user: User | null
  login: (user: User) => void
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

const STORAGE_KEY = 'compadre-user'

function loadUser(): User | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    setUser(loadUser())
    setIsLoading(false)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  const login = (u: User) => {
    setUser(u)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(u)) } catch {}
  }

  const logout = () => {
    setUser(null)
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
    router.push('/')
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
