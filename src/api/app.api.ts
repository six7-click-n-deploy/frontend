import api from './axios'
// WICHTIG: AppVariable hier hinzufügen
import type { 
  App, 
  AppWithUser, 
  AppCreate, 
  AppUpdate, 
  AppQueryParams,
  AppVariable 
} from '@/types'

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
    return api.get<AppWithUser>(`/apps/${appId}`, {
      params: { refresh }
    })
  },

  /**
   * Get dynamic variables from variables.tf
   * Endpoint: GET /apps/{app_id}/variables?version={version}
   */
  getVariables: (appId: string, version: string) => {
    return api.get<AppVariable[]>(`/apps/${appId}/variables`, {
      params: { version }
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