import { authApi } from '@/api/auth.api'
import { userApi } from '@/api/user.api'
import type { User } from '@/types'
import type { LoginCredentials} from '@/api/auth.api'

// ----------------------------------------------------------------
// AUTH SERVICE
// ----------------------------------------------------------------
export class AuthService {
  /**
   * Login user and store token
   */
  static async login(credentials: LoginCredentials): Promise<User> {
    const { data: tokenData } = await authApi.login(credentials)
    
    // Store token
    localStorage.setItem('token', tokenData.access_token)
    
    // Fetch user info
    const { data: user } = await userApi.getMe()
    localStorage.setItem('user', JSON.stringify(user))
    
    return user
  }

  /**
   * Register new user and store token
   */
  static async register(data: {
    email: string
    password: string
    username: string
    role?: string
    courseId?: string
  }): Promise<User> {
    const { data: tokenData } = await authApi.register(data)
    
    // Store token
    localStorage.setItem('token', tokenData.access_token)
    
    // Fetch user info
    const { data: user } = await userApi.getMe()
    localStorage.setItem('user', JSON.stringify(user))
    
    return user
  }

  /**
   * Fetch current user from API
   */
  static async fetchMe(): Promise<User> {
    const { data: user } = await userApi.getMe()
    localStorage.setItem('user', JSON.stringify(user))
    return user
  }

  /**
   * Refresh access token
   */
  static async refreshToken(): Promise<void> {
    const { data: tokenData } = await authApi.refresh()
    localStorage.setItem('token', tokenData.access_token)
  }

  /**
   * Logout user
   */
  static async logout(): Promise<void> {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  /**
   * Check if user is authenticated
   */
  static isAuthenticated(): boolean {
    return !!localStorage.getItem('token')
  }

  /**
   * Get stored user from localStorage
   */
  static getStoredUser(): User | null {
    const userStr = localStorage.getItem('user')
    if (!userStr) return null
    
    try {
      return JSON.parse(userStr) as User
    } catch {
      return null
    }
  }
}
