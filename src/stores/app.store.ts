import { defineStore } from 'pinia'
import { appApi } from '@/api/app.api'
import type { App, AppWithUser, AppCreate, AppUpdate, AppVariable } from '@/types'
import { useAuthStore } from './auth.store' // Import nach oben ziehen, wenn möglich, sonst unten lassen wie bei dir

export const useAppStore = defineStore('app', {
  state: () => ({
    apps: [] as App[],
    currentApp: null as AppWithUser | null,
    isLoading: false,
    error: null as string | null,
  }),

  getters: {
    myApps: (state) => {
      const authStore = useAuthStore()
      return state.apps.filter((app) => app.userId === authStore.userId)
    },
  },

  actions: {
    async fetchApps(userId?: string) {
      this.isLoading = true
      this.error = null

      try {
        const { data } = await appApi.list({ userId })
        this.apps = data
      } catch (err: any) {
        this.error = err.response?.data?.detail || 'Failed to fetch apps'
      } finally {
        this.isLoading = false
      }
    },

    async fetchAppById(appId: string) {
      this.isLoading = true
      this.error = null

      try {
        const { data } = await appApi.getById(appId)
        this.currentApp = data
      } catch (err: any) {
        this.error = err.response?.data?.detail || 'Failed to fetch app'
      } finally {
        this.isLoading = false
      }
    },

    // --- NEU: Action für Variablen ---
    async fetchAppVariables(appId: string, version: string): Promise<AppVariable[]> {
      // Wir setzen hier isLoading nicht global für den ganzen Store, 
      // um nicht das UI an anderen Stellen flackern zu lassen, 
      // aber wir nutzen das Error-Handling.
      this.error = null

      try {
        const { data } = await appApi.getVariables(appId, version)
        return data
      } catch (err: any) {
        const msg = err.response?.data?.detail || 'Failed to fetch app variables'
        this.error = msg
        throw err // Wir werfen den Fehler weiter, damit die Summary-Seite ihn handeln kann
      }
    },
    // ---------------------------------

    async createApp(data: AppCreate) {
      this.isLoading = true
      this.error = null

      try {
        const { data: app } = await appApi.create(data)
        this.apps.push(app)
        return app
      } catch (err: any) {
        this.error = err.response?.data?.detail || 'Failed to create app'
        throw err
      } finally {
        this.isLoading = false
      }
    },

    async updateApp(appId: string, data: AppUpdate) {
      this.isLoading = true
      this.error = null

      try {
        const { data: app } = await appApi.update(appId, data)
        const index = this.apps.findIndex((a) => a.appId === appId)
        if (index !== -1) {
          this.apps[index] = app
        }
        return app
      } catch (err: any) {
        this.error = err.response?.data?.detail || 'Failed to update app'
        throw err
      } finally {
        this.isLoading = false
      }
    },

    async deleteApp(appId: string) {
      this.isLoading = true
      this.error = null

      try {
        await appApi.delete(appId)
        this.apps = this.apps.filter((a) => a.appId !== appId)
      } catch (err: any) {
        this.error = err.response?.data?.detail || 'Failed to delete app'
        throw err
      } finally {
        this.isLoading = false
      }
    },
  },
})