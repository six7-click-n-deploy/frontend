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

    // --- NEU: Map für die Status-Tasks ---
    // Key ist die deploymentId, Value ist der aktuellste deploy-Task
    deploymentTasks: {} as Record<string, any>,

    currentDeployment: null as DeploymentWithRelations | null,
    isLoading: false,
    error: null as string | null,

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
    },

    // =================================================================
    // 3. TASK / STATUS ACTIONS (Neu hinzugefügt)
    // =================================================================

    async fetchStatusForDeployment(deploymentId: string) {
      const { getAccessToken } = useKeycloak()

      try {
        // 1. Hole das Token über die offizielle Composable-Methode
        // getAccessToken() kümmert sich um den UserManager und das korrekte Feld
        const token = await getAccessToken()

        if (!token) {
          console.warn(`[Store] Kein Access Token verfügbar für Deployment ${deploymentId}`)
          return
        }

        // 2. API Call mit dem korrekten Token
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
          // Nur Tasks vom Typ 'deploy' filtern
          const deployTasks = tasks.filter(t => t.type === 'deploy')
          if (deployTasks.length > 0) {
            // Den zeitlich neuesten deploy-Task nehmen
            this.deploymentTasks[deploymentId] = deployTasks[deployTasks.length - 1]
          }
        }
      } catch (err) {
        console.error(`Store: Fehler beim Laden des Status für ${deploymentId}`, err)
      }
    }
  }
})

// Circular Dependency Import am Ende
//import { useAuthStore } from './auth.store'