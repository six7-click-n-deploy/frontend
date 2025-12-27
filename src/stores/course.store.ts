import { defineStore } from 'pinia'
import { courseApi } from '@/api/course.api'
import type { Course, CourseWithUsers, CourseCreate, CourseUpdate } from '@/types'

export const useCourseStore = defineStore('course', {
  state: () => ({
    courses: [] as Course[],
    currentCourse: null as CourseWithUsers | null,
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
      } catch (err: any) {
        this.error = err.response?.data?.detail || 'Failed to fetch course'
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
  },
})
