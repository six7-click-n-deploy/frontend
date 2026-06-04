import { defineStore } from 'pinia'
import { AuthService } from '@/services/auth.service'
import { useKeycloak } from '@/composables/useKeycloak'
import { useOpenStackCredentialsStore } from '@/stores/openstack-credentials.store'
import { invalidateAll as invalidateOpenStackCache } from '@/composables/useOpenStackResourceCache'
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
    async initialize() {
      /**
       * Initialize OIDC session via Keycloak and hydrate the user state.
       * If already authenticated, load the cached user and refresh in background.
       */
      this.isLoading = true
      try {
        await keycloak.initialize()
        
        if (keycloak.isAuthenticated.value) {
          const storedUser = AuthService.getStoredUser()
          if (storedUser) {
            this.user = storedUser
          }
          
          this.fetchMe().catch(() => {})
        }
      } catch (error) {
        console.error('Auth initialization failed:', error)
      } finally {
        this.isLoading = false
      }
    },

    async login(returnUrl?: string) {
      this.error = null
      try {
        await keycloak.login(returnUrl)
      } catch (err: any) {
        this.error = err.message || 'Login failed'
        throw err
      }
    },

    async handleCallback() {
      /**
       * Finalize the Authorization Code + PKCE flow.
       * Resolves return URL from Keycloak, then loads the current user from backend.
       */
      this.isLoading = true
      this.error = null
      
      try {
        const returnUrl = await keycloak.handleCallback()
        
        await this.fetchMe()
        
        return returnUrl
      } catch (err: any) {
        this.error = err.message || 'Callback handling failed'
        throw err
      } finally {
        this.isLoading = false
      }
    },

    async fetchMe() {
      try {
        this.user = await AuthService.fetchMe()
        useOpenStackCredentialsStore().fetch().catch(() => {})
      } catch (error) {
        console.error('Failed to fetch user:', error)
        this.user = null
        throw error
      }
    },

    async logout() {
      AuthService.clearStoredUser()
      this.user = null
      this.error = null
      useOpenStackCredentialsStore().reset()
      // OpenStack-Resource-Display-Cache leeren — der nächste User
      // hat eigene Credentials und sieht ein anderes Project; alte
      // Resource-Listen dürfen nicht stehenbleiben.
      invalidateOpenStackCache()

      try {
        await keycloak.logout()
      } catch (error) {
        console.error('Logout failed:', error)
      }
    },

    hasRole(role: UserRole): boolean {
      return this.user?.role === role
    },

    hasAnyRole(...roles: UserRole[]): boolean {
      if (!this.user?.role) return false
      if (!Array.isArray(roles)) return false
      return roles.includes(this.user.role as UserRole)
    },
  },
})
