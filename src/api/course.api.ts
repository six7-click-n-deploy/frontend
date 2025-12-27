import api from './axios'
import type { Course, CourseWithUsers, CourseCreate, CourseUpdate } from '@/types'

// ----------------------------------------------------------------
// COURSE API
// ----------------------------------------------------------------
export const courseApi = {
  /**
   * Get all courses
   */
  list: (skip = 0, limit = 100) => {
    return api.get<Course[]>('/courses', { params: { skip, limit } })
  },

  /**
   * Get course by ID with users
   */
  getById: (courseId: string) => {
    return api.get<CourseWithUsers>(`/courses/${courseId}`)
  },

  /**
   * Create course (TEACHER/ADMIN only)
   */
  create: (data: CourseCreate) => {
    return api.post<Course>('/courses', data)
  },

  /**
   * Update course (TEACHER/ADMIN only)
   */
  update: (courseId: string, data: CourseUpdate) => {
    return api.put<Course>(`/courses/${courseId}`, data)
  },

  /**
   * Delete course (TEACHER/ADMIN only)
   */
  delete: (courseId: string) => {
    return api.delete(`/courses/${courseId}`)
  },
}
