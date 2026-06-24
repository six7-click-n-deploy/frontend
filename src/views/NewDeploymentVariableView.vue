<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useDeploymentStore } from '@/stores/deployment.store'
import { useAppStore } from '@/stores/app.store'
import { useToast } from '@/composables/useToast'
import DeploymentProgressBar from '@/components/DeploymentProgressBar.vue'
import VariableInput from '@/components/VariableInput.vue'
import ScopeBadge from '@/components/ui/ScopeBadge.vue'
import {
  ArrowRight,
  ArrowLeft,
  Info,
  Box,
  Layers,
  AlertTriangle,
  // Plus - removed
} from 'lucide-vue-next'
import type { AppVariable, DeploymentFile } from '@/types'
import FileDropZone from '@/components/FileDropZone.vue'

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

// Hilfsfunktion: Hat die Variable Value-Help-Metadaten (osType)?
// Picker hat Vorrang vor Type-basierter Eingabe — auch bei
// ``list(string)``-Variablen, weil der Picker selbst Multi handhabt.
// ``osType`` wird vom Backend ausschließlich gesetzt, wenn die
// Variable in ihrer Description einen ``@openstack:<type>``-Marker
// trägt (siehe backend/app/routers/apps.py).
//
// File-Variablen (``osType === 'file'``) werden hier explizit
// ausgenommen: ihr Renderer ist die :file-spezifische FileDropZone-
// Branch, nicht der OpenStackResourcePicker. Behandelt man sie
// nicht separat, würde der Picker versuchen, Files aus einer
// nicht-existenten Resource-API zu listen und scheitert mit 400.
const hasOsPicker = (v: AppVariable): boolean =>
  Boolean(v.osType) && v.osType !== 'file'

// True wenn die Variable mit ``@openstack:file:<scope>`` markiert ist.
// Treibt die FileDropZone-Branch im Renderer und das Wizard-Step-
// Gating (Pflicht-Files validieren).
const isFileVar = (v: AppVariable): boolean => v.osType === 'file'

// True wenn die Variable einen per-Variable-Scope ungleich ``all`` hat
// — also pro Team oder pro User EIN Eingabefeld rendern muss. Für
// File-Variablen wird der Scope vom Backend in ``varScope`` gespiegelt,
// damit der Renderer hier nur EINE Quelle abfragen muss.
const effectiveScope = (v: AppVariable): 'all' | 'team' | 'user' => {
  // Bei File-Variablen ist ``osScope`` autoritativ (legacy), wir lesen
  // aber bevorzugt ``varScope`` falls gesetzt — das Backend spiegelt
  // beides synchron, der Lesepfad bleibt damit gleich.
  return (v.varScope || v.osScope || 'all') as 'all' | 'team' | 'user'
}
const isScoped = (v: AppVariable): boolean => effectiveScope(v) !== 'all'

/** Slot-Keys für eine scoped Variable: leer-Liste = nicht scoped (=
 *  Single-Input), sonst ein Eintrag pro Team bzw. pro Team-User-Paar. */
const slotKeysFor = (v: AppVariable): string[] => {
  const scope = effectiveScope(v)
  if (scope === 'team') return wizardTeams.value.map((t) => t.name)
  if (scope === 'user') {
    const keys: string[] = []
    wizardTeams.value.forEach((t) =>
      t.members.forEach((m) => keys.push(userSlotKey(t.name, m.username))),
    )
    return keys
  }
  return []
}

/** Ein-Pfad-API für das v-model einer scoped non-file-Variable. Liest
 *  und schreibt ``formValues[name][slotKey]`` und legt das Eltern-
 *  Objekt bei Bedarf an. Spiegelt die Schreib-Semantik von
 *  ``setFileSlot`` für nicht-Datei-Inputs. */
const getScopedValue = (varName: string, slotKey: string): any => {
  const bag = formValues.value[varName]
  if (bag && typeof bag === 'object' && !Array.isArray(bag)) return bag[slotKey] ?? ''
  return ''
}
const setScopedValue = (varName: string, slotKey: string, value: any): void => {
  const bag = formValues.value[varName]
  if (!bag || typeof bag !== 'object' || Array.isArray(bag)) {
    formValues.value[varName] = {}
  }
  formValues.value[varName][slotKey] = value
}

/** ``accept``-Attribut für eine File-Variable. ``fileExtensions`` ist
 *  Pflicht im Backend-Marker, fällt aber bei Legacy/Test-Apps auch mal
 *  weg — dann liefern wir ``*`` (entspricht dem Default der
 *  FileDropZone). */
const fileAcceptFor = (v: AppVariable): string => {
  if (!v.fileExtensions || v.fileExtensions.length === 0) return '*'
  return v.fileExtensions.map((e) => `.${e}`).join(',')
}

// Subnet-Filter: wenn eine Subnet-Variable existiert UND es eine
// Network-Variable im id-Mode im selben Set gibt, hängt sich der
// Subnet-Picker an deren aktuellen Wert. Im name-Mode müssten wir
// den Network erst zur ID auflösen — das machen wir nicht (zu
// fehleranfällig), Filter funktioniert dann nur bei id-mode-Networks.
// Sonst lädt der Subnet-Picker alle Subnets im Project, was kein
// Drama ist. Voraussetzung für die Filter-Aktivierung ist, dass der
// App-Autor Network-Variable mit ``@openstack:network:id`` markiert.
const findNetworkValueForSubnet = (_subnet: AppVariable): string | null => {
  const networkVar = variables.value.find(
    (v) => v.osType === 'network' && v.osMode === 'id',
  )
  if (!networkVar) return null
  const val = formValues.value[networkVar.name]
  if (typeof val === 'string' && val.trim()) return val
  return null
}

const toggleTooltip = (name: string) => {
  if (activeTooltip.value === name) activeTooltip.value = null
  else activeTooltip.value = name
}

const focusInput = (name: string) => {
  const el = document.getElementById(name)
  if (el) el.focus()
}

// ----------------------------------------------------------------
// FILE-VARIABLE WIRING
// ----------------------------------------------------------------
//
// File-typed variables (``@openstack:file:<scope>``) need access to
// the wizard's team / user roster so we can render one drop-zone per
// recipient. The previous wizard step has populated
// ``draft.groupNames`` (one entry per team) and
// ``draft.assignments`` (a ``Record<groupIndex, userId[]>``); the
// student cache resolves user IDs to display names. We derive a
// stable ``[{ name, members: [{ userId, username }] }]`` shape here
// so the file-drop renderer can iterate over either dimension
// without re-doing the join in three places.

interface WizardTeamMember {
  userId: string
  username: string
}
interface WizardTeam {
  name: string
  members: WizardTeamMember[]
}

const wizardTeams = computed<WizardTeam[]>(() => {
  const groupNames = deploymentStore.draft.groupNames || []
  const assignments = deploymentStore.draft.assignments || {}
  const out: WizardTeam[] = []
  groupNames.forEach((rawName, idx) => {
    const teamName = rawName || `Team-${idx + 1}`
    const memberIds: string[] = (assignments as any)[idx] || []
    const members: WizardTeamMember[] = memberIds.map((uid) => {
      const cached = deploymentStore.studentCache.get(String(uid))
      const username = cached?.username
        || cached?.email?.split('@')[0]
        || cached?.firstName
        || String(uid).slice(0, 8)
      return { userId: String(uid), username }
    })
    out.push({ name: teamName, members })
  })
  return out
})

/** Composite key for ``scope=user`` slots — matches what the worker
 *  expects on the cloud-init side (``${team}-${username}``). The
 *  backend doesn't auto-derive this; whatever the wizard puts here
 *  ends up verbatim in the terraform variable. */
const userSlotKey = (teamName: string, username: string) =>
  `${teamName}-${username}`

/** Human-readable label for a slot-key shown above each scoped input.
 *  Plain Team-A is ambiguous in the variable grid — prefixing with
 *  "Team" + quoting the name makes it obvious which dimension a slot
 *  belongs to. For user-scope we render ``Team „X" → username``. */
const formatSlotLabel = (
  variable: AppVariable,
  slotKey: string,
): string => {
  const scope = effectiveScope(variable)
  if (scope === 'team') return `Team „${slotKey}"`
  if (scope === 'user') {
    // Composite key is ``TeamName-Username``. Team-Namen können
    // Bindestriche enthalten (``Group-3``), deshalb können wir nicht
    // einfach auf den ersten ``-`` splitten — das würde ``Group`` als
    // Team und ``3-alice`` als User liefern. Stattdessen probieren wir
    // einen longest-prefix-match gegen die bekannten Team-Namen
    // (mirror des Backend-Fixes in deployments.py, Bug #2). Das
    // Backend ist die source-of-truth; dieser Match ist nur für die
    // Anzeige, fällt also bei unbekanntem Prefix sauber auf ``lastIndexOf``
    // zurück.
    const teamNames = wizardTeams.value.map((t) => t.name)
    const sorted = [...teamNames].sort((a, b) => b.length - a.length)
    for (const team of sorted) {
      if (slotKey === team) return `Team „${team}"`
      if (slotKey.startsWith(team + '-')) {
        const user = slotKey.slice(team.length + 1)
        return `Team „${team}" → ${user}`
      }
    }
    // Fallback: kein bekanntes Team passte — heuristisch via letztem
    // Bindestrich splitten (Username ist meistens ein einzelnes Wort).
    const sep = slotKey.lastIndexOf('-')
    if (sep > 0) {
      const team = slotKey.slice(0, sep)
      const user = slotKey.slice(sep + 1)
      return `Team „${team}" → ${user}`
    }
  }
  return slotKey
}

/** Read a file slot's current value out of the draft. Returns
 *  ``null`` (not ``undefined``) so the FileDropZone's v-model
 *  treats the empty state predictably. */
const getFileSlot = (varName: string, slotKey: string): DeploymentFile | null => {
  const bag = deploymentStore.draft.fileUploads?.[varName]
  return (bag && bag[slotKey]) || null
}

/** Persist or clear one slot's payload back into the draft. We
 *  ensure the parent ``fileUploads`` object exists before writing
 *  so Vue's reactivity picks the assignment up. */
const setFileSlot = (
  varName: string,
  slotKey: string,
  value: DeploymentFile | null,
) => {
  const draft = deploymentStore.draft
  if (!draft.fileUploads) draft.fileUploads = {}
  if (!draft.fileUploads[varName]) draft.fileUploads[varName] = {}
  if (value === null) {
    delete draft.fileUploads[varName][slotKey]
  } else {
    draft.fileUploads[varName][slotKey] = value
  }
}

// Getrennte Listen für Packer und Terraform Variablen.
// Quelle ist ausschließlich das vom Backend gesetzte ``source``-Feld
// — der frühere Name-Heuristik-Fallback (``includes('image')``) wurde
// entfernt, weil er Terraform-Variablen mit „image" im Namen
// doppelt in beide Spalten gerendert hat (siehe Bug #5). Das Backend
// klassifiziert zuverlässig anhand des Variable-Pfads (packer vs.
// terraform), keine Heuristik nötig.
const packerVariables = computed(() =>
  variables.value.filter(v => v.source === 'packer')
)

const terraformVariables = computed(() => 
  variables.value.filter(v => v.source === 'terraform')
)

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

  // Wenn API-Definitionen im Draft, nutze diese
  if (deploymentStore.draft.variableDefinitions && deploymentStore.draft.variableDefinitions.length > 0) {
    variables.value = deploymentStore.draft.variableDefinitions
    formValues.value = { ...deploymentStore.draft.variables }
    return
  }

  isLoading.value = true

  try {
    const rawTag: any = deploymentStore.draft.releaseTag
    const version = (typeof rawTag === 'object' && rawTag.version) ? rawTag.version : rawTag || 'latest'
    // 1. Variablen laden
    const rawVariables = await appStore.fetchAppVariables(deploymentStore.draft.appId, version)
    // 2. Keine Filterung mehr, alle Variablen anzeigen
    const uniqueVariablesMap = new Map<string, AppVariable>()
    rawVariables.forEach(v => {
      if (!uniqueVariablesMap.has(v.name)) uniqueVariablesMap.set(v.name, v)
    })
    variables.value = Array.from(uniqueVariablesMap.values())
    deploymentStore.draft.variableDefinitions = variables.value

    // Eager-prime the OS-resource cache for every Picker-typed variable
    // BEFORE the form renders. Without this the picker mounts with the
    // default value (often a raw UUID) and ``selectedDisplay`` returns
    // ``{ known: false, name: <uuid> }`` for a few hundred ms while
    // ``ensureLoaded`` fires asynchronously. Result: the user sees the
    // raw UUID flash with a ``(manuell)`` tag — looks like a bug even
    // though the cache catches up shortly after.
    //
    // ``ensureLoaded`` dedupes by ``(user_id, kind)``, so calling it N
    // times for repeated types costs nothing. We Promise.all them all
    // and let the wizard show its existing loading state until done.
    const osTypesToPrime = new Set<string>()
    for (const v of variables.value) {
      if (v.osType && v.osType !== 'file') osTypesToPrime.add(v.osType)
    }
    if (osTypesToPrime.size > 0) {
      const { ensureLoaded } = await import('@/composables/useOpenStackResourceCache')
      await Promise.allSettled(
        Array.from(osTypesToPrime).map((t) => ensureLoaded(t as any)),
      )
    }

    // 3. Bestehende Draft-Werte (User Input) laden. ``userInputVar`` kann
    // historisch sowohl ein JSON-String als auch ein Record sein — Type
    // sagt ``Record<string,any> | string``. Sauber differenzieren statt
    // blind ``JSON.stringify`` → ``JSON.parse`` zu jagen.
    let savedValues: Record<string, any> = {}
    const rawUserInput: any = deploymentStore.draft.userInputVar
    if (rawUserInput && typeof rawUserInput === 'object' && !Array.isArray(rawUserInput)) {
      savedValues = rawUserInput
    } else if (typeof rawUserInput === 'string' && rawUserInput.trim() !== '') {
      try {
        savedValues = JSON.parse(rawUserInput)
      } catch (e) {
        console.warn('Invalid JSON in userInputVar', e)
        toast.error('Eigene Variablenwerte konnten nicht gelesen werden (ungültiges JSON). Standardwerte werden verwendet.')
      }
    }

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

      // Scoped non-file Variablen leben als Map (slotKey → value) im
      // Draft. Wir lassen sie hier 1:1 durch, ohne sie wie Skalare zu
      // normalisieren — die Skalar-Pfade (List-CSV, Bool-Default,
      // Number-Empty-String) gelten nur für ``varScope = all``.
      if (isScoped(v) && v.osType !== 'file') {
        if (typeof valToSet !== 'object' || Array.isArray(valToSet) || valToSet === null) {
          // Gespeicherter Wert ist kein Map → neu starten, damit die
          // Slot-Inputs leer initialisieren.
          valToSet = {}
        }
        formValues.value[v.name] = valToSet
        return
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

  } catch (error: any) {
    console.error(error)
    toast.error('Variablen konnten nicht geladen werden.')
  } finally {
    isLoading.value = false
  }

  // Marker-Fehler einzelner Variablen (Backend setzt
  // ``markerError`` pro Variable, statt 400 für die ganze App). Wir
  // zeigen einen aggregierten Toast — der App-Autor sieht es prominent,
  // jede betroffene Variable hat zusätzlich einen Inline-Hint.
  const bad = variables.value.filter((v) => v.markerError)
  if (bad.length > 0) {
    const lines = bad.map((v) => {
      const loc = v.markerError?.location ? ` (${v.markerError.location})` : ''
      return `• ${v.markerError?.variable}${loc}: ${v.markerError?.message}`
    })
    toast.error(
      `${bad.length} fehlerhafte(r) @openstack-Marker — die betroffenen Variablen werden als Free-Text gerendert:\n${lines.join('\n')}`,
    )
  }
})

// --- Actions ---
const handleNext = () => {
  try {
    const changedValues: Record<string, any> = {}
    const allValues: Record<string, any> = {}

    variables.value.forEach(v => {
      // File-typed variables don't live in ``formValues`` — their
      // payload is staged in ``draft.fileUploads`` and shipped via
      // the separate ``files`` field on the create-deployment
      // request. Folding them into ``draft.variables`` here would
      // cause ``submitDraft`` to forward an ``undefined`` (or, after
      // a refresh, a stale string default like ``"{}"``) as
      // ``-var=assignment_files=...``, which Terraform then
      // rejects with "Unsuitable value for var.X". Skip outright.
      if (v.osType === 'file') return

      // Scoped non-file variables travel as a Map (slotKey → value).
      // Skip the scalar normalize/compare pipeline below — leere oder
      // unveränderte Slots werden im Store (``submitDraft``) ohnehin
      // aus der Map gefiltert, hier speichern wir nur die nicht-
      // leeren Einträge unter dem Variable-Namen.
      if (isScoped(v)) {
        const map = formValues.value[v.name]
        const cleanMap: Record<string, any> = {}
        if (map && typeof map === 'object' && !Array.isArray(map)) {
          for (const [slotKey, raw] of Object.entries(map)) {
            if (raw === undefined || raw === null) continue
            if (typeof raw === 'string' && raw.trim() === '') continue
            let val: any = raw
            if (isList(v.type) && typeof raw === 'string') {
              val = raw.split(',').map((s) => s.trim()).filter((s) => s !== '')
            } else if (isNumber(v.type) && raw !== '') {
              val = Number(raw)
            }
            cleanMap[slotKey] = val
          }
        }
        if (Object.keys(cleanMap).length > 0) {
          changedValues[v.name] = cleanMap
        }
        allValues[v.name] = cleanMap
        return
      }

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
      // Für die Zusammenfassung: alle Werte (auch Defaults)
      let valueForSummary = currentValueRaw
      if (isList(v.type) && typeof currentValueRaw === 'string') {
        valueForSummary = currentValueRaw.split(',').map(s => s.trim()).filter(s => s !== '')
      } else if (isNumber(v.type) && currentValueRaw !== '') {
        valueForSummary = Number(currentValueRaw)
      }
      allValues[v.name] = valueForSummary
    })

    deploymentStore.draft.userInputVar = JSON.stringify(changedValues) as any
    deploymentStore.draft.variables = allValues
    router.push({ name: 'deployment.summary' })
  } catch (e) {
    console.error(e)
    toast.error('Fehler beim Speichern.')
  }
}

const handleBack = () => {
  router.push({ name: 'deployment.teams' })
}

// ----------------------------------------------------------------
// REQUIRED-GATING (Bug #3 frontend half)
// ----------------------------------------------------------------
//
// Der Next-Button war bisher immer aktiv — required-Variablen ohne
// Wert konnte man problemlos überspringen und der Fehler trat erst
// im Backend (oder schlimmer: in Terraform) auf. ``canSubmit``
// spiegelt das Backend-Required-Check (deployments.py
// ``_validate_scoped_user_input``): für scoped Variablen müssen
// alle erwarteten Slots befüllt sein, für scope=all mindestens das
// eine Feld. File-Variablen werden hier nicht geprüft — die haben
// ihren eigenen Validierungsfluss (FileDropZone + draft.fileUploads).
const isEmptyValue = (val: any): boolean => {
  if (val === undefined || val === null) return true
  if (typeof val === 'string' && val.trim() === '') return true
  if (Array.isArray(val) && val.length === 0) return true
  return false
}

const missingRequired = computed<string[]>(() => {
  const missing: string[] = []
  for (const v of variables.value) {
    if (!v.required) continue
    if (v.osType === 'file') continue // Files validiert separat
    if (isScoped(v)) {
      const map = (formValues.value[v.name] ?? {}) as Record<string, any>
      const slots = slotKeysFor(v)
      if (slots.length === 0) {
        // Kein Team/User konfiguriert → wir können das Required nicht
        // erfüllen. Markieren, damit der Wizard nicht still hängt.
        missing.push(v.name)
        continue
      }
      for (const slot of slots) {
        if (isEmptyValue(map[slot])) {
          missing.push(`${v.name} (${slot})`)
        }
      }
    } else {
      if (isEmptyValue(formValues.value[v.name])) missing.push(v.name)
    }
  }
  return missing
})

const canSubmit = computed(() => missingRequired.value.length === 0)

// ----------------------------------------------------------------
// TEAM-RENAME RECONCILIATION (Bug #6)
// ----------------------------------------------------------------
//
// Slot-Keys werden direkt aus ``wizardTeams[].name`` (und für
// scope=user zusätzlich aus ``member.username``) abgeleitet. Wird
// im vorigen Schritt ein Team umbenannt oder ein User entfernt,
// bleibt der alte Slot-Eintrag in ``formValues`` zurück — Vue
// rendert ihn nicht mehr (Renderer iteriert über die neuen Keys),
// aber beim Submit landet er trotzdem in der Map. Resultat:
// Terraform sieht eine Map mit einem Orphan-Slot, das auf einen
// nicht-existenten Team-Namen referenziert.
//
// Der Watch räumt nach jedem Wechsel von ``wizardTeams`` auf: für
// jede scoped non-file-Variable filtern wir die Map auf die aktuell
// gültigen Slot-Keys, sammeln verworfene Keys und toasten sie
// einmal aggregiert. Der File-Pfad nutzt einen eigenen Store
// (``draft.fileUploads``); der wird in einem späteren Cleanup
// adressiert (außerhalb dieses Files).
watch(
  wizardTeams,
  (_newTeams, _oldTeams) => {
    if (!variables.value.length) return
    const dropped: string[] = []
    for (const v of variables.value) {
      if (!isScoped(v)) continue
      if (v.osType === 'file') continue
      const map = formValues.value[v.name]
      if (!map || typeof map !== 'object' || Array.isArray(map)) continue
      const validSlots = new Set(slotKeysFor(v))
      for (const key of Object.keys(map)) {
        if (!validSlots.has(key)) {
          dropped.push(`${v.name} → ${key}`)
          delete (map as Record<string, any>)[key]
        }
      }
    }
    if (dropped.length > 0) {
      toast.info(
        `Team-/User-Änderung erkannt — ${dropped.length} verwaiste Eingabe(n) entfernt:\n${dropped.join('\n')}`,
      )
    }
  },
  { deep: true },
)
</script>

<template>
  <div class="bg-white rounded-2xl p-10 border shadow-sm max-w-5xl mx-auto min-h-[600px] flex flex-col">

    <div class="mb-6">
      <DeploymentProgressBar :current-step="3" class="mb-8" />
      <div class="text-center">
        <h1 class="text-3xl font-bold text-gray-900">Variablen Konfiguration</h1>
        <p class="text-emerald-600 font-medium mt-2 text-lg">
          App: {{ deploymentStore.draft.name || 'Unbenannt' }}
        </p>
      </div>
    </div>

    <div class="flex-grow w-full max-w-7xl mx-auto mt-6">
      
      <div v-if="isLoading" class="flex flex-col items-center justify-center py-20">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-3"></div>
        <span class="text-gray-400">Lade Variablen...</span>
      </div>

      <div v-else-if="variables.length === 0" class="text-center py-12 text-gray-500 italic bg-gray-50 rounded-xl border border-dashed">
        Diese App benötigt keine speziellen Variablen.
      </div>

      <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <!-- Packer Variables -->
        <div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border-2 border-blue-200 overflow-hidden">
          <div class="bg-blue-600 text-white px-6 py-4 flex items-center gap-3">
            <Box :size="24" />
            <div>
              <h2 class="text-xl font-bold">Packer Variablen</h2>
              <p class="text-xs text-blue-100 mt-0.5">Image/Template Konfiguration</p>
            </div>
          </div>
          
          <div class="p-6 space-y-6 max-h-[600px] overflow-y-auto">
            <div v-if="packerVariables.length === 0" class="text-center py-8 text-blue-600 italic">
              Keine Packer Variablen vorhanden
            </div>
            
            <div v-for="variable in packerVariables" :key="variable.name" class="bg-white rounded-lg p-4 border border-blue-200 shadow-sm">
              <div class="flex items-start justify-between gap-2 mb-3">
                <label
                  :for="variable.name"
                  @click.prevent="focusInput(variable.name)"
                  class="text-base font-bold text-gray-900 cursor-pointer hover:text-blue-700 transition-colors flex-1"
                >
                  {{ variable.name }}
                </label>

                <button
                  v-if="variable.description || isList(variable.type)"
                  @click.stop="toggleTooltip(variable.name)"
                  class="text-gray-400 hover:text-blue-600 transition-colors focus:outline-none"
                  :class="activeTooltip === variable.name ? 'text-blue-600' : ''"
                  title="Info anzeigen"
                >
                  <Info :size="16" />
                </button>
              </div>

              <!-- Marker-Fehler-Banner: zeigt App-Autoren genau, was am
                   ``@openstack``-Marker dieser Variable kaputt ist. Das
                   Eingabefeld bleibt benutzbar (Free-Text), damit der
                   Wizard nicht komplett blockiert. -->
              <div
                v-if="variable.markerError"
                class="mb-3 bg-amber-50 p-3 rounded-lg border border-amber-300 text-xs text-amber-800"
              >
                <p class="font-semibold mb-1 flex items-center gap-1.5">
                  <AlertTriangle :size="14" class="shrink-0" />
                  @openstack-Marker fehlerhaft
                </p>
                <p>{{ variable.markerError.message }}</p>
                <p v-if="variable.markerError.location" class="mt-1 font-mono text-amber-700">
                  {{ variable.markerError.location }}
                </p>
              </div>

              <div v-if="activeTooltip === variable.name" class="mb-3 bg-blue-50 p-3 rounded-lg border border-blue-100 text-sm text-gray-700">
                <p v-if="variable.description" class="mb-2">{{ variable.description }}</p>
                <div v-if="isList(variable.type)" class="flex gap-2 items-start text-xs text-blue-700">
                  <Info :size="12" class="mt-0.5 shrink-0" />
                  <span>Mehrere Werte mit Komma trennen</span>
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-2 mb-3">
                <span class="text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                  {{ variable.type }}
                </span>
                <span v-if="variable.required" class="text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 px-2 py-0.5 rounded border border-red-200">
                  Pflichtfeld
                </span>
                <!-- Scope-Badge: zeigt nur wenn die Variable mit
                     ``varScope=team`` oder ``user`` markiert ist.
                     Bei ``all`` (Default) wird nichts gerendert,
                     siehe ScopeBadge-Komponente. -->
                <ScopeBadge :scope="effectiveScope(variable)" />
              </div>

              <!-- Scope-Erklärung: nur über Slot-Inputs (kein
                   Banner bei scope=all). Macht das ``Pro Team``-
                   Badge oben textlich greifbar: „warum sehe ich
                   mehrere Felder?"
                   Greift sowohl für File-Variablen als auch für
                   non-file Inputs — die rendern beide weiter unten
                   ihre Slot-Schleifen. -->
              <div
                v-if="isScoped(variable)"
                class="mb-3 text-xs text-purple-800 bg-purple-50 border border-purple-200 rounded px-3 py-2"
              >
                <p class="font-semibold mb-0.5">
                  Pro {{ effectiveScope(variable) === 'team' ? 'Team' : 'User' }} ein eigener Wert
                </p>
                <p>
                  Du gibst unten <strong>eine Eingabe pro {{ effectiveScope(variable) === 'team' ? 'Team' : 'Mitglied' }}</strong> ein. Beim Deploy bekommt jedes
                  {{ effectiveScope(variable) === 'team' ? 'Team' : 'Mitglied' }} genau seinen eigenen Wert.
                </p>
              </div>

              <!-- File-Variable: rendert eine FileDropZone pro
                   Scope-Eintrag. ``scope=all`` → genau eine Zone;
                   ``scope=team`` → eine pro Team aus den Wizard-
                   Gruppen; ``scope=user`` → eine pro User innerhalb
                   jedes Teams (Composite-Key ``Team-Username``).
                   Greift VOR dem Resource-Picker, weil der Picker
                   für diesen pseudo-resource-type gar keinen
                   Listen-Endpoint hat. -->
              <div v-if="isFileVar(variable)" class="space-y-3">
                <!-- scope=all: ein einzelnes Drop-Feld -->
                <FileDropZone
                  v-if="(variable.osScope || 'all') === 'all'"
                  :model-value="getFileSlot(variable.name, 'all')"
                  @update:modelValue="(v) => setFileSlot(variable.name, 'all', v)"
                  :label="variable.name"
                  :accept="fileAcceptFor(variable)"
                />
                <!-- scope=team: pro Team eine Zone -->
                <template v-else-if="variable.osScope === 'team'">
                  <FileDropZone
                    v-for="team in wizardTeams"
                    :key="`${variable.name}::${team.name}`"
                    :model-value="getFileSlot(variable.name, team.name)"
                    @update:modelValue="(v) => setFileSlot(variable.name, team.name, v)"
                    :label="team.name"
                    :accept="fileAcceptFor(variable)"
                  />
                  <div v-if="wizardTeams.length === 0" class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                    Noch keine Teams konfiguriert — bitte den vorigen
                    Schritt zuerst durchlaufen.
                  </div>
                </template>
                <!-- scope=user: pro Team eine Sektion mit User-Zonen -->
                <template v-else-if="variable.osScope === 'user'">
                  <div
                    v-for="team in wizardTeams"
                    :key="`${variable.name}::${team.name}`"
                    class="border-l-2 border-gray-200 pl-3 space-y-2"
                  >
                    <div class="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      {{ team.name }}
                    </div>
                    <FileDropZone
                      v-for="member in team.members"
                      :key="`${variable.name}::${team.name}::${member.userId}`"
                      :model-value="getFileSlot(variable.name, userSlotKey(team.name, member.username))"
                      @update:modelValue="(v) => setFileSlot(variable.name, userSlotKey(team.name, member.username), v)"
                      :label="member.username"
                      :accept="fileAcceptFor(variable)"
                    />
                    <div v-if="team.members.length === 0" class="text-xs text-gray-500 italic">
                      Keine Mitglieder
                    </div>
                  </div>
                  <div v-if="wizardTeams.length === 0" class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                    Noch keine Teams konfiguriert — bitte den vorigen
                    Schritt zuerst durchlaufen.
                  </div>
                </template>
              </div>

              <!-- Non-file inputs: scope-aware rendering. ``all`` (oder
                   ohne ``varScope``) liefert genau EIN VariableInput;
                   ``team``/``user`` rendert eine Beschriftung pro Slot
                   und je ein VariableInput. File-Variablen sind oben
                   abgedeckt (FileDropZone). -->
              <template v-else>
                <!-- Scope = all → ein einziger Input. -->
                <VariableInput
                  v-if="!isScoped(variable)"
                  :variable="variable"
                  :model-value="formValues[variable.name]"
                  @update:modelValue="(v) => (formValues[variable.name] = v)"
                  :filter-network-id="variable.osType === 'subnet' ? findNetworkValueForSubnet(variable) : null"
                  accent="blue"
                  :input-id="variable.name"
                />
                <!-- Scope = team|user → ein Input pro Slot. -->
                <div v-else class="space-y-3">
                  <div
                    v-if="slotKeysFor(variable).length === 0 && effectiveScope(variable) === 'team'"
                    class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2"
                  >
                    Noch keine Teams konfiguriert — bitte den vorigen Schritt zuerst durchlaufen.
                  </div>
                  <!-- scope=user: nach Team gruppieren, damit auch
                       Teams ohne Mitglieder eine Überschrift +
                       „Keine Mitglieder"-Hinweis zeigen (spiegel
                       des File-Pfads, Bug „scope=user empty-team"). -->
                  <template v-if="effectiveScope(variable) === 'user'">
                    <div v-if="wizardTeams.length === 0" class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                      Noch keine Teams konfiguriert — bitte den vorigen Schritt zuerst durchlaufen.
                    </div>
                    <div
                      v-for="team in wizardTeams"
                      :key="`${variable.name}::team::${team.name}`"
                      class="border-l-2 border-gray-200 pl-3 space-y-2"
                    >
                      <div class="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        {{ team.name }}
                      </div>
                      <div
                        v-for="member in team.members"
                        :key="`${variable.name}::${team.name}::${member.userId}`"
                        class="flex flex-col gap-1"
                      >
                        <label
                          :for="`${variable.name}__${userSlotKey(team.name, member.username)}`"
                          class="text-xs font-semibold text-gray-600"
                        >
                          {{ member.username }}
                        </label>
                        <VariableInput
                          :variable="variable"
                          :model-value="getScopedValue(variable.name, userSlotKey(team.name, member.username))"
                          @update:modelValue="(v) => setScopedValue(variable.name, userSlotKey(team.name, member.username), v)"
                          :filter-network-id="variable.osType === 'subnet' ? findNetworkValueForSubnet(variable) : null"
                          accent="blue"
                          :input-id="`${variable.name}__${userSlotKey(team.name, member.username)}`"
                        />
                      </div>
                      <div v-if="team.members.length === 0" class="text-xs text-gray-500 italic">
                        Keine Mitglieder
                      </div>
                    </div>
                  </template>
                  <!-- scope=team: flacher Renderer reicht. -->
                  <template v-else>
                    <div
                      v-for="slotKey in slotKeysFor(variable)"
                      :key="`${variable.name}::${slotKey}`"
                      class="flex flex-col gap-1"
                    >
                      <label
                        :for="`${variable.name}__${slotKey}`"
                        class="text-xs font-semibold text-gray-600"
                      >
                        {{ formatSlotLabel(variable, slotKey) }}
                      </label>
                      <VariableInput
                        :variable="variable"
                        :model-value="getScopedValue(variable.name, slotKey)"
                        @update:modelValue="(v) => setScopedValue(variable.name, slotKey, v)"
                        :filter-network-id="variable.osType === 'subnet' ? findNetworkValueForSubnet(variable) : null"
                        accent="blue"
                        :input-id="`${variable.name}__${slotKey}`"
                      />
                    </div>
                  </template>
                </div>
              </template>
            </div>
          </div>
        </div>

        <!-- Terraform Variables -->
        <div class="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border-2 border-purple-200 overflow-hidden">
          <div class="bg-purple-600 text-white px-6 py-4 flex items-center gap-3">
            <Layers :size="24" />
            <div>
              <h2 class="text-xl font-bold">Terraform Variablen</h2>
              <p class="text-xs text-purple-100 mt-0.5">Infrastruktur Konfiguration</p>
            </div>
          </div>
          
          <div class="p-6 space-y-6 max-h-[600px] overflow-y-auto">
            <div v-if="terraformVariables.length === 0" class="text-center py-8 text-purple-600 italic">
              Keine Terraform Variablen vorhanden
            </div>
            
            <div v-for="variable in terraformVariables" :key="variable.name" class="bg-white rounded-lg p-4 border border-purple-200 shadow-sm">
              <div class="flex items-start justify-between gap-2 mb-3">
                <label
                  :for="variable.name"
                  @click.prevent="focusInput(variable.name)"
                  class="text-base font-bold text-gray-900 cursor-pointer hover:text-purple-700 transition-colors flex-1"
                >
                  {{ variable.name }}
                </label>

                <button
                  v-if="variable.description || isList(variable.type)"
                  @click.stop="toggleTooltip(variable.name)"
                  class="text-gray-400 hover:text-purple-600 transition-colors focus:outline-none"
                  :class="activeTooltip === variable.name ? 'text-purple-600' : ''"
                  title="Info anzeigen"
                >
                  <Info :size="16" />
                </button>
              </div>

              <!-- Marker-Fehler-Banner — siehe Packer-Block. -->
              <div
                v-if="variable.markerError"
                class="mb-3 bg-amber-50 p-3 rounded-lg border border-amber-300 text-xs text-amber-800"
              >
                <p class="font-semibold mb-1 flex items-center gap-1.5">
                  <AlertTriangle :size="14" class="shrink-0" />
                  @openstack-Marker fehlerhaft
                </p>
                <p>{{ variable.markerError.message }}</p>
                <p v-if="variable.markerError.location" class="mt-1 font-mono text-amber-700">
                  {{ variable.markerError.location }}
                </p>
              </div>

              <div v-if="activeTooltip === variable.name" class="mb-3 bg-purple-50 p-3 rounded-lg border border-purple-100 text-sm text-gray-700">
                <p v-if="variable.description" class="mb-2">{{ variable.description }}</p>
                <div v-if="isList(variable.type)" class="flex gap-2 items-start text-xs text-purple-700">
                  <Info :size="12" class="mt-0.5 shrink-0" />
                  <span>Mehrere Werte mit Komma trennen</span>
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-2 mb-3">
                <span class="text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-700 px-2 py-0.5 rounded border border-purple-200">
                  {{ variable.type }}
                </span>
                <span v-if="variable.required" class="text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700 px-2 py-0.5 rounded border border-red-200">
                  Pflichtfeld
                </span>
                <!-- siehe Packer-Block: bei scope=all nichts. -->
                <ScopeBadge :scope="effectiveScope(variable)" />
              </div>

              <!-- Scope-Erklärung (Terraform-Sektion): spiegelt die
                   Erklärung der Packer-Sektion, gleicher Inhalt. -->
              <div
                v-if="isScoped(variable)"
                class="mb-3 text-xs text-purple-800 bg-purple-50 border border-purple-200 rounded px-3 py-2"
              >
                <p class="font-semibold mb-0.5">
                  Pro {{ effectiveScope(variable) === 'team' ? 'Team' : 'User' }} ein eigener Wert
                </p>
                <p>
                  Du gibst unten <strong>eine Eingabe pro {{ effectiveScope(variable) === 'team' ? 'Team' : 'Mitglied' }}</strong> ein. Beim Deploy bekommt jedes
                  {{ effectiveScope(variable) === 'team' ? 'Team' : 'Mitglied' }} genau seinen eigenen Wert.
                </p>
              </div>

              <!-- File-Variable: spiegelt das Renderer-Verhalten der
                   ersten Sektion oben — eine FileDropZone pro
                   Scope-Eintrag. -->
              <div v-if="isFileVar(variable)" class="space-y-3">
                <FileDropZone
                  v-if="(variable.osScope || 'all') === 'all'"
                  :model-value="getFileSlot(variable.name, 'all')"
                  @update:modelValue="(v) => setFileSlot(variable.name, 'all', v)"
                  :label="variable.name"
                  :accept="fileAcceptFor(variable)"
                />
                <template v-else-if="variable.osScope === 'team'">
                  <FileDropZone
                    v-for="team in wizardTeams"
                    :key="`${variable.name}::${team.name}`"
                    :model-value="getFileSlot(variable.name, team.name)"
                    @update:modelValue="(v) => setFileSlot(variable.name, team.name, v)"
                    :label="team.name"
                    :accept="fileAcceptFor(variable)"
                  />
                  <!-- Bug #14: gleiche Empty-Teams-Warnung wie im
                       Packer-Pendant — verhindert, dass der Wizard
                       still einen leeren File-Slot rendert, wenn der
                       vorige Schritt nicht durchlaufen wurde. -->
                  <div v-if="wizardTeams.length === 0" class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                    Noch keine Teams konfiguriert — bitte den vorigen
                    Schritt zuerst durchlaufen.
                  </div>
                </template>
                <template v-else-if="variable.osScope === 'user'">
                  <div
                    v-for="team in wizardTeams"
                    :key="`${variable.name}::${team.name}`"
                    class="border-l-2 border-gray-200 pl-3 space-y-2"
                  >
                    <div class="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                      {{ team.name }}
                    </div>
                    <FileDropZone
                      v-for="member in team.members"
                      :key="`${variable.name}::${team.name}::${member.userId}`"
                      :model-value="getFileSlot(variable.name, userSlotKey(team.name, member.username))"
                      @update:modelValue="(v) => setFileSlot(variable.name, userSlotKey(team.name, member.username), v)"
                      :label="member.username"
                      :accept="fileAcceptFor(variable)"
                    />
                    <div v-if="team.members.length === 0" class="text-xs text-gray-500 italic">
                      Keine Mitglieder
                    </div>
                  </div>
                  <div v-if="wizardTeams.length === 0" class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                    Noch keine Teams konfiguriert — bitte den vorigen
                    Schritt zuerst durchlaufen.
                  </div>
                </template>
              </div>

              <!-- Non-file inputs: scope-aware rendering (Terraform-
                   Sektion, lila Akzent). Spiegelt das Packer-Pendant
                   oben. -->
              <template v-else>
                <VariableInput
                  v-if="!isScoped(variable)"
                  :variable="variable"
                  :model-value="formValues[variable.name]"
                  @update:modelValue="(v) => (formValues[variable.name] = v)"
                  :filter-network-id="variable.osType === 'subnet' ? findNetworkValueForSubnet(variable) : null"
                  accent="purple"
                  :input-id="variable.name"
                />
                <div v-else class="space-y-3">
                  <div
                    v-if="slotKeysFor(variable).length === 0 && effectiveScope(variable) === 'team'"
                    class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2"
                  >
                    Noch keine Teams konfiguriert — bitte den vorigen Schritt zuerst durchlaufen.
                  </div>
                  <!-- scope=user: nach Team gruppieren (siehe
                       Packer-Pendant oben für Rationale). -->
                  <template v-if="effectiveScope(variable) === 'user'">
                    <div v-if="wizardTeams.length === 0" class="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2">
                      Noch keine Teams konfiguriert — bitte den vorigen Schritt zuerst durchlaufen.
                    </div>
                    <div
                      v-for="team in wizardTeams"
                      :key="`${variable.name}::team::${team.name}`"
                      class="border-l-2 border-gray-200 pl-3 space-y-2"
                    >
                      <div class="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        {{ team.name }}
                      </div>
                      <div
                        v-for="member in team.members"
                        :key="`${variable.name}::${team.name}::${member.userId}`"
                        class="flex flex-col gap-1"
                      >
                        <label
                          :for="`${variable.name}__${userSlotKey(team.name, member.username)}`"
                          class="text-xs font-semibold text-gray-600"
                        >
                          {{ member.username }}
                        </label>
                        <VariableInput
                          :variable="variable"
                          :model-value="getScopedValue(variable.name, userSlotKey(team.name, member.username))"
                          @update:modelValue="(v) => setScopedValue(variable.name, userSlotKey(team.name, member.username), v)"
                          :filter-network-id="variable.osType === 'subnet' ? findNetworkValueForSubnet(variable) : null"
                          accent="purple"
                          :input-id="`${variable.name}__${userSlotKey(team.name, member.username)}`"
                        />
                      </div>
                      <div v-if="team.members.length === 0" class="text-xs text-gray-500 italic">
                        Keine Mitglieder
                      </div>
                    </div>
                  </template>
                  <template v-else>
                    <div
                      v-for="slotKey in slotKeysFor(variable)"
                      :key="`${variable.name}::${slotKey}`"
                      class="flex flex-col gap-1"
                    >
                      <label
                        :for="`${variable.name}__${slotKey}`"
                        class="text-xs font-semibold text-gray-600"
                      >
                        {{ formatSlotLabel(variable, slotKey) }}
                      </label>
                      <VariableInput
                        :variable="variable"
                        :model-value="getScopedValue(variable.name, slotKey)"
                        @update:modelValue="(v) => setScopedValue(variable.name, slotKey, v)"
                        :filter-network-id="variable.osType === 'subnet' ? findNetworkValueForSubnet(variable) : null"
                        accent="purple"
                        :input-id="`${variable.name}__${slotKey}`"
                      />
                    </div>
                  </template>
                </div>
              </template>
            </div>
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

      <!-- Required-Gating-Banner (Bug #3): zählt unausgefüllte
           Pflichtfelder auf, damit der User nicht blind raten muss,
           warum der Next-Button deaktiviert ist. -->
      <div v-if="!canSubmit && !isLoading && variables.length > 0" class="flex-1 mx-6 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-3 py-2">
        <p class="font-semibold mb-0.5">Es fehlen noch Pflichteingaben:</p>
        <ul class="list-disc pl-5">
          <li v-for="m in missingRequired" :key="m">{{ m }}</li>
        </ul>
      </div>

      <button
        @click="handleNext"
        :disabled="!canSubmit"
        :class="[
          'flex items-center gap-2 px-8 py-2.5 rounded-full font-bold transition-colors shadow-lg',
          canSubmit
            ? 'bg-emerald-700 text-white hover:bg-emerald-800 shadow-emerald-700/20'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none',
        ]"
      >
        {{ t('deployment.actions.next') }}
        <ArrowRight :size="18" />
      </button>
    </div>

  </div>
</template>