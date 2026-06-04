import { defineStore } from 'pinia'
import { courseApi } from '@/api/course.api'
import type { Course, CourseWithUsers, CourseCreate, CourseUpdate, User } from '@/types'

export const useCourseStore = defineStore('course', {
  state: () => ({
    courses: [] as Course[],
    currentCourse: null as CourseWithUsers | null,
    // Sole source of truth for the detail page's roster — kept
    // separate from ``currentCourse.users`` so member mutations don't
    // need to refetch the whole course just to update the list.
    currentMembers: [] as User[],
    isLoading: false,
    error: null as string | null,
  }),

  actions: {
    async fetchCourses() {
      this.isLoading = true
      this.error = null

      try {
        const { data } = await courseApi.list()
        this.courses = data
      } catch (err: any) {
        this.error = err.response?.data?.detail || 'Failed to fetch courses'
      } finally {
        this.isLoading = false
      }
    },

    async fetchCourseById(courseId: string) {
      this.isLoading = true
      this.error = null

      try {
        const { data } = await courseApi.getById(courseId)
        this.currentCourse = data
        this.currentMembers = data.users ?? []
      } catch (err: any) {
        this.error = err.response?.data?.detail || 'Failed to fetch course'
        throw err
      } finally {
        this.isLoading = false
      }
    },

    async createCourse(data: CourseCreate) {
      this.isLoading = true
      this.error = null

      try {
        const { data: course } = await courseApi.create(data)
        this.courses.push(course)
        return course
      } catch (err: any) {
        this.error = err.response?.data?.detail || 'Failed to create course'
        throw err
      } finally {
        this.isLoading = false
      }
    },

    async updateCourse(courseId: string, data: CourseUpdate) {
      this.isLoading = true
      this.error = null

      try {
        const { data: course } = await courseApi.update(courseId, data)
        const index = this.courses.findIndex((c) => c.courseId === courseId)
        if (index !== -1) {
          this.courses[index] = course
        }
        if (this.currentCourse && this.currentCourse.courseId === courseId) {
          this.currentCourse = { ...this.currentCourse, ...course }
        }
        return course
      } catch (err: any) {
        this.error = err.response?.data?.detail || 'Failed to update course'
        throw err
      } finally {
        this.isLoading = false
      }
    },

    async deleteCourse(courseId: string) {
      this.isLoading = true
      this.error = null

      try {
        await courseApi.delete(courseId)
        this.courses = this.courses.filter((c) => c.courseId !== courseId)
      } catch (err: any) {
        this.error = err.response?.data?.detail || 'Failed to delete course'
        throw err
      } finally {
        this.isLoading = false
      }
    },

    // --------------------------------------------------------------
    // MEMBERS
    // --------------------------------------------------------------
    async fetchMembers(courseId: string) {
      try {
        const { data } = await courseApi.listMembers(courseId)
        this.currentMembers = data
        return data
      } catch (err: any) {
        this.error = err.response?.data?.detail || 'Failed to fetch members'
        throw err
      }
    },

    async addMembers(courseId: string, userIds: string[]) {
      try {
        const { data } = await courseApi.addMembers(courseId, userIds)
        this.currentMembers = data
        return data
      } catch (err: any) {
        this.error = err.response?.data?.detail || 'Failed to add members'
        throw err
      }
    },

    async removeMember(courseId: string, userId: string) {
      try {
        await courseApi.removeMember(courseId, userId)
        this.currentMembers = this.currentMembers.filter((u) => u.userId !== userId)
      } catch (err: any) {
        this.error = err.response?.data?.detail || 'Failed to remove member'
        throw err
      }
    },
  },
})
