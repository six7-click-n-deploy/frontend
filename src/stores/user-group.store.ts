import { defineStore } from 'pinia'
import { userGroupApi } from '@/api/user-group.api'
import type { UserGroup, UserGroupCreate, UserGroupUpdate } from '@/types'

export const useUserGroupStore = defineStore('userGroup', {
  state: () => ({
    userGroups: [] as UserGroup[],
    currentUserGroup: null as UserGroup | null,
    isLoading: false,
    error: null as string | null,
  }),

  getters: {
    getUserGroupById: (state) => (id: string) => {
      return state.userGroups.find((g) => g.userGroupId === id)
    },
    
    getUserGroupsByCourse: (state) => (courseId: string) => {
      return state.userGroups.filter((g) => g.courseId === courseId)
    },
  },

  actions: {
    async fetchUserGroups() {
      this.isLoading = true
      this.error = null
      
      try {
        const response = await userGroupApi.getAll()
        this.userGroups = response.data
      } catch (err: any) {
        this.error = err.response?.data?.detail || 'Failed to fetch user groups'
        throw err
      } finally {
        this.isLoading = false
      }
    },

    async fetchUserGroupById(id: string) {
      this.isLoading = true
      this.error = null
      
      try {
        const response = await userGroupApi.getById(id)
        this.currentUserGroup = response.data
        
        // Update in list if exists
        const index = this.userGroups.findIndex((g) => g.userGroupId === id)
        if (index !== -1) {
          this.userGroups[index] = response.data
        }
        
        return response.data
      } catch (err: any) {
        this.error = err.response?.data?.detail || 'Failed to fetch user group'
        throw err
      } finally {
        this.isLoading = false
      }
    },

    async createUserGroup(data: UserGroupCreate) {
      this.isLoading = true
      this.error = null
      
      try {
        const response = await userGroupApi.create(data)
        this.userGroups.push(response.data)
        return response.data
      } catch (err: any) {
        this.error = err.response?.data?.detail || 'Failed to create user group'
        throw err
      } finally {
        this.isLoading = false
      }
    },

    async updateUserGroup(id: string, data: UserGroupUpdate) {
      this.isLoading = true
      this.error = null
      
      try {
        const response = await userGroupApi.update(id, data)
        
        // Update in list
        const index = this.userGroups.findIndex((g) => g.userGroupId === id)
        if (index !== -1) {
          this.userGroups[index] = response.data
        }
        
        // Update current if it's the same
        if (this.currentUserGroup?.userGroupId === id) {
          this.currentUserGroup = response.data
        }
        
        return response.data
      } catch (err: any) {
        this.error = err.response?.data?.detail || 'Failed to update user group'
        throw err
      } finally {
        this.isLoading = false
      }
    },

    async deleteUserGroup(id: string) {
      this.isLoading = true
      this.error = null
      
      try {
        await userGroupApi.delete(id)
        
        // Remove from list
        this.userGroups = this.userGroups.filter((g) => g.userGroupId !== id)
        
        // Clear current if it's the deleted one
        if (this.currentUserGroup?.userGroupId === id) {
          this.currentUserGroup = null
        }
      } catch (err: any) {
        this.error = err.response?.data?.detail || 'Failed to delete user group'
        throw err
      } finally {
        this.isLoading = false
      }
    },

    async addMember(userGroupId: string, userId: string) {
      this.isLoading = true
      this.error = null
      
      try {
        const response = await userGroupApi.addMember(userGroupId, userId)
        
        // Update in list
        const index = this.userGroups.findIndex((g) => g.userGroupId === userGroupId)
        if (index !== -1) {
          this.userGroups[index] = response.data
        }
        
        return response.data
      } catch (err: any) {
        this.error = err.response?.data?.detail || 'Failed to add member'
        throw err
      } finally {
        this.isLoading = false
      }
    },

    async removeMember(userGroupId: string, userId: string) {
      this.isLoading = true
      this.error = null
      
      try {
        const response = await userGroupApi.removeMember(userGroupId, userId)
        
        // Update in list
        const index = this.userGroups.findIndex((g) => g.userGroupId === userGroupId)
        if (index !== -1) {
          this.userGroups[index] = response.data
        }
        
        return response.data
      } catch (err: any) {
        this.error = err.response?.data?.detail || 'Failed to remove member'
        throw err
      } finally {
        this.isLoading = false
      }
    },

    clearError() {
      this.error = null
    },
  },
})
