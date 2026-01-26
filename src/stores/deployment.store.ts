import { defineStore } from 'pinia'
import { deploymentApi } from '@/api/deployment.api'
import { useAppStore } from './app.store'
import { useKeycloak } from '@/composables/useKeycloak'
import { useAuthStore } from './auth.store'

import type {
  Deployment,
  DeploymentWithRelations,
  DeploymentCreate,
  DeploymentStatus,
  DeploymentDraft
} from '@/types'

const defaultDraft: DeploymentDraft = {
  appId: null,
  name: '',
  releaseTag: '',
  courseIds: [], 
  studentIds: [],
  groupMode: 'one',
  groupCount: 1,
  assignments: {},
  version: 'latest', 
  variables: {},
  userInputVar: '',
  groupNames: [] 
}

export const useDeploymentStore = defineStore('deployment', {
  state: () => ({
    deployments: [] as Deployment[],

    deploymentTasks: {} as Record<string, any>,

    currentDeployment: null as DeploymentWithRelations | null,
    isLoading: false,
    error: null as string | null,

    draft: JSON.parse(JSON.stringify(defaultDraft)) as DeploymentDraft
  }),

  getters: {
    myDeployments: (state) => {
      const authStore = useAuthStore()
      return state.deployments.filter((d) => d.userId === authStore.userId)
    },

    deploymentsByStatus: (state) => {
      return (status: DeploymentStatus) =>
        state.deployments.filter((d) => d.status === status)
    },

    draftAppDetails: (state) => {
      const appStore = useAppStore()
      if (!state.draft.appId) return null
      return appStore.apps.find(a => a.appId === state.draft.appId) || null
    }
  },

  actions: {
    async fetchDeployments(params?: { userId?: string; appId?: string; status?: DeploymentStatus }) {
      this.isLoading = true; this.error = null
      try {
        const { data } = await deploymentApi.list(params)
        this.deployments = data
      } catch (err: any) {
        this.error = err.response?.data?.detail || 'Failed to fetch deployments'
      } finally {
        this.isLoading = false
      }
    },

    async fetchDeploymentById(deploymentId: string) {
      this.isLoading = true; this.error = null
      try {
        const { data } = await deploymentApi.getById(deploymentId)
        this.currentDeployment = data
      } catch (err: any) {
        this.error = err.response?.data?.detail || 'Failed to fetch deployment'
      } finally {
        this.isLoading = false
      }
    },

    async createDeployment(data: DeploymentCreate) {
      this.isLoading = true; this.error = null
      try {
        const { data: deployment } = await deploymentApi.create(data)
        this.deployments.push(deployment)
        return deployment
      } catch (err: any) {
        this.error = err.response?.data?.detail || 'Failed to create deployment'
        throw err
      } finally {
        this.isLoading = false
      }
    },

    async updateDeploymentStatus(deploymentId: string, status: DeploymentStatus) {
      this.error = null
      try {
        const { data: deployment } = await deploymentApi.updateStatus(deploymentId, status)
        const index = this.deployments.findIndex((d) => d.deploymentId === deploymentId)
        if (index !== -1) this.deployments[index] = deployment
        return deployment
      } catch (err: any) {
        this.error = err.response?.data?.detail || 'Failed to update status'
        throw err
      }
    },

    async deleteDeployment(deploymentId: string) {
      this.isLoading = true; this.error = null
      try {
        await deploymentApi.delete(deploymentId)
        this.deployments = this.deployments.filter((d) => d.deploymentId !== deploymentId)
      } catch (err: any) {
        this.error = err.response?.data?.detail || 'Failed to delete deployment'
        throw err
      } finally {
        this.isLoading = false
      }
    },

    resetDraft() {
      this.draft = JSON.parse(JSON.stringify(defaultDraft))
    },

    async submitDraft() {
      /**
       * Prepare and submit the current draft as a DeploymentCreate payload.
       * - Normalizes `releaseTag` which may come as string or object from UI
       * - Packs wizard selections (courses, groups, variables) into `userInputVar`
       * - Delegates creation to the API and returns the created deployment
       */
      if (!this.draft.appId || !this.draft.name) {
        throw new Error("App und Name sind Pflichtfelder")
      }

      const rawTag: any = this.draft.releaseTag
      let finalVersion = 'latest'

      if (rawTag && typeof rawTag === 'object') {
        finalVersion = rawTag.version || rawTag.name || 'latest'
      } else if (typeof rawTag === 'string' && rawTag.trim() !== '') {
        finalVersion = rawTag
      }

      const payload: any = {
        appId: this.draft.appId,
        name: this.draft.name,
        releaseTag: finalVersion,
        
        userInputVar: JSON.stringify({
            courseIds: this.draft.courseIds,
            studentIds: this.draft.studentIds,
            groupMode: this.draft.groupMode,
            groupCount: this.draft.groupCount,
            assignments: this.draft.assignments,
            groupNames: this.draft.groupNames,
            
            variables: this.draft.variables 
        })
      }


      console.log('[submitDraft] Sending Payload:', payload)

      const response = await this.createDeployment(payload as DeploymentCreate)

      return response
    },

    async fetchStatusForDeployment(deploymentId: string) {
      /**
       * Load the latest task status for a given deployment.
       * Uses the Keycloak access token to call the tasks endpoint and keeps
       * only the most recent task of type 'deploy' for quick status rendering.
       */
      const { getAccessToken } = useKeycloak()

      try {
        const token = await getAccessToken()

        if (!token) {
          console.warn(`[Store] Kein Access Token verfügbar für Deployment ${deploymentId}`)
          return
        }

        const response = await fetch(`http://localhost:8000/tasks/deployment/${deploymentId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        })

        if (!response.ok) {
          if (response.status === 401) console.error("Nicht autorisiert!")
          return
        }

        const tasks = await response.json()

        if (Array.isArray(tasks)) {
          const deployTasks = tasks.filter(t => t.type === 'deploy')
          if (deployTasks.length > 0) {
            this.deploymentTasks[deploymentId] = deployTasks[deployTasks.length - 1]
          }
        }
      } catch (err) {
        console.error(`Store: Fehler beim Laden des Status für ${deploymentId}`, err)
      }
    }
  }
})




