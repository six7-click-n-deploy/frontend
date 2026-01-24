<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useDeploymentStore } from '@/stores/deployment.store'
import { useAppStore } from '@/stores/app.store'
import { useToastStore } from '@/stores/toast.store'
import { BarChart3, ArrowRight } from 'lucide-vue-next'
import type { AppVariable } from '@/types'

const { t } = useI18n()
const router = useRouter()
const deploymentStore = useDeploymentStore()
const appStore = useAppStore()
const toastStore = useToastStore()

// State für die dynamischen Variablen
const isLoadingVariables = ref(false)
const appVariables = ref<AppVariable[]>([])

// --- 1. Die gewählte App finden ---
const selectedApp = computed(() => {
  return appStore.apps.find(a => a.appId === deploymentStore.draft.appId)
})

// --- 2. Variablen laden & Draft synchronisieren ---
const fetchAndSyncVariables = async () => {
  if (!selectedApp.value?.appId) return

  isLoadingVariables.value = true
  
  try {
    // FIX: Wir nutzen ': any', damit TypeScript nicht meckert, 
    // wenn wir gleich auf Eigenschaften wie .name zugreifen.
    const rawTag: any = deploymentStore.draft.releaseTag
    
    let versionString = 'latest'

    // Prüfung: Ist es ein Objekt (wie in deinem Log) oder ein String?
    if (rawTag && typeof rawTag === 'object' && rawTag.name) {
      // Fall A: Objekt -> Wir nehmen den Namen
      versionString = rawTag.name 
    } else if (typeof rawTag === 'string' && rawTag.trim() !== '') {
      // Fall B: Es ist schon ein String
      versionString = rawTag
    }

    console.log(`DEBUG: Sende saubere Version '${versionString}' an API`)

    // 2. API Aufruf
    const variables = await appStore.fetchAppVariables(selectedApp.value.appId, versionString)
    
    appVariables.value = variables

    // 3. Draft befüllen
    const draft: any = deploymentStore.draft 
    if (!draft.variables) draft.variables = {}

    variables.forEach((variable: AppVariable) => {
      if (draft.variables[variable.name] === undefined && variable.default !== undefined) {
        draft.variables[variable.name] = variable.default
      }
    })

  } catch (error: any) {
    console.error('API Error:', error)
    
    // Fehlerbehandlung für Toast
    let msg = 'Fehler beim Laden der Variablen'
    if (error.response?.status === 500) {
        msg = 'Server Fehler (500). Vermutlich wurde die variables.tf nicht gefunden.'
    } else if (error.response?.status === 422) {
        msg = 'Ungültiges Format der Version gesendet.'
    }
    
    toastStore.addToast({
      message: msg,
      type: 'error'
    })
  } finally {
    isLoadingVariables.value = false
  }
}

// Beim Laden der Seite ausführen
onMounted(() => {
  fetchAndSyncVariables()
})

// --- 3. Die Liste für die Anzeige berechnen ---
const configDetails = computed(() => {
  // A. Statische Infos aus dem Deployment-Wizard (nicht aus variables.tf)
  const vmCount = deploymentStore.draft.groupCount || 1
  const mode = deploymentStore.draft.groupMode

  let accountText = ''
  if (mode === 'one') accountText = 'Ein gemeinsamer Admin-Account'
  else if (mode === 'eachUser') accountText = 'Pro Studierendem ein Benutzer'
  else accountText = 'Individuelle Zuweisung'

  const baseDetails = [
    { label: 'VM Anzahl', value: vmCount.toString() },
    { label: 'Account Modus', value: accountText },
  ]

  // B. Dynamische Variablen (aus variables.tf)
  const dynamicDetails = appVariables.value.map(v => {
    // Wert aus Draft holen (dank sync oben sollte der Default drin stehen)
    let val = deploymentStore.draft.variables?.[v.name]
    
    // Fallback nur für die Anzeige (sollte eigentlich nicht greifen)
    if (val === undefined) val = v.default

    // Schöne Formatierung für Booleans und Listen
    if (typeof val === 'boolean') val = val ? 'Ja' : 'Nein'
    if (Array.isArray(val)) val = val.join(', ')
    if (val === null || val === '') val = '-'

    // Label formatieren: "instance_flavor" -> "instance flavor"
    const label = v.name.replace(/_/g, ' ')

    return {
      label: label, 
      value: val?.toString() || '-' 
    }
  })

  // Beides zusammenfügen
  return [...baseDetails, ...dynamicDetails]
})

// --- Actions ---
const handleCustomize = () => {
  // TODO: Hier könntest du zu einer View navigieren, die die Variablen editierbar macht
  toastStore.addToast({
      message: 'Feature "Variablen anpassen" ist noch nicht implementiert.',
      type: 'info'
  })
}

const handleDeploy = async () => {
  try {
    const deployment = await deploymentStore.submitDraft()

    // Prüfen ob Deployment erfolgreich angelegt wurde
    if (deployment?.deploymentId) {
      toastStore.addToast({
        message: `Deployment "${deployment.name}" wurde erfolgreich angelegt`,
        type: 'success',
      })
      await router.push({ name: 'deployments.list' })
    } else {
      throw new Error('Deployment ohne ID zurückgegeben')
    }

  } catch (error: any) {
    toastStore.addToast({
      message: error?.message ?? 'Deployment konnte nicht erstellt werden',
      type: 'error',
    })
  }
}

const handleBack = () => {
  router.back()
}
</script>

<template>
  <div class="bg-white rounded-2xl p-10 border shadow-sm max-w-5xl mx-auto min-h-[500px] flex flex-col">

    <div class="flex items-center gap-3 mb-8">
      <h1 class="text-3xl font-bold text-gray-900">
        {{ t('deployment.title') }}
      </h1>
      <BarChart3 :size="32" class="text-emerald-600" />
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

      <div v-else class="grid grid-cols-[200px_1fr] gap-y-4 text-gray-800 border-t border-b border-gray-100 py-6">
        
        <template v-for="(item, index) in configDetails" :key="index">
          <div class="font-bold text-gray-900 capitalize flex items-center">
             {{ item.label }}
          </div>

          <div class="text-gray-700 font-medium break-all flex items-center">
            {{ item.value }}
          </div>
        </template>

        <div v-if="configDetails.length === 0" class="col-span-2 text-center text-gray-500 italic">
          Keine Konfigurationsparameter gefunden.
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