import axios, { type AxiosError } from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ✅ Token automatisch mitsenden
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ✅ Globales Error-Handling
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // 401: Nicht authentifiziert -> Logout
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      
      // Nur zum Login umleiten wenn nicht bereits dort
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    
    // 403: Keine Berechtigung
    if (error.response?.status === 403) {
      console.error('Access forbidden:', error.response.data)
    }
    
    return Promise.reject(error)
  }
)

export default api
