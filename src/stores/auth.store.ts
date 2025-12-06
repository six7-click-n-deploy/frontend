import { defineStore } from 'pinia'
import {
  loginService,
  fetchMeService,
  logoutService,
  type User,
} from '@/services/auth.service'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as User | null,
    isLoading: false,
    error: null as string | null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.user,
  },

  actions: {
    async login(email: string, password: string) {
      this.isLoading = true
      this.error = null

      try {
        this.user = await loginService(email, password)
      } catch (err: any) {
        this.error =
          err.response?.data?.message || 'Login failed'
        throw err
      } finally {
        this.isLoading = false
      }
    },

    async fetchMe() {
      try {
        this.user = await fetchMeService()
      } catch {
        this.user = null
        localStorage.removeItem('token')
      }
    },

    async logout() {
      await logoutService()
      this.user = null
    },
  },
})
