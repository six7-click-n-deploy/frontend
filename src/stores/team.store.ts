import { defineStore } from 'pinia'
import { teamApi } from '@/api/team.api'
import type { Team, TeamCreate, TeamUpdate } from '@/types'

export const useTeamStore = defineStore('team', {
  state: () => ({
    teams: [] as Team[],
    currentTeam: null as Team | null,
    isLoading: false,
    error: null as string | null,
  }),

  getters: {
    getTeamById: (state) => (id: string) => {
      return state.teams.find((t) => t.teamId === id)
    },
    
    getTeamsByUserGroup: (state) => (userGroupId: string) => {
      return state.teams.filter((t) => t.userGroupId === userGroupId)
    },
  },

  actions: {
    async fetchTeams() {
      this.isLoading = true
      this.error = null
      
      try {
        const response = await teamApi.list()
        this.teams = response.data
      } catch (err: any) {
        this.error = err.response?.data?.detail || 'Failed to fetch teams'
        throw err
      } finally {
        this.isLoading = false
      }
    },

    async fetchTeamById(id: string) {
      this.isLoading = true
      this.error = null
      
      try {
        const response = await teamApi.getById(id)
        this.currentTeam = response.data
        const index = this.teams.findIndex((t) => t.teamId === id)
        if (index !== -1) {
          this.teams[index] = response.data
        }
        
        return response.data
      } catch (err: any) {
        this.error = err.response?.data?.detail || 'Failed to fetch team'
        throw err
      } finally {
        this.isLoading = false
      }
    },

    async createTeam(data: TeamCreate) {
      this.isLoading = true
      this.error = null
      
      try {
        const response = await teamApi.create(data)
        this.teams.push(response.data)
        return response.data
      } catch (err: any) {
        this.error = err.response?.data?.detail || 'Failed to create team'
        throw err
      } finally {
        this.isLoading = false
      }
    },

    async updateTeam(id: string, data: TeamUpdate) {
      this.isLoading = true
      this.error = null
      
      try {
        const response = await teamApi.update(id, data)
        const index = this.teams.findIndex((t) => t.teamId === id)
        if (index !== -1) {
          this.teams[index] = response.data
        }
        if (this.currentTeam?.teamId === id) {
          this.currentTeam = response.data
        }
        
        return response.data
      } catch (err: any) {
        this.error = err.response?.data?.detail || 'Failed to update team'
        throw err
      } finally {
        this.isLoading = false
      }
    },

    async deleteTeam(id: string) {
      this.isLoading = true
      this.error = null
      
      try {
        await teamApi.delete(id)
        this.teams = this.teams.filter((t) => t.teamId !== id)
        if (this.currentTeam?.teamId === id) {
          this.currentTeam = null
        }
      } catch (err: any) {
        this.error = err.response?.data?.detail || 'Failed to delete team'
        throw err
      } finally {
        this.isLoading = false
      }
    },

    async addMember(teamId: string, userId: string) {
      this.isLoading = true
      this.error = null
      
      try {
        const response = await teamApi.addMember(teamId, userId)
        const index = this.teams.findIndex((t) => t.teamId === teamId)
        if (index !== -1) {
          this.teams[index] = response.data
        }
        
        return response.data
      } catch (err: any) {
        this.error = err.response?.data?.detail || 'Failed to add member'
        throw err
      } finally {
        this.isLoading = false
      }
    },

    async removeMember(teamId: string, userId: string) {
      this.isLoading = true
      this.error = null
      
      try {
        const response = await teamApi.removeMember(teamId, userId)
        const index = this.teams.findIndex((t) => t.teamId === teamId)
        if (index !== -1) {
          this.teams[index] = response.data
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
