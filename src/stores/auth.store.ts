import { defineStore } from 'pinia'
import { AuthService } from '@/services/auth.service'
import type { User, LoginCredentials, RegisterData, UserRole } from '@/types'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    token: localStorage.getItem('token') || null,
    isLoading: false,
    error: null as string | null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.user,
    
    userRole: (state): UserRole | null => state.user?.role || null,
    
    isStudent: (state) => state.user?.role === 'student',
    isTeacher: (state) => state.user?.role === 'teacher',
    isAdmin: (state) => state.user?.role === 'admin',
    
    isTeacherOrAdmin: (state) => 
      state.user?.role === 'teacher' || state.user?.role === 'admin',
    
    userId: (state) => state.user?.userId || null,
  },

  actions: {
    /**
     * Login user
     */
    async login(credentials: LoginCredentials) {
      this.isLoading = true
      this.error = null

      try {
        this.user = await AuthService.login(credentials)
        this.token = localStorage.getItem('token')
      } catch (err: any) {
        this.error = err.response?.data?.detail || 'Login failed'
        throw err
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Register new user
     */
    async register(data: {
      email: string
      password: string
      username: string
      role?: string
      courseId?: string
    }) {
      this.isLoading = true
      this.error = null

      try {
        this.user = await AuthService.register(data)
        this.token = localStorage.getItem('token')
      } catch (err: any) {
        this.error = err.response?.data?.detail || 'Registration failed'
        throw err
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Fetch current user info
     */
    async fetchMe() {
      try {
        this.user = await AuthService.fetchMe()
      } catch {
        this.user = null
        await this.logout()
      }
    },

    /**
     * Initialize store from localStorage
     */
    async initialize() {
      const storedUser = AuthService.getStoredUser()
      
      if (storedUser && AuthService.isAuthenticated()) {
        this.user = storedUser
        // Refresh user data in background
        this.fetchMe().catch(() => {})
      }
    },

    /**
     * Refresh access token
     */
    async refreshToken() {
      try {
        await AuthService.refreshToken()
      } catch {
        await this.logout()
      }
    },

    /**
     * Logout user
     */
    async logout() {
      await AuthService.logout()
      this.user = null
      this.token = null
      this.error = null
    },

    /**
     * Check if user has specific role
     */
    hasRole(role: UserRole): boolean {
      return this.user?.role === role
    },

    /**
     * Check if user has any of the specified roles
     */
    hasAnyRole(...roles: UserRole[]): boolean {
      if (!this.user?.role) return false
      if (!Array.isArray(roles)) return false
      return roles.includes(this.user.role as UserRole)
    },
  },
})
