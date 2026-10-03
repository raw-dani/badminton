import axios, { AxiosError } from 'axios'
import type { ApiResponse } from '../types'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
})

// Attach Bearer token from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bcl_token')
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Intercept 401 to clear stale auth
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('bcl_token')
      localStorage.removeItem('bcl_user')
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
        // Soft redirect to login if unauthorized on protected page
      }
    }
    return Promise.reject(error)
  }
)

export default api
