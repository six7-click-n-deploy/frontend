import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import type { UserRole } from '@/types'

/**
 * Composable für Permission Checks
 * Zentrale Stelle für alle rollenbasierten Berechtigungsprüfungen
 */
export function usePermissions() {
  const authStore = useAuthStore()

  // Computed properties für Rollen
  const isStudent = computed(() => authStore.isStudent)
  const isTeacher = computed(() => authStore.isTeacher)
  const isAdmin = computed(() => authStore.isAdmin)
  const isTeacherOrAdmin = computed(() => authStore.isTeacherOrAdmin)

  // Prüfen ob User eine bestimmte Rolle hat
  const hasRole = (role: UserRole): boolean => {
    return authStore.hasRole(role)
  }

  // Prüfen ob User eine von mehreren Rollen hat
  const hasAnyRole = (...roles: UserRole[]): boolean => {
    return authStore.hasAnyRole(...roles)
  }

  // Feature-basierte Permissions
  const can = {
    // Course Permissions
    viewCourses: computed(() => authStore.isAuthenticated),
    createCourse: computed(() => authStore.isTeacherOrAdmin),
    editCourse: computed(() => authStore.isTeacherOrAdmin),
    deleteCourse: computed(() => authStore.isAdmin),

    // User Permissions
    viewUsers: computed(() => authStore.isTeacherOrAdmin),
    editUser: computed(() => authStore.isAdmin),
    deleteUser: computed(() => authStore.isAdmin),

    // App Permissions
    viewApps: computed(() => authStore.isAuthenticated),
    createApp: computed(() => authStore.isAuthenticated),
    editApp: computed(() => authStore.isAuthenticated), // eigene Apps
    deleteApp: computed(() => authStore.isAuthenticated), // eigene Apps

    // Deployment Permissions
    viewDeployments: computed(() => authStore.isAuthenticated),
    createDeployment: computed(() => authStore.isAuthenticated),
    manageDeployment: computed(() => authStore.isTeacherOrAdmin),

    // UserGroup Permissions
    viewUserGroups: computed(() => authStore.isTeacherOrAdmin),
    createUserGroup: computed(() => authStore.isTeacherOrAdmin),
    editUserGroup: computed(() => authStore.isTeacherOrAdmin),
    deleteUserGroup: computed(() => authStore.isAdmin),

    // Team Permissions
    viewTeams: computed(() => authStore.isAuthenticated),
    createTeam: computed(() => authStore.isAuthenticated),
    editTeam: computed(() => authStore.isAuthenticated), // eigene Teams
    deleteTeam: computed(() => authStore.isTeacherOrAdmin),
  }

  return {
    isStudent,
    isTeacher,
    isAdmin,
    isTeacherOrAdmin,
    hasRole,
    hasAnyRole,
    can,
  }
}
