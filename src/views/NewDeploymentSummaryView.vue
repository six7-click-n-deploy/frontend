<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useDeploymentStore } from '@/stores/deployment.store'
import { useAppStore } from '@/stores/app.store'
import { useToastStore } from '@/stores/toast.store'
import DeploymentProgressBar from '@/components/DeploymentProgressBar.vue' // Import ist schon da ✅
import { 
  BarChart3, 
  ArrowRight,
  ArrowLeft,
  Box,      
  Layers
} from 'lucide-vue-next'
import type { AppVariable } from '@/types'

const { t } = useI18n()
const router = useRouter()
const deploymentStore = useDeploymentStore()
const appStore = useAppStore()
const toastStore = useToastStore()

// State
const isLoadingVariables = ref(false)
const appVariables = ref<AppVariable[]>([])

const selectedApp = computed(() => {
  return appStore.apps.find(a => a.appId === deploymentStore.draft.appId)
})

// Version Display
const versionDisplay = computed(() => {
  const rawTag: any = deploymentStore.draft.releaseTag
  if (rawTag && typeof rawTag === 'object' && rawTag.version) return rawTag.version
  if (typeof rawTag === 'string' && rawTag.trim() !== '') return rawTag
  return 'latest'
})

// Group Mode Display
const groupModeDisplay = computed(() => {
  const mode = deploymentStore.draft.groupMode
  if (mode === 'one') return t('deployment.groups.one')
  if (mode === 'eachUser') return t('deployment.groups.eachUser')
  return t('deployment.groups.custom')
})

// Getrennte Listen für Packer und Terraform Variablen
const packerVars = computed(() => {
  const currentVars = deploymentStore.draft.variables || {}
  const defs = deploymentStore.draft.variableDefinitions || []
  const result: Array<{label: string, value: string}> = []
  defs.forEach(apiDef => {
    if (
      apiDef.source === 'packer' ||
      apiDef.source === 'image' ||
      apiDef.name.toLowerCase().includes('image')
    ) {
      const val = currentVars[apiDef.name] !== undefined ? currentVars[apiDef.name] : apiDef.default
      result.push({
        label: apiDef.name,
        value: formatValue(val)
      })
    }
  })
  return result
})

const terraformVars = computed(() => {
  const currentVars = deploymentStore.draft.variables || {}
  const defs = deploymentStore.draft.variableDefinitions || []
  const result: Array<{label: string, value: string}> = []
  defs.forEach(apiDef => {
    if (apiDef.source === 'terraform') {
      const val = currentVars[apiDef.name] !== undefined ? currentVars[apiDef.name] : apiDef.default
      result.push({
        label: apiDef.name,
        value: formatValue(val)
      })
    }
  })
  return result
})

// Helper zum Formatieren der Werte
const formatValue = (val: any): string => {
  if (typeof val === 'boolean') return val ? 'Ja' : 'Nein'
  if (Array.isArray(val)) return val.map(item => String(item).replace(/^"|"$/g, '')).join(', ')
  if (typeof val === 'string') return val.replace(/^["'\[]+|["'\]]+$/g, '')
  if (val === null || val === undefined || val === '') return '-'
  return String(val)
}

// --- 1. Lade-Logik & Merge ---
const fetchAndSyncVariables = async () => {
  if (!selectedApp.value?.appId) return

  isLoadingVariables.value = true
  
  try {
    // A. Version sicherstellen (String vs Objekt Fix)
    const rawTag: any = deploymentStore.draft.releaseTag
    let versionString = 'latest'
    if (rawTag && typeof rawTag === 'object' && rawTag.version) {
      versionString = rawTag.version 
    } else if (typeof rawTag === 'string' && rawTag.trim() !== '') {
      versionString = rawTag
    }

    // B. API Variablen laden
    const variables = await appStore.fetchAppVariables(selectedApp.value.appId, versionString)
    appVariables.value = variables

    // C. User Input (JSON) parsen
    let userOverrides: Record<string, any> = {}
    try {
      const inputString = deploymentStore.draft.userInputVar
      if (inputString && inputString.trim() !== '') {
        userOverrides = JSON.parse(inputString)
      }
    } catch (e) {
      console.warn('Invalid JSON in userInputVar', e)
    }

    // D. Draft initialisieren
    if (!deploymentStore.draft.variables) {
      deploymentStore.draft.variables = {}
    }

    // E. Merge
    variables.forEach((v) => {
      if (deploymentStore.draft.variables![v.name] === undefined && v.default !== undefined) {
        deploymentStore.draft.variables![v.name] = v.default
      }
    })

    Object.keys(userOverrides).forEach(key => {
       deploymentStore.draft.variables![key] = userOverrides[key]
    })

  } catch (error: any) {
    console.error(error)
    let msg = 'Variablen konnten nicht geladen werden.'
    if (error.response?.status === 500) msg = 'Server Fehler (500). variables.tf nicht gefunden?'
    
    toastStore.addToast({ 
        message: msg, 
        type: 'error' 
    })
  } finally {
    isLoadingVariables.value = false
  }
}

onMounted(() => {
  fetchAndSyncVariables()
})

// --- Actions ---
const handleCustomize = () => {
  // WICHTIG: Hier zur Variablen-Seite navigieren
  router.push({ name: 'deployment.variables' })
}

const handleDeploy = async () => {
  try {
    const deployment = await deploymentStore.submitDraft()
    if (deployment?.deploymentId) {
      toastStore.addToast({ message: `Deployment gestartet`, type: 'success' })
      await router.push({ name: 'deployments.list' })
    }
  } catch (error: any) {
    toastStore.addToast({ message: error?.message ?? 'Fehler', type: 'error' })
    toastStore.addToast({ message: error?.message ?? 'Fehler', type: 'error' })
  }
}

const handleBack = () => {
    // Zurück führt jetzt zur Variablen-Seite (Step 3)
    router.push({ name: 'deployment.variables' })
}
</script>

<template>
  <div class="bg-white rounded-2xl p-10 border shadow-sm max-w-7xl mx-auto min-h-[600px] flex flex-col">

    <div class="mb-8">
      <div class="flex items-center gap-3 mb-6">
        <h1 class="text-3xl font-bold text-gray-900">
          {{ t('deployment.title') }}
        </h1>
        <BarChart3 :size="32" class="text-emerald-600" />
      </div>

      <DeploymentProgressBar :current-step="4" />
      <div class="border-b border-gray-100 mt-4"></div>
    </div>

    <div class="text-center mb-8">
      <h2 class="text-2xl font-bold text-gray-900">
        {{ t('deployment.summary.title') }}
      </h2>
      <p class="text-gray-600 mt-2">Überprüfen Sie alle Einstellungen vor dem Start</p>
    </div>

    <div v-if="isLoadingVariables" class="flex flex-col items-center justify-center py-12 gap-3">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      <span class="text-gray-500 text-sm">Lade Konfiguration...</span>
    </div>

    <div v-else class="flex-grow space-y-6">
      
      <!-- Step 1: Basis-Konfiguration -->
      <div class="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-6 border-2 border-emerald-200">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">1</div>
          <h3 class="text-xl font-bold text-gray-900">Basis-Konfiguration</h3>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="bg-white rounded-lg p-4 border border-emerald-100">
            <p class="text-xs text-gray-500 mb-1 uppercase tracking-wider font-semibold">Deployment Name</p>
            <p class="text-lg font-bold text-gray-900">{{ deploymentStore.draft.name || '-' }}</p>
          </div>
          <div class="bg-white rounded-lg p-4 border border-emerald-100">
            <p class="text-xs text-gray-500 mb-1 uppercase tracking-wider font-semibold">App</p>
            <p class="text-lg font-bold text-emerald-700">{{ selectedApp?.name || '-' }}</p>
          </div>
          <div class="bg-white rounded-lg p-4 border border-emerald-100">
            <p class="text-xs text-gray-500 mb-1 uppercase tracking-wider font-semibold">Version</p>
            <p class="text-lg font-bold text-gray-900">{{ versionDisplay }}</p>
          </div>
        </div>
        <div class="mt-4 bg-white rounded-lg p-4 border border-emerald-100">
          <p class="text-xs text-gray-500 mb-2 uppercase tracking-wider font-semibold">Ausgewählte Studenten ({{ deploymentStore.draft.studentIds.length }})</p>
          <div class="flex flex-wrap gap-2">
            <span v-for="studentId in deploymentStore.draft.studentIds" :key="studentId" 
              class="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm font-medium border border-emerald-200">
              {{ studentId }}
            </span>
          </div>
        </div>
      </div>

      <!-- Step 2: Team-Zuweisung -->
      <div class="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-6 border-2 border-blue-200">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">2</div>
          <h3 class="text-xl font-bold text-gray-900">Team-Zuweisung</h3>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div class="bg-white rounded-lg p-4 border border-blue-100">
            <p class="text-xs text-gray-500 mb-1 uppercase tracking-wider font-semibold">Anzahl Teams</p>
            <p class="text-2xl font-bold text-blue-700">{{ deploymentStore.draft.groupCount }}</p>
          </div>
          <div class="bg-white rounded-lg p-4 border border-blue-100">
            <p class="text-xs text-gray-500 mb-1 uppercase tracking-wider font-semibold">Modus</p>
            <p class="text-lg font-bold text-gray-900">{{ groupModeDisplay }}</p>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div v-for="(assignments, index) in deploymentStore.draft.assignments" :key="index" 
            class="bg-white rounded-lg p-4 border-2 border-blue-200 hover:border-blue-400 transition-colors">
            <div class="flex items-center justify-between mb-3">
              <p class="font-bold text-gray-900">{{ deploymentStore.draft.groupNames[index] || `Team ${index + 1}` }}</p>
              <span class="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
                {{ assignments?.length || 0 }} User
              </span>
            </div>
            <div class="space-y-1 max-h-32 overflow-y-auto">
              <div v-for="studentId in assignments" :key="studentId" 
                class="text-sm text-gray-700 bg-blue-50 px-2 py-1 rounded border border-blue-100">
                {{ studentId }}
              </div>
              <p v-if="!assignments || assignments.length === 0" class="text-xs text-gray-400 italic">Keine User zugewiesen</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Step 3: Variablen-Konfiguration -->
      <div class="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border-2 border-purple-200">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-sm">3</div>
            <h3 class="text-xl font-bold text-gray-900">Variablen-Konfiguration</h3>
          </div>
          <button @click="handleCustomize"
            class="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-100 text-purple-700 font-semibold hover:bg-purple-200 transition-colors border border-purple-300 text-sm">
            <ArrowRight :size="16" />
            Bearbeiten
          </button>
        </div>
        
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <!-- Packer Variables -->
          <div class="bg-white rounded-lg border-2 border-blue-200 overflow-hidden">
            <div class="bg-blue-100 px-4 py-2 border-b border-blue-200 flex items-center gap-2">
              <Box :size="18" class="text-blue-700" />
              <h4 class="font-bold text-blue-900 text-sm">Packer Variablen</h4>
              <span class="ml-auto text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                {{ packerVars.length }}
              </span>
            </div>
            <div class="p-4 space-y-2 max-h-64 overflow-y-auto">
              <div v-for="item in packerVars" :key="item.label" 
                class="flex justify-between items-start gap-3 py-2 border-b border-gray-100 last:border-0">
                <span class="text-sm font-semibold text-gray-700 flex-shrink-0">{{ item.label }}</span>
                <span class="text-sm text-gray-900 font-medium text-right break-all">{{ item.value }}</span>
              </div>
              <p v-if="packerVars.length === 0" class="text-sm text-gray-400 italic text-center py-4">
                Keine Packer Variablen
              </p>
            </div>
          </div>

          <!-- Terraform Variables -->
          <div class="bg-white rounded-lg border-2 border-purple-200 overflow-hidden">
            <div class="bg-purple-100 px-4 py-2 border-b border-purple-200 flex items-center gap-2">
              <Layers :size="18" class="text-purple-700" />
              <h4 class="font-bold text-purple-900 text-sm">Terraform Variablen</h4>
              <span class="ml-auto text-xs bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full font-bold">
                {{ terraformVars.length }}
              </span>
            </div>
            <div class="p-4 space-y-2 max-h-64 overflow-y-auto">
              <div v-for="item in terraformVars" :key="item.label" 
                class="flex justify-between items-start gap-3 py-2 border-b border-gray-100 last:border-0">
                <span class="text-sm font-semibold text-gray-700 flex-shrink-0">{{ item.label }}</span>
                <span class="text-sm text-gray-900 font-medium text-right break-all">{{ item.value }}</span>
              </div>
              <p v-if="terraformVars.length === 0" class="text-sm text-gray-400 italic text-center py-4">
                Keine Terraform Variablen
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>

    <div class="flex justify-between items-center mt-8 pt-6 border-t-2 border-gray-200">
      <button @click="handleBack"
        class="flex items-center gap-2 px-8 py-3 rounded-full bg-gray-100 text-gray-600 font-semibold hover:bg-gray-200 transition-colors">
        <ArrowLeft :size="18" />
        {{ t('deployment.actions.back') }}
      </button>

      <button @click="handleDeploy"
        :disabled="isLoadingVariables || deploymentStore.isLoading"
        class="flex items-center gap-3 px-10 py-3 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-xl shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed">
        
        <span v-if="deploymentStore.isLoading" class="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span>
        <span v-if="deploymentStore.isLoading">Wird erstellt...</span>
        <span v-else class="text-lg">🚀 {{ t('deployment.actions.deploy') }}</span>
      </button>
    </div>

  </div>
</template>