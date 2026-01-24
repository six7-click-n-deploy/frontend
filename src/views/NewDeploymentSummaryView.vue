<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useDeploymentStore } from '@/stores/deployment.store'
import { useAppStore } from '@/stores/app.store'
import { useToastStore } from '@/stores/toast.store'
import { 
  BarChart3, 
  ArrowRight, 
  Box,      // Icon für Packer/System
  Layers,   // Icon für Terraform
  User      // Icon für Custom Input
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

// --- 1. Lade-Logik & Merge (API + User Input) ---
const fetchAndSyncVariables = async () => {
  if (!selectedApp.value?.appId) return

  isLoadingVariables.value = true
  
  try {
    // A. Version sicherstellen (String vs Objekt Fix)
    const rawTag: any = deploymentStore.draft.releaseTag
    let versionString = 'latest'
    // Prüfen ob es ein Objekt ist (aus der App-Auswahl) oder schon ein String
    if (rawTag && typeof rawTag === 'object' && rawTag.version) {
      versionString = rawTag.version 
    } else if (typeof rawTag === 'string' && rawTag.trim() !== '') {
      versionString = rawTag
    }

    // B. API Variablen laden (Offizielle Definition)
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

    // E. Merge: Erst Defaults, dann User Input drüberschreiben

    // 1. Defaults aus API setzen (nur wenn noch nichts an der Stelle steht)
    variables.forEach((v) => {
      if (deploymentStore.draft.variables![v.name] === undefined && v.default !== undefined) {
        deploymentStore.draft.variables![v.name] = v.default
      }
    })

    // 2. User Input erzwingen (schreibt auch neue/unbekannte Keys rein!)
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

// --- 2. Anzeige-Logik (Master-Liste aller Variablen mit Source-Erkennung) ---
const configDetails = computed(() => {
  // A. Statische Basis-Daten
  const vmCount = deploymentStore.draft.groupCount || 1
  const mode = deploymentStore.draft.groupMode
  const accountText = mode === 'one' ? 'Ein gemeinsamer Admin-Account' 
                    : mode === 'eachUser' ? 'Pro Studierendem ein Benutzer' 
                    : 'Individuelle Zuweisung'

  // Version für Anzeige extrahieren
  const rawTag: any = deploymentStore.draft.releaseTag
  let versionDisplay = 'latest'
  if (rawTag && typeof rawTag === 'object' && rawTag.version) versionDisplay = rawTag.version
  else if (typeof rawTag === 'string' && rawTag.trim() !== '') versionDisplay = rawTag

  // Basis-Array initialisieren
  const result = [
    { label: 'Version', value: versionDisplay, source: 'system' },
    { label: 'VM Anzahl', value: vmCount.toString(), source: 'system' },
    { label: 'Account Modus', value: accountText, source: 'system' },
  ]

  // B. ALLE Keys sammeln (aus API UND aus dem aktuellen Draft/Input)
  const allKeys = new Set<string>()

  // 1. Keys aus der API Definition
  appVariables.value.forEach(v => allKeys.add(v.name))
  
  // 2. Keys aus dem Draft (hier stecken deine Custom Variablen drin)
  if (deploymentStore.draft.variables) {
    Object.keys(deploymentStore.draft.variables).forEach(k => allKeys.add(k))
  }

  // C. Liste bauen
  const sortedKeys = Array.from(allKeys).sort() // Alphabetisch sortieren

  sortedKeys.forEach(key => {
    // Prüfen: Ist das eine offizielle Variable aus der API?
    const apiDef = appVariables.value.find(v => v.name === key)
    
    // Wert holen: Prio 1: Draft (User Input), Prio 2: Default
    let val = deploymentStore.draft.variables?.[key]
    if (val === undefined && apiDef) val = apiDef.default

    // Formatierung (Boolean, Arrays, Empty)
    if (typeof val === 'boolean') val = val ? 'Ja' : 'Nein'
    if (Array.isArray(val)) val = val.join(', ')
    if (val === null || val === undefined || val === '') val = '-'

    // Quelle bestimmen (für das Badge)
    let source = 'custom'
    if (apiDef) {
        // Falls dein Backend später "source": "packer" liefert, wird das hier genutzt.
        // Aktuell fallbacken wir auf 'terraform' für alle API Variablen.
        source = apiDef.source || 'terraform'
    }

    // Label aufhübschen
    let displayLabel = key
    if (apiDef) {
        displayLabel = key.replace(/_/g, ' ')
    }

    result.push({
      label: displayLabel,
      value: val.toString(),
      source: source // 'terraform', 'packer', 'custom', 'system'
    })
  })

  return result
})

// --- Actions ---
const handleCustomize = () => {
  // Zurück zum Step 2 (Variablen Input), falls man was ändern will
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
  }
}

const handleBack = () => router.back()
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
          <div class="font-bold text-gray-900 capitalize flex items-center gap-2">
             {{ item.label }}
             
             <span v-if="item.source === 'packer'" title="Aus Packer Template"
                   class="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200 flex items-center gap-1 h-5">
                <Box :size="10" /> Packer
             </span>
             <span v-else-if="item.source === 'terraform'" title="Aus Terraform Variables"
                   class="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200 flex items-center gap-1 h-5">
                <Layers :size="10" /> TF
             </span>
             <span v-else-if="item.source === 'custom'" title="Eigene Variable (User Input)"
                   class="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded border border-yellow-200 flex items-center gap-1 h-5">
                <User :size="10" /> User
             </span>
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