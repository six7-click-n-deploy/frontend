import api from './axios'
import type { User } from '@/types'

export interface LoginCredentials {
  username: string
  password: string
}

export interface RegisterData {
  email: string
  username: string
  password: string
  role?: string
  courseId?: string
}

export interface AuthToken {
  access_token: string
  token_type: string
}

// ----------------------------------------------------------------
// AUTH API
// ----------------------------------------------------------------
export const authApi = {
  /**
   * Login user
   */
  login: (credentials: LoginCredentials) => {
    return api.post<AuthToken>('/auth/login', credentials)
  },

  /**
   * Register new user
   */
  register: (data: RegisterData) => {
    return api.post<AuthToken>('/auth/register', data)
  },

  /**
   * Get current user info
   */
  me: () => {
    return api.get<User>('/auth/me')
  },

  /**
   * Refresh access token
   */
  refresh: () => {
    return api.post<AuthToken>('/auth/refresh')
  },
}
