import api from './axios'

export interface DashboardStats {
  deployments: number
  apps: number
  courses: number
}

export const dashboardApi = {
  stats: () => api.get<DashboardStats>('/dashboard/stats'),
}
