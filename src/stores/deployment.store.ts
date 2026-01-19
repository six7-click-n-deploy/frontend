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
  assignments: [],
  
  // --- WICHTIG: Diese müssen mit dem Interface übereinstimmen ---
  version: 'latest', 
  variables: {},     // Behebt den TS-Fehler "Property variables missing"
  userInputVar: '',  // Behebt den TS-Fehler "Property userInputVar missing"
  groupNames: [],
  variableDefinitions: [] as AppVariable[] // speichert die API-Definitionen für die Variablen
}

export const useDeploymentStore = defineStore('deployment', {
  state: () => ({
    deployments: [] as Deployment[],

    // --- NEU: Map für die Status-Tasks ---
    // Key ist die deploymentId, Value ist der aktuellste deploy-Task
    deploymentTasks: {} as Record<string, any>,

    currentDeployment: null as DeploymentWithRelations | null,
    isLoading: false,
    error: null as string | null,

    // Der Wizard-Status (Draft)
    draft: JSON.parse(JSON.stringify(defaultDraft)) as DeploymentDraft,

    // Globaler Cache für Studenten und Kurse (userId/courseId → Objekt)
    studentCache: new Map<string, any>(),
    courseCache: new Map<string, any>(),
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
        const response = await deploymentApi.list(params)
        this.deployments = response.data
      } catch (err: any) {
        this.error = err.response?.data?.detail || 'Failed to fetch deployments'
      } finally {
        this.isLoading = false
      }
    },

    async fetchDeploymentById(id: string) {
      this.isLoading = true; this.error = null
      try {
        const response = await deploymentApi.getById(id)
        this.currentDeployment = response.data
      } catch (err: any) {
        this.error = err.response?.data?.detail || 'Failed to fetch deployment'
      } finally {
        this.isLoading = false
      }
    },

    async createDeployment(data: DeploymentCreate) {
      this.isLoading = true; this.error = null
      try {
        const response = await deploymentApi.create(data)
        this.deployments.push(response.data)
        return response.data
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
        const index = this.deployments.findIndex((d: any) => d.deploymentId === deploymentId)
        if (index !== -1) this.deployments[index] = deployment
        return deployment
      } catch (err: any) {
        this.error = err.response?.data?.detail || 'Failed to update status'
        throw err
      }
    },

    async deleteDeployment(id: string) {
      this.isLoading = true; this.error = null
      try {
        await deploymentApi.delete(id)
        this.deployments = this.deployments.filter((d: any) => d.deploymentId !== id)
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

      // Teams: Array<{ name: string, userIds: string[] }>
      let teams: Array<{ name: string; userIds: string[] }> = []
      if (Array.isArray(this.draft.groupNames) && Array.isArray(this.draft.assignments)) {
        // assignments: Record<number, string[]>; groupNames: string[]
        teams = this.draft.groupNames.map((name: string, idx: number) => ({
          name,
          userIds: Array.isArray((this.draft.assignments as any)[idx]) ? (this.draft.assignments as any)[idx] : []
        }))
      }

      // userInputVar: { packer: {...}, terraform: {...} }
      let userInputVarObj: any = { packer: {}, terraform: {} }
      if (this.draft.variables && typeof this.draft.variables === 'object') {
        // VariableDefinitions enthält Info, ob packer/terraform
        if (Array.isArray(this.draft.variableDefinitions)) {
          for (const def of this.draft.variableDefinitions) {
            const val = this.draft.variables[def.name]
            if (def.source === 'packer') userInputVarObj.packer[def.name] = val
            else if (def.source === 'terraform') userInputVarObj.terraform[def.name] = val
          }
        } else {
          // Fallback: alles in terraform
          userInputVarObj.terraform = { ...this.draft.variables }
        }
      }

      const payload: any = {
        name: this.draft.name,
        appId: this.draft.appId,
        releaseTag: finalVersion,
        userInputVar: JSON.stringify(userInputVarObj),
        teams
      }

      console.log('[submitDraft] Sending Payload:', payload)

      const response = await this.createDeployment(payload as DeploymentCreate)
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