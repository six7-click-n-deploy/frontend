<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useDeploymentStore } from '@/stores/deployment.store'
import { useAppStore } from '@/stores/app.store'
import { useToast } from '@/composables/useToast'
import DeploymentProgressBar from '@/components/DeploymentProgressBar.vue'
import { 
  ArrowRight, 
  ArrowLeft,
  Info,
  X,
  Box,
  Layers
} from 'lucide-vue-next'
import type { AppVariable } from '@/types'

const { t } = useI18n()
const router = useRouter()
const deploymentStore = useDeploymentStore()
const appStore = useAppStore()
const toast = useToast()

// --- State ---
const isLoading = ref(false)
const variables = ref<AppVariable[]>([])
const formValues = ref<Record<string, any>>({})
const activeTooltip = ref<string | null>(null)

// --- Helper: Type Checks ---
const isBool = (type: string) => ['bool', 'boolean'].includes(type.toLowerCase())
const isNumber = (type: string) => ['number', 'int', 'integer'].includes(type.toLowerCase())
const isList = (type: string) => type.toLowerCase().startsWith('list') || type.toLowerCase().startsWith('set') || type.toLowerCase().startsWith('array')

const toggleTooltip = (name: string) => {
  if (activeTooltip.value === name) activeTooltip.value = null
  else activeTooltip.value = name
}

const focusInput = (name: string) => {
  const el = document.getElementById(name)
  if (el) el.focus()
}

// --- CORE LOGIC: Normalisierung für Vergleich ---
// Diese Funktion bringt API-Werte und User-Inputs auf denselben Nenner
const normalizeValue = (val: any, type: string) => {
  // 1. Null/Undefined Behandlung
  if (val === null || val === undefined) {
    if (isList(type)) return [] // Leere Liste
    if (isBool(type)) return false
    return "" // Leerer String
  }

  // 2. Listen Behandlung
  if (isList(type)) {
    let arr: any[] = []
    
    if (Array.isArray(val)) {
      arr = val
    } else if (typeof val === 'string') {
      // String splitten, trimmen, leere Einträge entfernen
      arr = val.split(',').map(s => s.trim()).filter(s => s !== '')
    } else {
      // Fallback für Einzelwerte (z.B. wenn API String statt Array schickt)
      arr = [String(val)]
    }
    // Array sortieren, damit Reihenfolge egal ist für Vergleich (optional, aber gut für Sets)
    return JSON.stringify(arr.sort())
  }

  // 3. Zahlen Behandlung
  if (isNumber(type)) {
    if (val === '') return null
    return Number(val)
  }

  // 4. Boolean
  if (isBool(type)) {
    return Boolean(val)
  }

  // 5. String (Standard)
  return String(val).trim()
}

// --- Data Loading ---
onMounted(async () => {
  if (!deploymentStore.draft.appId) {
    router.replace('/apps')
    return
  }

  isLoading.value = true

  try {
    const rawTag: any = deploymentStore.draft.releaseTag
    const version = (typeof rawTag === 'object' && rawTag.version) ? rawTag.version : rawTag || 'latest'
    
    // 1. Variablen laden
    const rawVariables = await appStore.fetchAppVariables(deploymentStore.draft.appId, version)

    // 2. Filtern (Users weg)
    const uniqueVariablesMap = new Map<string, AppVariable>()
    rawVariables.forEach(v => {
      if (v.name.toLowerCase() === 'users') return
      if (!uniqueVariablesMap.has(v.name)) uniqueVariablesMap.set(v.name, v)
    })
    variables.value = Array.from(uniqueVariablesMap.values())

    // 3. Bestehende Draft-Werte (User Input) laden
    let savedValues: Record<string, any> = {}
    try {
      if (deploymentStore.draft.userInputVar) {
        savedValues = JSON.parse(deploymentStore.draft.userInputVar)
      }
    } catch (e) { console.warn(e) }

    // 4. Formular füllen
    variables.value.forEach(v => {
      let valToSet: any = ''

      // A. Gibt es einen gespeicherten User-Input?
      if (savedValues[v.name] !== undefined) {
        valToSet = savedValues[v.name]
      } 
      // B. Sonst Default von API nehmen
      else if (v.default !== undefined && v.default !== null) {
        valToSet = v.default
      }

      // WICHTIG: Listen für das Textfeld in einen String umwandeln ("a, b")
      // Damit sieht der User das gewohnte Format und wir vermeiden [object Object] Probleme
      if (isList(v.type) && Array.isArray(valToSet)) {
        valToSet = valToSet.join(', ')
      }

      // Fallbacks für leere Felder
      if (valToSet === '' || valToSet === null || valToSet === undefined) {
         if (isBool(v.type)) valToSet = false
         else if (isNumber(v.type)) valToSet = ''
         else valToSet = ''
      }

      formValues.value[v.name] = valToSet
    })

  } catch (error) {
    console.error(error)
    toast.error('Variablen konnten nicht geladen werden.')
  } finally {
    isLoading.value = false
  }
})

// --- Actions ---
const handleNext = () => {
  try {
    const changedValues: Record<string, any> = {}

    variables.value.forEach(v => {
      const currentValueRaw = formValues.value[v.name]
      const defaultValueRaw = v.default

      // 1. Beide Werte durch denselben Fleischwolf drehen (Normalisieren)
      const normalizedCurrent = normalizeValue(currentValueRaw, v.type)
      const normalizedDefault = normalizeValue(defaultValueRaw, v.type)

      // 2. Strikt vergleichen
      // Da normalizeValue bei Listen/Objekten JSON-Strings zurückgibt, reicht ===
      if (normalizedCurrent !== normalizedDefault) {
        
        // Es ist anders! Wir müssen es speichern.
        // Aber: Wir speichern es im "sauberen" Format (Array statt "a,b" String)
        
        let valueToSave = currentValueRaw

        // Listen wieder in echtes Array wandeln für Terraform
        if (isList(v.type) && typeof currentValueRaw === 'string') {
           valueToSave = currentValueRaw.split(',').map(s => s.trim()).filter(s => s !== '')
        }
        else if (isNumber(v.type) && currentValueRaw !== '') {
           valueToSave = Number(currentValueRaw)
        }

        changedValues[v.name] = valueToSave
      }
    })

    deploymentStore.draft.userInputVar = JSON.stringify(changedValues)
    router.push({ name: 'deployment.summary' })
  } catch (e) {
    console.error(e)
    toast.error('Fehler beim Speichern.')
  }
}

const handleBack = () => {
  router.push({ name: 'deployment.grouassignment' })
}
</script>

<template>
  <div class="bg-white rounded-2xl p-10 border shadow-sm max-w-5xl mx-auto min-h-[600px] flex flex-col">

    <div class="mb-6">
      <DeploymentProgressBar :current-step="4" class="mb-8" />
      <div class="text-center">
        <h1 class="text-3xl font-bold text-gray-900">Variablen Konfiguration</h1>
        <p class="text-emerald-600 font-medium mt-2 text-lg">
          App: {{ deploymentStore.draft.name || 'Unbenannt' }}
        </p>
      </div>
    </div>

    <div class="flex-grow w-full max-w-4xl mx-auto mt-6">
      
      <div v-if="isLoading" class="flex flex-col items-center justify-center py-20">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-3"></div>
        <span class="text-gray-400">Lade Variablen...</span>
      </div>

      <div v-else-if="variables.length === 0" class="text-center py-12 text-gray-500 italic bg-gray-50 rounded-xl border border-dashed">
        Diese App benötigt keine speziellen Variablen.
      </div>

      <div v-else class="border-t border-gray-100">
        <div 
          v-for="variable in variables" 
          :key="variable.name" 
          class="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 py-6 border-b border-gray-100 items-start hover:bg-gray-50/50 transition-colors px-4 -mx-4 rounded-lg relative"
        >
          <div class="relative"> 
            <div class="flex items-center gap-2 mb-1">
              <label 
                :for="variable.name" 
                @click.prevent="focusInput(variable.name)"
                class="text-lg font-bold text-gray-900 cursor-pointer hover:text-emerald-700 transition-colors"
              >
                {{ variable.name }}
              </label>

              <button 
                v-if="variable.description || isList(variable.type)"
                @click.stop="toggleTooltip(variable.name)"
                class="text-gray-400 hover:text-emerald-600 transition-colors focus:outline-none p-1 rounded-full hover:bg-emerald-50"
                :class="activeTooltip === variable.name ? 'text-emerald-600 bg-emerald-50' : ''"
                title="Info anzeigen"
              >
                <Info :size="18" />
              </button>
            </div>
            
            <div 
              v-if="activeTooltip === variable.name"
              class="absolute left-0 top-full mt-2 z-20 w-72 bg-white p-4 rounded-xl shadow-xl border border-gray-200 animate-in fade-in slide-in-from-top-2 duration-200"
            >
              <div class="flex justify-between items-start mb-2">
                <span class="text-xs font-bold text-gray-400 uppercase tracking-wider">Info</span>
                <button @click="activeTooltip = null" class="text-gray-400 hover:text-gray-600">
                  <X :size="14" />
                </button>
              </div>
              <p v-if="variable.description" class="text-sm text-gray-600 leading-relaxed mb-2">
                {{ variable.description }}
              </p>
              <div v-if="isList(variable.type)" class="bg-emerald-50 p-2 rounded-lg border border-emerald-100 flex gap-2 items-start mt-1">
                 <Info :size="14" class="text-emerald-600 mt-0.5 shrink-0" />
                 <span class="text-xs text-emerald-800 font-medium leading-snug">
                   Mehrere Werte bitte mit Komma trennen.
                 </span>
              </div>
              <div class="absolute -top-2 left-6 w-4 h-4 bg-white border-t border-l border-gray-200 transform rotate-45"></div>
            </div>

            <div class="flex flex-wrap items-center gap-2 mb-2">
              <span v-if="variable.source === 'packer'" class="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                <Box :size="10" /> Packer
              </span>
              <span v-else class="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">
                <Layers :size="10" /> Terraform
              </span>
              <span class="text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200">
                {{ variable.type }}
              </span>
              <span v-if="variable.required" class="text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 px-2 py-0.5 rounded border border-red-200">
                Pflichtfeld
              </span>
            </div>
          </div>

          <div class="flex flex-col justify-center min-h-[40px]">
            
            <div v-if="isBool(variable.type)" class="flex items-center gap-3">
              <button 
                @click="formValues[variable.name] = !formValues[variable.name]"
                class="relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                :class="formValues[variable.name] ? 'bg-emerald-500' : 'bg-gray-300'"
              >
                <span 
                  class="inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm"
                  :class="formValues[variable.name] ? 'translate-x-6' : 'translate-x-1'"
                />
              </button>
              <span class="text-sm font-medium text-gray-700">
                {{ formValues[variable.name] ? 'Aktiviert' : 'Deaktiviert' }}
              </span>
            </div>

            <input 
              v-else-if="isNumber(variable.type)"
              v-model.number="formValues[variable.name]"
              type="number"
              :id="variable.name"
              class="w-full max-w-md px-4 py-2.5 rounded-lg border-2 border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50/50 outline-none transition-all font-medium text-gray-800"
              placeholder="0"
            />

            <div v-else-if="isList(variable.type)">
              <textarea 
                v-model="formValues[variable.name]"
                :id="variable.name"
                rows="3"
                class="w-full px-4 py-2.5 rounded-lg border-2 border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50/50 outline-none transition-all font-mono text-sm text-gray-800"
                placeholder="Wert 1, Wert 2"
              ></textarea>
            </div>

            <input 
              v-else
              v-model="formValues[variable.name]"
              type="text"
              :id="variable.name"
              class="w-full px-4 py-2.5 rounded-lg border-2 border-gray-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50/50 outline-none transition-all font-medium text-gray-800"
              :placeholder="variable.default ? `Standard: ${variable.default}` : 'Wert eingeben...'"
            />
          </div>
        </div>
      </div>
    </div>

    <div class="flex justify-between items-center mt-12 pt-6 border-t border-gray-100">
      <button 
        @click="handleBack"
        class="flex items-center gap-2 px-6 py-2.5 rounded-full text-gray-500 font-semibold hover:text-gray-900 hover:bg-gray-100 transition-colors"
      >
        <ArrowLeft :size="18" />
        {{ t('deployment.actions.back') }}
      </button>
      
      <button 
        @click="handleNext"
        class="flex items-center gap-2 px-8 py-2.5 rounded-full bg-emerald-50 text-emerald-700 font-bold hover:bg-emerald-100 transition-colors border border-emerald-200 shadow-sm"
      >
        <span>Speichern & Weiter</span>
        <ArrowRight :size="18" />
      </button>
    </div>

  </div>
</template>