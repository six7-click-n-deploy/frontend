import { defineStore } from 'pinia'
import { deploymentApi } from '@/api/deployment.api'
import { useAppStore } from './app.store'
import { useAuthStore } from './auth.store'

import type {
  Deployment,
  DeploymentWithRelations,
  DeploymentCreate,
  DeploymentStatus,
  DeploymentDraft
} from '@/types'

// Standard-Werte für den Reset des Wizards
const defaultDraft: DeploymentDraft = {
  appId: null,
  name: '',
  releaseTag: '',
  courseIds: [], 
  studentIds: [],
  groupMode: 'one',
  groupCount: 1,
  assignments: {},
  
  // --- WICHTIG: Diese müssen mit dem Interface übereinstimmen ---
  version: 'latest', 
  variables: {},     // Behebt den TS-Fehler "Property variables missing"
  userInputVar: '',  // Behebt den TS-Fehler "Property userInputVar missing"
  groupNames: [] 
}

export const useDeploymentStore = defineStore('deployment', {
  state: () => ({
    deployments: [] as Deployment[],
    currentDeployment: null as DeploymentWithRelations | null,
    isLoading: false,
    error: null as string | null,

    // Der Wizard-Status (Draft)
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
    // --- 1. API Actions ---

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

    // --- 2. Wizard Actions ---

    resetDraft() {
      this.draft = JSON.parse(JSON.stringify(defaultDraft))
    },

    async submitDraft() {
      if (!this.draft.appId || !this.draft.name) {
        throw new Error("App und Name sind Pflichtfelder")
      }

      // VERSION FIX: String sicherstellen
      const rawTag: any = this.draft.releaseTag
      let finalVersion = 'latest'

      if (rawTag && typeof rawTag === 'object') {
        // Falls Objekt: Nimm .version oder .name (je nachdem was deine API liefert)
        finalVersion = rawTag.version || rawTag.name || 'latest'
      } else if (typeof rawTag === 'string' && rawTag.trim() !== '') {
        finalVersion = rawTag
      }

      const payload: any = {
        appId: this.draft.appId,
        name: this.draft.name,
        releaseTag: finalVersion, // Hier landet jetzt sauber der String "v1.0.0"
        
        userInputVar: JSON.stringify({
            courseIds: this.draft.courseIds,
            studentIds: this.draft.studentIds,
            groupMode: this.draft.groupMode,
            groupCount: this.draft.groupCount,
            assignments: this.draft.assignments,
            groupNames: this.draft.groupNames,
            
            // Hier übergeben wir die fertig gemergten Variablen
            variables: this.draft.variables 
        })
      }

      console.log('[submitDraft] Sending Payload:', payload)

      const response = await this.createDeployment(payload as DeploymentCreate)
      return response
    }
  },
})