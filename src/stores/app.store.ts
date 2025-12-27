import { defineStore } from 'pinia'
import { appApi } from '@/api/app.api'
import type { App, AppWithUser, AppCreate, AppUpdate } from '@/types'

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

// Import auth store (defined later in execution)
import { useAuthStore } from './auth.store'
