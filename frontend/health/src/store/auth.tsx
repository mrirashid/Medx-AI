import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

type Role = 'admin' | 'doctor' | 'nurse'

type User = {
  id: string
  name: string
  email: string
  role: Role
  avatarUrl?: string
  phone?: string
  department?: string
  language?: string
  notifications?: {
    email?: boolean
    sms?: boolean
    push?: boolean
  }
  timezone?: string
}

type AuthContextType = {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  updateProfile: (data: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const STORAGE_KEY = 'health_auth'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as User
        setUser(parsed)
      } catch {}
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (email: string, _password: string) => {
    await new Promise((r) => setTimeout(r, 400))
    const mockUser: User = {
      id: 'u_nurse_1',
      name: 'Nurse Taylor',
      email,
      role: 'nurse',
      avatarUrl: undefined,
      phone: '+1 234 567 8900',
      department: 'Nursing',
      language: (localStorage.getItem('lang') as any) ?? 'en',
      notifications: {
        email: true,
        sms: false,
        push: true,
      },
    }
    setUser(mockUser)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockUser))
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const updateProfile = useCallback((data: Partial<User>) => {
    setUser((prev) => {
      const next = prev ? { ...prev, ...data } : null
      if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const value = useMemo(() => ({ user, loading, login, logout, updateProfile }), [user, loading, login, logout, updateProfile])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
