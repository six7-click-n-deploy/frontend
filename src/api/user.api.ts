import api from './axios'
import type {
  User,
  UserWithCourse,
  UserUpdate,
  UserPasswordUpdate,
  UserStatistics,
  UserQueryParams,
} from '@/types'

// ----------------------------------------------------------------
// USER API
// ----------------------------------------------------------------
export const userApi = {
  /**
   * Get current user with course
   */
  getMe: () => {
    return api.get<UserWithCourse>('/users/me')
  },

  /**
   * Get all users (TEACHER/ADMIN only)
   */
  list: (params?: UserQueryParams) => {
    return api.get<User[]>('/users', { params })
  },

  /**
   * Search users by username or email
   */
  search: (query: string, limit = 10) => {
    return api.get<User[]>('/users/search', { params: { query, limit } })
  },

  /**
   * Get user by ID
   */
  getById: (userId: string) => {
    return api.get<UserWithCourse>(`/users/${userId}`)
  },

  /**
   * Get user statistics
   */
  getStatistics: (userId: string) => {
    return api.get<UserStatistics>(`/users/${userId}/statistics`)
  },

  /**
   * Update user
   */
  update: (userId: string, data: UserUpdate) => {
    return api.put<User>(`/users/${userId}`, data)
  },

  /**
   * Change password
   */
  changePassword: (userId: string, data: UserPasswordUpdate) => {
    return api.post(`/users/${userId}/password`, data)
  },

  /**
   * Delete user (ADMIN only)
   */
  delete: (userId: string) => {
    return api.delete(`/users/${userId}`)
  },
}