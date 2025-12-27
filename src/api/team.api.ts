import api from './axios'
import type { Team, TeamWithMembers, TeamCreate, TeamUpdate, TeamQueryParams } from '@/types'

// ----------------------------------------------------------------
// TEAM API
// ----------------------------------------------------------------
export const teamApi = {
  /**
   * Get all teams
   */
  list: (params?: TeamQueryParams) => {
    return api.get<Team[]>('/teams', { params })
  },

  /**
   * Get team by ID with members
   */
  getById: (teamId: string) => {
    return api.get<TeamWithMembers>(`/teams/${teamId}`)
  },

  /**
   * Create team (TEACHER/ADMIN only)
   */
  create: (data: TeamCreate) => {
    return api.post<Team>('/teams', data)
  },

  /**
   * Update team (TEACHER/ADMIN only)
   */
  update: (teamId: string, data: TeamUpdate) => {
    return api.put<Team>(`/teams/${teamId}`, data)
  },

  /**
   * Delete team (TEACHER/ADMIN only)
   */
  delete: (teamId: string) => {
    return api.delete(`/teams/${teamId}`)
  },

  /**
   * Add user to team (TEACHER/ADMIN only)
   */
  addUser: (teamId: string, userId: string) => {
    return api.post(`/teams/${teamId}/users/${userId}`)
  },

  /**
   * Remove user from team (TEACHER/ADMIN only)
   */
  removeUser: (teamId: string, userId: string) => {
    return api.delete(`/teams/${teamId}/users/${userId}`)
  },
}
