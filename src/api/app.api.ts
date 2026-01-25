import api from './axios'
import type { 
  App, 
  AppWithUser, 
  AppCreate, 
  AppUpdate, 
  AppQueryParams,
  AppVariable // <--- NEU: Importieren (falls in types definiert)
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

  // --- NEU HINZUFÜGEN ---
  /**
   * Get variables for a specific app version
   */
  getVariables: (appId: string, version: string) => {
    // Ruft GET /apps/{id}/variables?version=... auf
    return api.get<AppVariable[]>(`/apps/${appId}/variables`, { 
      params: { version } 
    })
  }
  // ----------------------
}