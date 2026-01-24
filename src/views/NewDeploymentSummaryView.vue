<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
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
  Box,      
  Layers,   
  User      
} from 'lucide-vue-next'
import type { AppVariable } from '@/types'
import type { AppVariable } from '@/types'

const { t } = useI18n()
const router = useRouter()
const deploymentStore = useDeploymentStore()
const appStore = useAppStore()
const toastStore = useToastStore()

// State
const isLoadingVariables = ref(false)
const appVariables = ref<AppVariable[]>([])

// State
const isLoadingVariables = ref(false)
const appVariables = ref<AppVariable[]>([])

const selectedApp = computed(() => {
  return appStore.apps.find(a => a.appId === deploymentStore.draft.appId)
})

// --- 1. Lade-Logik & Merge (API + User Input) ---
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

// --- 2. Anzeige-Logik ---
const configDetails = computed(() => {
  const vmCount = deploymentStore.draft.groupCount || 1
  const mode = deploymentStore.draft.groupMode
  const accountText = mode === 'one' ? 'Ein gemeinsamer Admin-Account' 
                    : mode === 'eachUser' ? 'Pro Studierendem ein Benutzer' 
                    : 'Individuelle Zuweisung'

  const rawTag: any = deploymentStore.draft.releaseTag
  let versionDisplay = 'latest'
  if (rawTag && typeof rawTag === 'object' && rawTag.version) versionDisplay = rawTag.version
  else if (typeof rawTag === 'string' && rawTag.trim() !== '') versionDisplay = rawTag

  const result = [
    { label: 'Version', value: versionDisplay, source: 'system' },
    { label: 'VM Anzahl', value: vmCount.toString(), source: 'system' },
    { label: 'Account Modus', value: accountText, source: 'system' },
  ]

  const allKeys = new Set<string>()
  appVariables.value.forEach(v => allKeys.add(v.name))
  
  if (deploymentStore.draft.variables) {
    Object.keys(deploymentStore.draft.variables).forEach(k => allKeys.add(k))
  }

  const sortedKeys = Array.from(allKeys).sort()

  sortedKeys.forEach(key => {
    const apiDef = appVariables.value.find(v => v.name === key)
    
    let val = deploymentStore.draft.variables?.[key]
    if (val === undefined && apiDef) val = apiDef.default

    if (typeof val === 'boolean') val = val ? 'Ja' : 'Nein'
    if (Array.isArray(val)) val = val.join(', ')
    if (val === null || val === undefined || val === '') val = '-'

    let source = 'custom'
    if (apiDef) {
        source = apiDef.source || 'terraform'
    }

    let displayLabel = key
    if (apiDef) {
        displayLabel = key.replace(/_/g, ' ')
    }

    result.push({
      label: displayLabel,
      value: val.toString(),
      source: source
    })
  })

  return result
})

// --- Actions ---
const handleCustomize = () => {
  router.push({ name: 'deployment.vars' }) 
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

const handleBack = () => router.back()
</script>

<template>
  <div class="bg-white rounded-2xl p-10 border shadow-sm max-w-5xl mx-auto min-h-[500px] flex flex-col">

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

    <div class="text-center mb-10">
      <h2 class="text-xl font-bold text-gray-900">
        {{ t('deployment.summary.title') }}
      </h2>
      <p class="text-emerald-600 font-medium mt-2" v-if="selectedApp">
        App: {{ selectedApp.name }}
      </p>
    </div>

    <div class="flex-grow max-w-3xl mx-auto w-full">

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
                {{
                  (deploymentStore.studentCache.get(studentId)?.firstName || deploymentStore.studentCache.get(studentId)?.lastName)
                    ? `${deploymentStore.studentCache.get(studentId)?.firstName || ''} ${deploymentStore.studentCache.get(studentId)?.lastName || ''}`.trim()
                    : (deploymentStore.studentCache.get(studentId)?.username || deploymentStore.studentCache.get(studentId)?.email || studentId)
                }}
              </span>
            </div>
          </div>
      </div>

          <div class="text-gray-700 font-medium break-all flex items-center">
            {{ item.value }}
          </div>
        </template>

        <div v-if="configDetails.length === 0" class="col-span-2 text-center text-gray-500 italic">
          Keine Konfigurationsparameter gefunden.
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
                {{
                  (deploymentStore.studentCache && deploymentStore.studentCache.get(studentId)?.firstName || deploymentStore.studentCache.get(studentId)?.lastName)
                    ? `${deploymentStore.studentCache.get(studentId)?.firstName || ''} ${deploymentStore.studentCache.get(studentId)?.lastName || ''}`.trim()
                    : (deploymentStore.studentCache && (deploymentStore.studentCache.get(studentId)?.username || deploymentStore.studentCache.get(studentId)?.email) || studentId)
                }}
              </div>
              <p v-if="!assignments || assignments.length === 0" class="text-xs text-gray-400 italic">Keine User zugewiesen</p>
            </div>
          </div>
        </div>
      </div>

      <div class="flex justify-end mt-8" v-if="!isLoadingVariables">
        <button @click="handleCustomize"
          class="flex items-center gap-2 px-6 py-2 rounded-full bg-emerald-50 text-emerald-700 font-bold hover:bg-emerald-100 transition-colors border border-emerald-100">
          <ArrowRight :size="18" />
          {{ t('deployment.summary.customize') }}
        </button>
      </div>

    </div>

    <div class="flex justify-between items-center mt-8 pt-4 border-t border-gray-100">
      <button @click="handleBack"
        class="px-8 py-2.5 rounded-full bg-gray-400 text-white font-semibold hover:bg-gray-500 transition-colors">
        {{ t('deployment.actions.back') }}
      </button>

      <button @click="handleDeploy"
        :disabled="isLoadingVariables || deploymentStore.isLoading"
        class="px-8 py-2.5 rounded-full bg-emerald-700 text-white font-bold hover:bg-emerald-800 transition-colors shadow-lg shadow-emerald-700/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
        
        <span v-if="deploymentStore.isLoading" class="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
        <span v-if="deploymentStore.isLoading">Wird erstellt...</span>
        <span v-else>{{ t('deployment.actions.deploy') }}</span>
      </button>
    </div>

  </div>
</template>