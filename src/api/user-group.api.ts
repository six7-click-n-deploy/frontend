import api from './axios'
import type { UserGroup, UserGroupWithMembers, UserGroupCreate } from '@/types'

// ----------------------------------------------------------------
// USER GROUP API
// ----------------------------------------------------------------
export const userGroupApi = {
  /**
   * Get all user groups
   */
  list: (skip = 0, limit = 100) => {
    return api.get<UserGroup[]>('/user-groups', { params: { skip, limit } })
  },

  /**
   * Get user group by ID with members
   */
  getById: (userGroupId: string) => {
    return api.get<UserGroupWithMembers>(`/user-groups/${userGroupId}`)
  },

  /**
   * Create user group (TEACHER/ADMIN only)
   */
  create: (data: UserGroupCreate) => {
    return api.post<UserGroup>('/user-groups', data)
  },

  /**
   * Delete user group (TEACHER/ADMIN only)
   */
  delete: (userGroupId: string) => {
    return api.delete(`/user-groups/${userGroupId}`)
  },

  /**
   * Add user to group (TEACHER/ADMIN only)
   */
  addUser: (userGroupId: string, userId: string) => {
    return api.post(`/user-groups/${userGroupId}/users/${userId}`)
  },

  /**
   * Remove user from group (TEACHER/ADMIN only)
   */
  removeUser: (userGroupId: string, userId: string) => {
    return api.delete(`/user-groups/${userGroupId}/users/${userId}`)
  },
}
