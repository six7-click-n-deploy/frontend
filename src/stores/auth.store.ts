import { defineStore } from 'pinia'
import { AuthService } from '@/services/auth.service'
import { useKeycloak } from '@/composables/useKeycloak'
import type { User, UserRole } from '@/types'

const keycloak = useKeycloak()

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    isLoading: false,
    error: null as string | null,
  }),

  getters: {
    isAuthenticated: () => keycloak.isAuthenticated.value,
    
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
     * Initialize authentication with Keycloak
     */
    async initialize() {
      this.isLoading = true
      try {
        await keycloak.initialize()
        
        if (keycloak.isAuthenticated.value) {
          // Load user from localStorage or fetch from backend
          const storedUser = AuthService.getStoredUser()
          if (storedUser) {
            this.user = storedUser
          }
          
          // Refresh user data in background
          this.fetchMe().catch(() => {})
        }
      } catch (error) {
        console.error('Auth initialization failed:', error)
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Login with Keycloak (redirects to Keycloak)
     */
    async login(returnUrl?: string) {
      this.error = null
      try {
        await keycloak.login(returnUrl)
      } catch (err: any) {
        this.error = err.message || 'Login failed'
        throw err
      }
    },

    /**
     * Handle OAuth callback from Keycloak
     */
    async handleCallback() {
      this.isLoading = true
      this.error = null
      
      try {
        const returnUrl = await keycloak.handleCallback()
        
        // Fetch user info from backend
        await this.fetchMe()
        
        return returnUrl
      } catch (err: any) {
        this.error = err.message || 'Callback handling failed'
        throw err
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Fetch current user info from backend
     */
    async fetchMe() {
      try {
        this.user = await AuthService.fetchMe()
      } catch (error) {
        console.error('Failed to fetch user:', error)
        this.user = null
        throw error
      }
    },

    /**
     * Logout from Keycloak and clear local state
     */
    async logout() {
      AuthService.clearStoredUser()
      this.user = null
      this.error = null
      
      try {
        await keycloak.logout()
      } catch (error) {
        console.error('Logout failed:', error)
      }
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
