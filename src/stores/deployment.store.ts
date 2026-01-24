import { defineStore } from 'pinia'
import { deploymentApi } from '@/api/deployment.api'
import { useAppStore } from './app.store'
import { useAuthStore } from './auth.store' // Import nach oben gezogen (Best Practice)

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
  
  // --- NEU: Initiale Werte für die API-Variablen ---
  version: 'latest', // Behebt den TS-Fehler "Property version missing"
  variables: {},     // Behebt den TS-Fehler bei variables[...] = ...
  
  // Alte Felder (falls noch benötigt, sonst optional entfernen)
  userInputVar: '', 
  groupNames: [] 
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
    draftAppDetails: (state) => {
      const appStore = useAppStore()
      if (!state.draft.appId) return null
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

      // Falls version im Draft gesetzt ist, nutzen wir sie, sonst releaseTag oder 'latest'
      const finalReleaseTag = this.draft.version || this.draft.releaseTag || 'latest'

      // Payload zusammenbauen
      const payload: any = {
        appId: this.draft.appId,
        name: this.draft.name,
        releaseTag: finalReleaseTag,
        
        // Wir serialisieren alle Wizard-Daten in userInputVar (wie vom Backend erwartet)
        userInputVar: JSON.stringify({
            // Basis Config
            courseIds: this.draft.courseIds,
            studentIds: this.draft.studentIds,
            
            // Gruppen Logik
            groupMode: this.draft.groupMode,
            groupCount: this.draft.groupCount,
            assignments: this.draft.assignments,
            groupNames: this.draft.groupNames,

            // WICHTIG: Hier fügen wir die geladenen Terraform-Variablen hinzu
            variables: this.draft.variables 
        })
      }

      // 🔽 API CALL
      const response = await this.createDeployment(
        payload as DeploymentCreate
      )

      console.log('[submitDraft] createDeployment response:', response)
      
      // 🔁 Response weiterreichen
      return response
    }
  },
})