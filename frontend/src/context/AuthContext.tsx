import React, { createContext, useContext, useState, useEffect } from 'react'
import api from '../lib/api'
import type { User, ApiResponse } from '../types'

interface AuthContextType {
  user: User | null
  token: string | null
  loading: boolean
  isAuthenticated: boolean
  isAdmin: boolean
  login: (login: string, password: string) => Promise<void>
  register: (data: any) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('bcl_user')
    return saved ? JSON.parse(saved) : null
  })
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('bcl_token'))
  const [loading, setLoading] = useState<boolean>(true)

  const refreshUser = async () => {
    try {
      const res = await api.get<ApiResponse<User>>('/auth/me')
      if (res.data.success && res.data.data) {
        setUser(res.data.data)
        localStorage.setItem('bcl_user', JSON.stringify(res.data.data))
      }
    } catch (err) {
      console.error('Failed to fetch user:', err)
      setUser(null)
      setToken(null)
      localStorage.removeItem('bcl_token')
      localStorage.removeItem('bcl_user')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) {
      refreshUser()
    } else {
      setLoading(false)
    }
  }, [token])

  const login = async (loginId: string, password: string) => {
    const res = await api.post<ApiResponse<{ user: User; token: string }>>('/auth/login', {
      login: loginId,
      password,
    })

    if (res.data.success && res.data.data) {
      const { user: loggedInUser, token: authToken } = res.data.data
      setToken(authToken)
      setUser(loggedInUser)
      localStorage.setItem('bcl_token', authToken)
      localStorage.setItem('bcl_user', JSON.stringify(loggedInUser))
    }
  }

  const register = async (formData: any) => {
    const res = await api.post<ApiResponse<{ user: User; token: string }>>('/auth/register', formData)
    if (res.data.success && res.data.data) {
      const { user: registeredUser, token: authToken } = res.data.data
      setToken(authToken)
      setUser(registeredUser)
      localStorage.setItem('bcl_token', authToken)
      localStorage.setItem('bcl_user', JSON.stringify(registeredUser))
    }
  }

  const logout = async () => {
    try {
      if (token) {
        await api.post('/auth/logout')
      }
    } catch (e) {
      // Ignore network errors on logout
    } finally {
      setUser(null)
      setToken(null)
      localStorage.removeItem('bcl_token')
      localStorage.removeItem('bcl_user')
    }
  }

  const isAuthenticated = !!user && !!token
  const isAdmin = user?.role === 'admin'

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated,
        isAdmin,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
