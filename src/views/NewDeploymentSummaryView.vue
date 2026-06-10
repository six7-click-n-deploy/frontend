<script setup lang="ts">
import { userApi } from '@/api/user.api'
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
import {
  ensureLoaded as ensureOsCacheLoaded,
  getDisplayName as getOsDisplayName,
} from '@/composables/useOpenStackResourceCache'

const { t } = useI18n()
const router = useRouter()
const deploymentStore = useDeploymentStore()
const appStore = useAppStore()
const toastStore = useToastStore()

// State
const isLoadingVariables = ref(false)
const appVariables = ref<AppVariable[]>([])
// Lokales Submit-Lock. Verhindert Doppel-Submit zwischen dem ersten
// Klick und dem Moment, in dem der Store ``isLoading`` setzt — dazwischen
// liegt mindestens ein API-Roundtrip (`userApi.list`), genug für einen
// zweiten Klick. Wird auch von der Button-Anzeige gelesen.
const isSubmitting = ref(false)

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

// Getrennte Listen für Packer und Terraform Variablen.
// Reaktivität für Display-Namen kommt aus ``getDisplayName`` — die
// Funktion liest ``cacheVersion.value`` aus dem Cache-Modul, sodass
// Vue automatisch re-computed sobald der Cache befüllt wird.
const packerVars = computed(() => {
  const currentVars = deploymentStore.draft.variables || {}
  const defs = appVariables.value || []
  const result: Array<{label: string, value: string, raw?: string}> = []
  defs.forEach((apiDef: AppVariable) => {
    if (apiDef.source === 'packer') {
      const val = currentVars[apiDef.name] !== undefined ? currentVars[apiDef.name] : apiDef.default
      result.push(toSummaryEntry(apiDef, val))
    }
  })
  return result
})

const terraformVars = computed(() => {
  const currentVars = deploymentStore.draft.variables || {}
  const defs = appVariables.value || []
  const result: Array<{label: string, value: string, raw?: string}> = []
  defs.forEach((apiDef: AppVariable) => {
    // File-Variablen haben einen separaten Renderer unterhalb —
    // das Summary-Strang würde sonst ihren ``default = {}``-Wert
    // anzeigen statt die hochgeladenen Files. Skip + own block.
    if (apiDef.osType === 'file') return
    if (apiDef.source === 'terraform') {
      const val = currentVars[apiDef.name] !== undefined ? currentVars[apiDef.name] : apiDef.default
      result.push(toSummaryEntry(apiDef, val))
    }
  })
  return result
})

/**
 * Files-Sektion der Summary. Eine Karte pro ``@openstack:file:*``-
 * Variable, mit einer Chip-Liste der hochgeladenen Slots — wir zeigen
 * Filename + Größe, NIE den base64-Inhalt. Die Größe formatieren wir
 * in KB/MB damit der Lehrende vor dem Submit ein Gefühl dafür hat,
 * was er gleich an die Plattform schickt.
 */
function _formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

const fileVarSummaries = computed(() => {
  const defs = appVariables.value || []
  const uploads = deploymentStore.draft.fileUploads || {}
  const out: Array<{
    name: string
    scope: 'all' | 'team' | 'user'
    chips: Array<{ slot: string; filename: string; size: string }>
  }> = []
  defs.forEach((apiDef: AppVariable) => {
    if (apiDef.osType !== 'file') return
    const slotMap = uploads[apiDef.name] || {}
    const chips: Array<{ slot: string; filename: string; size: string }> = []
    for (const [slotKey, file] of Object.entries(slotMap)) {
      if (!file) continue
      chips.push({
        slot: slotKey,
        filename: file.name,
        size: _formatBytes(file.size || 0),
      })
    }
    out.push({
      name: apiDef.name,
      scope: (apiDef.osScope || 'all') as 'all' | 'team' | 'user',
      chips,
    })
  })
  return out
})

/**
 * Erzeugt die Summary-Zeile für eine Variable.
 *
 * - Marker-Variablen (osType gesetzt): Wir zeigen IMMER den Display-
 *   Namen aus dem Frontend-Cache. Im id-Mode steht der gespeicherte
 *   Roh-Wert (UUID) zusätzlich als ``title``-Tooltip — Submit-Wert
 *   geht aber unverändert ans Backend.
 * - Plain-Variablen: alter Code-Pfad, Roh-Wert formatieren.
 */
function toSummaryEntry(def: AppVariable, val: any): {label: string, value: string, raw?: string} {
  if (def.osType) {
    const mode = def.osMode || 'name'
    const display = renderOsValue(def.osType, mode, val, !!def.osMulti)
    const rawString = formatValue(val)
    return {
      label: def.name,
      value: display,
      // raw nur mitgeben, wenn er sich vom Display unterscheidet —
      // sonst doppelt sich's im Tooltip
      raw: display !== rawString ? rawString : undefined,
    }
  }
  return { label: def.name, value: formatValue(val) }
}

/**
 * Display-String für einen OS-Marker-Wert. Single → ein Name; Multi →
 * komma-separierte Namen. Fällt auf den Roh-Wert zurück, wenn der Cache
 * (noch) keinen Display-Namen hat — der UUID-Look ist zwar hässlich,
 * aber besser als Leer.
 */
function renderOsValue(
  osType: NonNullable<AppVariable['osType']>,
  mode: 'id' | 'name',
  val: any,
  isMulti: boolean,
): string {
  if (val === null || val === undefined || val === '') return '-'

  // Werte zerlegen — kann String, CSV oder Array sein. Genau wie im
  // Picker.
  let parts: string[] = []
  if (Array.isArray(val)) {
    parts = val.map((v) => String(v).trim()).filter(Boolean)
  } else if (typeof val === 'string') {
    parts = isMulti
      ? val.split(',').map((s) => s.trim()).filter(Boolean)
      : [val.trim()].filter(Boolean)
  } else {
    parts = [String(val)]
  }

  if (parts.length === 0) return '-'

  const names = parts.map((p) => {
    const cached = getOsDisplayName(osType, mode, p)
    if (cached) return cached.name
    return p
  })
  return names.join(', ')
}

// Helper zum Formatieren der Werte
const formatValue = (val: any): string => {
  if (typeof val === 'boolean') return val ? 'Ja' : 'Nein'
  if (Array.isArray(val)) return val.map(item => String(item).replace(/^"|"$/g, '')).join(', ')
  if (typeof val === 'string') return val.replace(/^["'\[]+|["'\]]+$/g, '')
  if (val === null || val === undefined || val === '') return '-'
  return String(val)
}

/**
 * Sorgt dafür, dass der Display-Cache für alle OS-Resource-Types
 * geladen ist, die in den aktuellen Variablen vorkommen. Wird im
 * Mount-Pfad aufgerufen, NACHDEM die Variablen-Definitionen vorliegen.
 *
 * Race-tolerant: ``ensureLoaded`` dedupliziert parallele Aufrufe (wenn
 * z.B. Picker und Summary gleichzeitig laden) — das Backend bekommt
 * trotzdem nur einen Roundtrip pro Type. Computeds, die ``getDisplayName``
 * aufrufen, re-laufen automatisch sobald der Cache aktualisiert wird
 * (siehe ``cacheVersion`` in useOpenStackResourceCache.ts).
 */
async function primeOsDisplayCache(defs: AppVariable[]): Promise<void> {
  const types = new Set<NonNullable<AppVariable['osType']>>()
  for (const def of defs) {
    if (def.osType) types.add(def.osType)
  }
  if (types.size === 0) return
  await Promise.all([...types].map((t) => ensureOsCacheLoaded(t)))
}

// --- 1. Lade-Logik & Merge ---
const fetchAndSyncVariables = async () => {
  console.log('fetchAndSyncVariables called')
  console.log('deploymentStore.draft.appId:', deploymentStore.draft.appId)
  console.log('appStore.apps.length:', appStore.apps.length)

  // Stelle sicher, dass Apps geladen sind
  if (appStore.apps.length === 0) {
    console.log('Loading apps...')
    await appStore.fetchApps()
    console.log('Apps loaded:', appStore.apps.length)
  }

  console.log('selectedApp:', selectedApp.value)

  if (!selectedApp.value?.appId) {
    console.warn('No app selected or app not found')
    return
  }

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

    // B. API Variablen laden — Step 3 (NewDeploymentVariableView) hat sie
    // typischerweise schon im Draft abgelegt. Der Backend-Endpoint klont
    // das App-Repo sparse + parst variables.tf, das kann je nach Git-Latenz
    // mehrere Sekunden dauern. Cache-Hit aus dem Store spart diesen Round-
    // Trip; Fallback bleibt der Fetch (z.B. bei Direkt-Deep-Link).
    let variables: AppVariable[] = []
    const cached = deploymentStore.draft.variableDefinitions
    if (cached && cached.length > 0) {
      variables = cached
    } else {
      try {
        variables = await appStore.fetchAppVariables(selectedApp.value.appId, versionString)
        deploymentStore.draft.variableDefinitions = variables
      } catch (varError) {
        console.warn('Could not load variables:', varError)
        // Fallback: Leere Liste
      }
    }
    appVariables.value = variables || []

    // C. User-Input parsen. ``userInputVar`` kann historisch entweder ein
    // JSON-String oder bereits ein Record sein (Type sagt
    // ``Record<string, any> | string``). Vorher wurde ``.trim()`` blind
    // aufgerufen — das wirft bei Objekten. Saubere Fallunterscheidung:
    let userOverrides: Record<string, any> = {}
    const rawUserInput: any = deploymentStore.draft.userInputVar
    if (rawUserInput && typeof rawUserInput === 'object' && !Array.isArray(rawUserInput)) {
      userOverrides = rawUserInput
    } else if (typeof rawUserInput === 'string' && rawUserInput.trim() !== '') {
      try {
        userOverrides = JSON.parse(rawUserInput)
      } catch (e) {
        console.warn('Invalid JSON in userInputVar', e)
        toastStore.addToast({
          message: 'Eigene Variablenwerte konnten nicht gelesen werden (ungültiges JSON). Standardwerte werden verwendet.',
          type: 'error',
        })
      }
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

    // F. Display-Cache für OS-Marker-Variablen befüllen — damit die
    // Summary-Karten Resource-Namen statt UUIDs zeigen. Asynchron;
    // der initialen Render-Pass zeigt UUIDs, sobald der Cache da ist
    // wird der Tick erhöht und die Computeds rendern Namen nach.
    primeOsDisplayCache(appVariables.value)

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
  // Lokales Lock vor jedem await. Der Store-isLoading-Flag greift erst
  // im Inneren von ``submitDraft`` → bis dahin würde ein zweiter Klick
  // einen zweiten Deployment-Erstellungs-Roundtrip starten.
  if (isSubmitting.value) return
  isSubmitting.value = true

  try {
    // 1) Keycloak-ID → User-ID-Mapping. Wird LOKAL gehalten und NICHT in
    //    den Draft zurückgeschrieben, sonst sind nach einem fehlgeschlagenen
    //    Submit die IDs im Draft mit dem ``studentCache`` (Keycloak-keyed)
    //    nicht mehr kompatibel — Anzeige in Step 2/3 würde brechen.
    let backendUsers: any[] = []
    try {
      const res = await userApi.list()
      backendUsers = res.data || []
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || 'Benutzerliste konnte nicht geladen werden.'
      toastStore.addToast({ message: detail, type: 'error' })
      return
    }

    const keycloakToUserId = new Map<string, string>()
    backendUsers.forEach((u: any) => {
      if (u.keycloak_id) keycloakToUserId.set(u.keycloak_id, u.userId)
      keycloakToUserId.set(u.userId, u.userId) // Fallback: falls schon userId
    })

    // 2) Lokale Kopien der ID-Listen mit übersetzten IDs.
    const sourceAssignments = (deploymentStore.draft.assignments || {}) as Record<number, string[]>
    const mappedAssignments: Record<number, string[]> = {}
    Object.entries(sourceAssignments).forEach(([teamIdx, arr]) => {
      mappedAssignments[Number(teamIdx)] = (arr || [])
        .map((id: string) => keycloakToUserId.get(id) || id)
        .filter(Boolean)
    })

    const mappedStudentIds = (deploymentStore.draft.studentIds || [])
      .map((id: string) => keycloakToUserId.get(id) || id)
      .filter(Boolean)

    // 3) Draft NUR transient für ``submitDraft`` patchen, dann zurückrollen.
    //    So sieht der Wizard bei Fehler weiterhin die ursprünglichen
    //    Keycloak-IDs (für die Anzeige), und nach Erfolg räumen wir
    //    sowieso den ganzen Draft via ``resetDraft`` weg.
    const originalAssignments = deploymentStore.draft.assignments
    const originalStudentIds = deploymentStore.draft.studentIds
    deploymentStore.draft.assignments = mappedAssignments
    deploymentStore.draft.studentIds = mappedStudentIds

    let deployment: any
    try {
      deployment = await deploymentStore.submitDraft()
    } catch (err: any) {
      // Draft wieder auf Keycloak-IDs zurückrollen, damit der User in
      // Step 2/3 wieder seine Auswahl sieht.
      deploymentStore.draft.assignments = originalAssignments
      deploymentStore.draft.studentIds = originalStudentIds
      const detail = err?.response?.data?.detail || err?.message || 'Deployment konnte nicht erstellt werden.'
      toastStore.addToast({ message: detail, type: 'error' })
      return
    }

    if (deployment?.deploymentId) {
      // Erfolgreich erstellt → Draft komplett zurücksetzen, damit der
      // nächste Wizard-Lauf nicht alte Werte vorschlägt.
      deploymentStore.resetDraft()
      toastStore.addToast({ message: 'Deployment gestartet', type: 'success' })
      await router.push({ name: 'deployments.list' })
    }
  } finally {
    isSubmitting.value = false
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
            <div class="flex items-center gap-2">
              <!-- Show the app's uploaded logo if any. Inline with the
                   name so the wizard summary mirrors the listing. -->
              <img
                v-if="selectedApp?.image"
                :src="selectedApp.image"
                :alt="selectedApp.name"
                class="w-7 h-7 object-contain rounded"
              />
              <p class="text-lg font-bold text-emerald-700">{{ selectedApp?.name || 'App nicht gefunden' }}</p>
            </div>
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
                <span
                  class="text-sm text-gray-900 font-medium text-right break-all"
                  :title="item.raw ? `Wird übermittelt: ${item.raw}` : undefined"
                >
                  {{ item.value }}
                </span>
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
                <span
                  class="text-sm text-gray-900 font-medium text-right break-all"
                  :title="item.raw ? `Wird übermittelt: ${item.raw}` : undefined"
                >
                  {{ item.value }}
                </span>
              </div>
              <p v-if="terraformVars.length === 0" class="text-sm text-gray-400 italic text-center py-4">
                Keine Terraform Variablen
              </p>
            </div>
          </div>

          <!-- Files-Sektion. Eine Karte pro File-Variable; Chips
               listen die hochgeladenen Slots (filename + size).
               Hidden wenn der App keine File-Variablen erklärt — der
               Lehrende sieht eine leere Section sonst nur als
               Rauschen. -->
          <div
            v-if="fileVarSummaries.length > 0"
            class="bg-white rounded-lg border-2 border-amber-200 overflow-hidden col-span-1 md:col-span-2"
          >
            <div class="bg-amber-100 px-4 py-2 border-b border-amber-200 flex items-center gap-2">
              <Layers :size="18" class="text-amber-700" />
              <h4 class="font-bold text-amber-900 text-sm">Hochgeladene Dateien</h4>
              <span class="ml-auto text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                {{ fileVarSummaries.reduce((acc, v) => acc + v.chips.length, 0) }}
              </span>
            </div>
            <div class="p-4 space-y-3">
              <div v-for="entry in fileVarSummaries" :key="entry.name">
                <div class="text-xs font-semibold text-gray-700 mb-1">
                  {{ entry.name }}
                  <span class="text-[10px] font-normal text-gray-500 ml-1">
                    (Scope: {{ entry.scope }})
                  </span>
                </div>
                <div v-if="entry.chips.length === 0" class="text-xs text-gray-400 italic">
                  Keine Datei hochgeladen
                </div>
                <div v-else class="flex flex-wrap gap-1.5">
                  <span
                    v-for="chip in entry.chips"
                    :key="`${entry.name}::${chip.slot}`"
                    class="inline-flex items-center gap-1 text-xs bg-amber-50 border border-amber-200 text-amber-900 px-2 py-1 rounded"
                  >
                    <span class="font-medium">{{ chip.filename }}</span>
                    <span class="text-amber-700">·</span>
                    <span>{{ chip.size }}</span>
                    <span v-if="entry.scope !== 'all'" class="text-amber-700">·</span>
                    <span v-if="entry.scope !== 'all'" class="text-[10px] text-amber-700">
                      {{ chip.slot }}
                    </span>
                  </span>
                </div>
              </div>
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
        :disabled="isLoadingVariables || isSubmitting || deploymentStore.isLoading"
        class="flex items-center gap-3 px-10 py-3 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-xl shadow-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed">

        <span v-if="isSubmitting || deploymentStore.isLoading" class="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></span>
        <span v-if="isSubmitting || deploymentStore.isLoading">Wird erstellt...</span>
        <span v-else>{{ t('deployment.actions.deploy') }}</span>
      </button>
    </div>

  </div>
</template>