import api from './axios'
import type { App, AppWithUser, AppCreate, AppUpdate, AppQueryParams } from '@/types'

// ----------------------------------------------------------------
// APP API
// ----------------------------------------------------------------
export const appApi = {
  /**
   * Get all apps (filtered by role)
   */
  list: (params?: AppQueryParams) => {
    return api.get<App[]>('/apps', { params })
  },

  /**
   * Get app by ID (Updated to support refresh)
   */
  getById: (appId: string, refresh: boolean = false) => {
    // Hier übergeben wir { params: { refresh } }, damit ?refresh=true an die URL gehängt wird
    return api.get<AppWithUser>(`/apps/${appId}`, {
      params: { refresh }
    })
  },

  /**
   * Create app
   */
  create: (data: AppCreate) => {
    return api.post<App>('/apps', data)
  },

  /**
   * Update app
   */
  update: (appId: string, data: AppUpdate) => {
    return api.put<App>(`/apps/${appId}`, data)
  },

  /**
   * Delete app
   */
  delete: (appId: string) => {
    return api.delete(`/apps/${appId}`)
  },
}