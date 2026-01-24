import { defineStore } from 'pinia'
import { deploymentApi } from '@/api/deployment.api'
// Wichtig: Wir importieren den AppStore, um im Draft Details zur App anzuzeigen
import { useAppStore } from './app.store'

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
  groupNames: [] // <--- NEU: Damit die Namen beim Reset auch zurückgesetzt werden
}

export const useDeploymentStore = defineStore('deployment', {
  state: () => ({
    // --- Existierende Daten ---
    deployments: [] as Deployment[],
    currentDeployment: null as DeploymentWithRelations | null,
    isLoading: false,
    error: null as string | null,

    // --- Der Wizard-Status (Draft) ---
    // Wir nutzen JSON.parse/stringify für eine tiefe Kopie der Defaults
    draft: JSON.parse(JSON.stringify(defaultDraft)) as DeploymentDraft
  }),

  getters: {
    // Filtert Deployments für den aktuellen User
    myDeployments: (state) => {
      const authStore = useAuthStore()
      return state.deployments.filter((d) => d.userId === authStore.userId)
    },

    // Filtert nach Status
    deploymentsByStatus: (state) => {
      return (status: DeploymentStatus) =>
        state.deployments.filter((d) => d.status === status)
    },

    // Helper um die aktuell gewählte App im Draft zu bekommen
    // Das brauchen wir für die Summary-Seite (Ports, Image, Flavor anzeigen)
    draftAppDetails: (state) => {
      const appStore = useAppStore()
      if (!state.draft.appId) return null
      // Sucht die App im AppStore basierend auf der ID im Draft
      return appStore.apps.find(a => a.appId === state.draft.appId) || null
    }
  },

  actions: {
    // =================================================================
    // 1. STANDARD CRUD ACTIONS (Backend Kommunikation)
    // =================================================================

    async fetchDeployments(params?: { userId?: string; appId?: string; status?: DeploymentStatus }) {
      this.isLoading = true
      this.error = null

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
      this.isLoading = true
      this.error = null

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
      this.isLoading = true
      this.error = null

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
        if (index !== -1) {
          this.deployments[index] = deployment
        }
        return deployment
      } catch (err: any) {
        this.error = err.response?.data?.detail || 'Failed to update deployment status'
        throw err
      }
    },

    async deleteDeployment(deploymentId: string) {
      this.isLoading = true
      this.error = null

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

    // =================================================================
    // 2. WIZARD / DRAFT ACTIONS (Frontend Logik)
    // =================================================================

    // Reset: Wird aufgerufen, wenn man auf "Neues Deployment" klickt
    resetDraft() {
      this.draft = JSON.parse(JSON.stringify(defaultDraft))
    },

    // Absenden: Verwandelt den Draft in ein echtes API-Objekt
    async submitDraft() {
      const appStore = useAppStore()
      // Validierung
      if (!this.draft.appId || !this.draft.name) {
        throw new Error("App und Name sind Pflichtfelder")
      }

      const selectedApp = appStore.apps.find(a => a.appId === this.draft.appId)
      const finalReleaseTag = this.draft.releaseTag || selectedApp?.releaseTag || 'v1.0.1'

      // Payload zusammenbauen
      // Hier packen wir alle Config-Daten (inklusive der neuen groupNames) in userInputVar
      const payload: any = {
        appId: this.draft.appId,
        name: this.draft.name,
        releaseTag: finalReleaseTag,
        userInputVar: JSON.stringify({
           courseIds: this.draft.courseIds,
           studentIds: this.draft.studentIds,
           groupMode: this.draft.groupMode,
           groupCount: this.draft.groupCount,
           assignments: this.draft.assignments,
           groupNames: this.draft.groupNames // <--- HIER: Namen mit senden
        })
      }

      // Wir nutzen die existierende createDeployment Action
      // return await this.createDeployment(payload as DeploymentCreate)
      // 🔽 API CALL
      const response = await this.createDeployment(
        payload as DeploymentCreate
      )


      console.log('[submitDraft] createDeployment response:', response)
      
      return response
    }
  },
})

// Circular Dependency Import am Ende
import { useAuthStore } from './auth.store'