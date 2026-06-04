<script setup lang="ts">
/**
 * OpenStack-Resource-Picker.
 *
 * Wird im Wizard für Variablen gerendert, deren Backend-Antwort einen
 * ``osType`` trägt. Das Backend setzt diesen Wert AUSSCHLIESSLICH, wenn
 * die Variable in ihrer ``description`` einen ``@openstack:<type>``-
 * Marker hat — siehe ``backend/app/routers/apps.py`` für die Marker-
 * Grammatik. Es gibt keine Auto-Detection an dieser Komponente vorbei.
 *
 * Lädt die passende Liste vom Backend (Cache 60 s im Backend +
 * Display-Cache im Frontend, geteilt zwischen Picker-Instanzen). Zeigt
 * einen Single- oder Multi-Select.
 *
 * Wire-Format (``v-model``):
 *  - osMode='id'   → speichert die UUID(s)
 *  - osMode='name' → speichert den Namen / die Namen
 *  - multi=false   → String
 *  - multi=true    → Array<String> ODER kommaseparierter String
 *                    (was reinkommt, kommt auch raus — Wizard speichert
 *                    historisch CSV für ``list(string)``-Variablen)
 *
 * Im UI wird IMMER der Display-Name gezeigt, auch wenn der gespeicherte
 * Wert eine UUID ist. Cache-Lookup läuft über
 * ``composables/useOpenStackResourceCache``.
 *
 * Dropdown öffnet sich als Floating-Layer via ``<Teleport to="body">`` —
 * andere Wizard-Felder verschieben sich nicht. Position wird aus der
 * Trigger-Bounding-Rect berechnet und auf Scroll/Resize neu kalibriert;
 * scrollt der Trigger aus dem Viewport, schließt das Dropdown.
 *
 * Edge-Cases die berücksichtigt sind:
 *  - 412 Credentials missing → CTA-Banner statt leerer Liste
 *  - 502 OpenStack down → Banner + Fallback auf Free-Text-Input
 *  - Default-Wert ist eine UUID, deren Name (noch) nicht im Cache steckt
 *    → wir zeigen den Roh-Wert mit "(manuell)"-Tag, bis Cache lädt
 *  - Liste ist leer → Hint mit Free-Text-Option
 *  - Subnet-Filter: networkId-Prop kann zur Laufzeit von einer
 *    anderen Variable kommen → reaktiv neu laden bei Wechsel
 *  - Dropdown größer als Platz unten → flippt nach oben
 *  - Component unmount mit offenem Dropdown → Body-Teleport sauber weg
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Pencil,
  RefreshCw,
  Search,
  X,
} from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'
import {
  openstackResourcesApi,
  type OsResourceType,
} from '@/api/openstack-resources.api'
import {
  prime as primeDisplayCache,
  invalidate as invalidateDisplayCache,
  getDisplayName,
  ensureLoaded,
} from '@/composables/useOpenStackResourceCache'
import CredentialMissingBanner from '@/components/CredentialMissingBanner.vue'

// ----------------------------------------------------------------
// Props / Emits
// ----------------------------------------------------------------
type Mode = 'id' | 'name'

const props = defineProps<{
  osType: OsResourceType
  osMode?: Mode
  multi?: boolean
  modelValue?: string | string[] | null
  filterNetworkId?: string | null
  azService?: 'compute' | 'network' | 'volume'
  placeholder?: string
  allowFreeText?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: string | string[]): void
}>()

const toast = useToast()

// ----------------------------------------------------------------
// State
// ----------------------------------------------------------------
type ResourceItem = {
  id: string
  name: string
  secondary?: string
  tertiary?: string
  raw: any
}

const items = ref<ResourceItem[]>([])
const isLoading = ref(false)
const errorReason = ref<'credentials_missing' | 'unavailable' | null>(null)
const errorMessage = ref<string>('')
const isOpen = ref(false)
const searchQuery = ref('')
const isFreeTextMode = ref(false)
const freeTextValue = ref('')

// Floating-Layer-Anchor: live-getrackte Bounding-Rect des Triggers,
// sodass das Teleport-Panel exakt unter (oder über) dem Trigger landet.
const triggerEl = ref<HTMLElement | null>(null)
const dropdownEl = ref<HTMLElement | null>(null)
const searchInputEl = ref<HTMLInputElement | null>(null)
const popupStyle = ref<Record<string, string>>({})
// 'down' | 'up' — flip wenn nicht genug Platz darunter
const popupDir = ref<'down' | 'up'>('down')

// ----------------------------------------------------------------
// Resource-spezifische Mappings
// ----------------------------------------------------------------
function fetchByType(): Promise<{ data: any[] }> {
  switch (props.osType) {
    case 'network':
      return openstackResourcesApi.listNetworks()
    case 'subnet':
      return openstackResourcesApi.listSubnets(props.filterNetworkId || undefined)
    case 'flavor':
      return openstackResourcesApi.listFlavors()
    case 'image':
      return openstackResourcesApi.listImages('active')
    case 'keypair':
      return openstackResourcesApi.listKeypairs()
    case 'security_group':
      return openstackResourcesApi.listSecurityGroups()
    case 'floating_ip_pool':
      return openstackResourcesApi.listFloatingIpPools()
    case 'volume':
      return openstackResourcesApi.listVolumes()
    case 'router':
      return openstackResourcesApi.listRouters()
    case 'availability_zone':
      return openstackResourcesApi.listAvailabilityZones(props.azService || 'compute')
  }
}

function adapt(raw: any): ResourceItem {
  // Pro Type eine Anzeige-Adaptation. Sekundär = grobe Spec-Info.
  switch (props.osType) {
    case 'flavor':
      return {
        id: raw.id ?? '',
        name: raw.name ?? '',
        secondary: `${raw.vcpus ?? 0} vCPU · ${formatRam(raw.ram)} RAM · ${raw.disk ?? 0} GB Disk`,
        tertiary: raw.is_public ? '' : 'Privat',
        raw,
      }
    case 'image':
      return {
        id: raw.id ?? '',
        name: raw.name ?? '',
        secondary: raw.disk_format ? `${raw.disk_format} · ${formatBytes(raw.size)}` : formatBytes(raw.size),
        tertiary: raw.status === 'active' ? '' : raw.status,
        raw,
      }
    case 'network':
      return {
        id: raw.id ?? '',
        name: raw.name ?? '',
        secondary: raw.description || '',
        tertiary: [raw.shared ? 'Shared' : '', raw.external ? 'External' : ''].filter(Boolean).join(' · '),
        raw,
      }
    case 'subnet':
      return {
        id: raw.id ?? '',
        name: raw.name ?? '',
        secondary: `${raw.cidr || '?'}  IPv${raw.ip_version ?? 4}`,
        tertiary: raw.gateway_ip ? `GW: ${raw.gateway_ip}` : '',
        raw,
      }
    case 'keypair':
      return {
        id: raw.name ?? '',
        name: raw.name ?? '',
        secondary: raw.fingerprint ? raw.fingerprint.slice(0, 16) + '…' : '',
        tertiary: raw.type || 'ssh',
        raw,
      }
    case 'security_group':
      return {
        id: raw.id ?? '',
        name: raw.name ?? '',
        secondary: raw.description || '',
        raw,
      }
    case 'floating_ip_pool':
      return {
        id: raw.id ?? '',
        name: raw.name ?? '',
        secondary: raw.description || '',
        raw,
      }
    case 'volume':
      return {
        id: raw.id ?? '',
        name: raw.name || '(unbenannt)',
        secondary: `${raw.size ?? 0} GB · ${raw.volume_type || ''}`,
        tertiary: [raw.bootable ? 'bootable' : '', raw.status].filter(Boolean).join(' · '),
        raw,
      }
    case 'router':
      return {
        id: raw.id ?? '',
        name: raw.name ?? '',
        secondary: raw.status || '',
        tertiary: raw.external_gateway_info ? 'External Gateway' : '',
        raw,
      }
    case 'availability_zone':
      return {
        id: raw.name ?? '',
        name: raw.name ?? '',
        secondary: raw.state || '',
        raw,
      }
  }
}

// ----------------------------------------------------------------
// Selection-Logik
// ----------------------------------------------------------------
const selectedKeys = computed<Set<string>>(() => {
  const v = props.modelValue
  if (props.multi) {
    if (Array.isArray(v)) return new Set(v.filter(Boolean))
    if (typeof v === 'string' && v.trim()) {
      return new Set(v.split(',').map((s) => s.trim()).filter(Boolean))
    }
    return new Set()
  }
  return new Set(typeof v === 'string' && v ? [v] : [])
})

const valueOf = (item: ResourceItem): string =>
  props.osMode === 'id' ? item.id : item.name

const isSelected = (item: ResourceItem): boolean =>
  selectedKeys.value.has(valueOf(item))

/**
 * Anzeige-Liste der aktuellen Selection. Zwei Quellen:
 *  1. ``items`` (= dieser Picker hat schon geladen)
 *  2. Display-Cache (= ein anderer Picker / Summary-View hat geladen)
 *
 * Wenn weder noch greift, fallen wir auf den Roh-Wert zurück und
 * markieren ihn als ``known: false``.
 */
const selectedDisplay = computed(() => {
  const out: { value: string; displayName: string; known: boolean }[] = []
  const mode: Mode = props.osMode || 'name'
  for (const key of selectedKeys.value) {
    // Lokale items sind die Quelle der Wahrheit, falls geladen
    const local = items.value.find((it) => valueOf(it) === key)
    if (local) {
      out.push({ value: key, displayName: local.name, known: true })
      continue
    }
    // Sonst Display-Cache fragen — geteilt zwischen allen Pickern
    const cached = getDisplayName(props.osType, mode, key)
    if (cached) {
      out.push({ value: key, displayName: cached.name, known: cached.known })
    } else {
      out.push({ value: key, displayName: key, known: false })
    }
  }
  return out
})

const filteredItems = computed<ResourceItem[]>(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return items.value
  return items.value.filter(
    (it) =>
      it.name.toLowerCase().includes(q) ||
      it.id.toLowerCase().includes(q) ||
      (it.secondary || '').toLowerCase().includes(q),
  )
})

function toggle(item: ResourceItem) {
  const key = valueOf(item)
  if (props.multi) {
    const current = new Set(selectedKeys.value)
    if (current.has(key)) current.delete(key)
    else current.add(key)
    if (Array.isArray(props.modelValue)) {
      emit('update:modelValue', Array.from(current))
    } else {
      emit('update:modelValue', Array.from(current).join(', '))
    }
  } else {
    const newVal = isSelected(item) ? '' : key
    emit('update:modelValue', newVal)
    closeDropdown()
  }
}

function removeChip(value: string) {
  if (!props.multi) {
    emit('update:modelValue', '')
    return
  }
  const current = new Set(selectedKeys.value)
  current.delete(value)
  if (Array.isArray(props.modelValue)) {
    emit('update:modelValue', Array.from(current))
  } else {
    emit('update:modelValue', Array.from(current).join(', '))
  }
}

// ----------------------------------------------------------------
// Loading / Refresh
// ----------------------------------------------------------------
async function load(opts: { forceRefresh?: boolean } = {}) {
  isLoading.value = true
  errorReason.value = null
  errorMessage.value = ''
  try {
    if (opts.forceRefresh) {
      try {
        await openstackResourcesApi.refresh(props.osType)
      } catch (err) {
        console.warn('[OsPicker] refresh failed:', err)
      }
      invalidateDisplayCache(props.osType)
    }
    const res = await fetchByType()
    items.value = (res.data || []).map(adapt)
    // Display-Cache befüllen für andere Picker / Summary-View. Nur,
    // wenn wir UNGEFILTERT geladen haben — eine subnet-pro-network-
    // gefilterte Liste darf nicht den globalen Cache stören.
    if (!props.filterNetworkId) {
      primeDisplayCache(props.osType, res.data || [])
    }
  } catch (err: any) {
    const status = err?.response?.status
    const detail = err?.response?.data?.detail
    if (status === 412 && detail?.reason === 'openstack_credentials_missing') {
      errorReason.value = 'credentials_missing'
    } else if (status === 502 || detail?.reason === 'openstack_unavailable' ||
               detail?.reason === 'openstack_list_failed') {
      errorReason.value = 'unavailable'
      errorMessage.value = detail?.message || err?.message || 'OpenStack ist gerade nicht erreichbar.'
    } else {
      errorReason.value = 'unavailable'
      errorMessage.value = err?.message || 'Resource konnte nicht geladen werden.'
    }
    items.value = []
  } finally {
    isLoading.value = false
  }
}

async function handleRefresh() {
  await load({ forceRefresh: true })
  if (errorReason.value === null) {
    toast.success('Liste aktualisiert.')
  }
}

// Subnet-Filter / AZ-Service: bei Wechsel neu laden.
watch(
  () => [props.filterNetworkId, props.azService, props.osType],
  () => {
    if (!isFreeTextMode.value) load()
  },
)

onMounted(() => {
  if (props.allowFreeText && shouldStartInFreeText()) {
    isFreeTextMode.value = true
    freeTextValue.value = typeof props.modelValue === 'string' ? props.modelValue : ''
    return
  }
  load()
  // Cache füttern, falls nicht-gefilterter Picker. Andere Komponenten
  // (Summary-View) können dann sofort den Namen lesen.
  if (!props.filterNetworkId) {
    ensureLoaded(props.osType)
  }
})

function shouldStartInFreeText(): boolean {
  return false
}

// ----------------------------------------------------------------
// Free-Text-Fallback
// ----------------------------------------------------------------
function enableFreeText() {
  isFreeTextMode.value = true
  freeTextValue.value = props.multi
    ? (Array.isArray(props.modelValue) ? props.modelValue.join(', ') : (props.modelValue || ''))
    : (typeof props.modelValue === 'string' ? props.modelValue : '')
  closeDropdown()
}

function disableFreeText() {
  isFreeTextMode.value = false
  load()
}

function onFreeTextInput(val: string) {
  freeTextValue.value = val
  if (props.multi) {
    if (Array.isArray(props.modelValue)) {
      emit('update:modelValue', val.split(',').map((s) => s.trim()).filter(Boolean))
    } else {
      emit('update:modelValue', val)
    }
  } else {
    emit('update:modelValue', val.trim())
  }
}

// ----------------------------------------------------------------
// Display-Helpers
// ----------------------------------------------------------------
function formatBytes(bytes: number | undefined | null): string {
  if (!bytes) return ''
  const mb = bytes / (1024 * 1024)
  if (mb < 1024) return `${mb.toFixed(0)} MB`
  return `${(mb / 1024).toFixed(1)} GB`
}

function formatRam(mb: number | undefined | null): string {
  if (!mb) return '0 MB'
  if (mb < 1024) return `${mb} MB`
  return `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)} GB`
}

function osTypeLabel(): string {
  switch (props.osType) {
    case 'network': return 'Network'
    case 'subnet': return 'Subnet'
    case 'flavor': return 'Flavor'
    case 'image': return 'Image'
    case 'keypair': return 'Keypair'
    case 'security_group': return 'Security Group'
    case 'floating_ip_pool': return 'Floating-IP Pool'
    case 'volume': return 'Volume'
    case 'router': return 'Router'
    case 'availability_zone': return 'Availability Zone'
  }
}

const placeholderText = computed(() => {
  if (props.placeholder) return props.placeholder
  return props.multi
    ? `${osTypeLabel()}s wählen…`
    : `${osTypeLabel()} wählen…`
})

// ----------------------------------------------------------------
// Floating Dropdown — Position + Lifecycle
// ----------------------------------------------------------------
/**
 * Positioniert das Dropdown-Panel relativ zur Trigger-Rect.
 *
 * Wir nutzen ``position: fixed`` + ``top``/``left``/``width`` aus der
 * Bounding-Rect. Vorteil: kein Scroll-Container-Surfing nötig, und der
 * Body ist die Anchor — passt zum ``Teleport to="body"``.
 *
 * Flip-Logik: liegt der Trigger so weit unten, dass das Panel nicht
 * mehr in den Viewport passt, klappen wir nach OBEN.
 */
function recalcPosition() {
  const trigger = triggerEl.value
  if (!trigger) return
  const rect = trigger.getBoundingClientRect()
  const viewportH = window.innerHeight
  // Wenn Trigger aus dem Viewport raus ist, schließen wir das
  // Dropdown — sonst hängt es ohne sichtbaren Anker irgendwo.
  if (rect.bottom < 0 || rect.top > viewportH) {
    isOpen.value = false
    return
  }
  const PANEL_MAX_H = 384 // Tailwind max-h-96
  const GAP = 4
  const spaceBelow = viewportH - rect.bottom
  const spaceAbove = rect.top
  const flipUp = spaceBelow < PANEL_MAX_H && spaceAbove > spaceBelow
  popupDir.value = flipUp ? 'up' : 'down'

  if (flipUp) {
    popupStyle.value = {
      position: 'fixed',
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      bottom: `${viewportH - rect.top + GAP}px`,
      maxHeight: `${Math.max(spaceAbove - GAP - 8, 200)}px`,
      zIndex: '60',
    }
  } else {
    popupStyle.value = {
      position: 'fixed',
      left: `${rect.left}px`,
      width: `${rect.width}px`,
      top: `${rect.bottom + GAP}px`,
      maxHeight: `${Math.max(spaceBelow - GAP - 8, 200)}px`,
      zIndex: '60',
    }
  }
}

function openDropdown() {
  isOpen.value = true
  // nextTick: warten bis das Panel im DOM ist, dann positionieren
  // und Search-Input fokussieren.
  nextTick(() => {
    recalcPosition()
    searchInputEl.value?.focus()
  })
  // Listener so lange registrieren, wie das Dropdown auf ist.
  // ``capture: true`` bei Scroll, damit auch Scroll innerhalb von
  // overflow-Containern (Wizard-Card) reagiert.
  window.addEventListener('scroll', recalcPosition, true)
  window.addEventListener('resize', recalcPosition)
  document.addEventListener('mousedown', onDocumentMouseDown)
  document.addEventListener('keydown', onKeydown)
}

function closeDropdown() {
  if (!isOpen.value) return
  isOpen.value = false
  searchQuery.value = ''
  window.removeEventListener('scroll', recalcPosition, true)
  window.removeEventListener('resize', recalcPosition)
  document.removeEventListener('mousedown', onDocumentMouseDown)
  document.removeEventListener('keydown', onKeydown)
}

function toggleDropdown() {
  if (isOpen.value) closeDropdown()
  else openDropdown()
}

function onDocumentMouseDown(ev: MouseEvent) {
  const target = ev.target as Node | null
  if (!target) return
  if (triggerEl.value?.contains(target)) return
  if (dropdownEl.value?.contains(target)) return
  closeDropdown()
}

function onKeydown(ev: KeyboardEvent) {
  if (ev.key === 'Escape') closeDropdown()
}

// Component-Unmount: garantiert Listener entfernen, sonst bleibt das
// Body-Teleport-Panel als Zombie-Listener aktiv, wenn der User
// während offenem Dropdown zur nächsten Wizard-Page navigiert.
onBeforeUnmount(() => {
  closeDropdown()
})
</script>

<template>
  <div class="space-y-2">
    <!-- ============================================================ -->
    <!-- Free-Text-Modus (Fallback bei OS-down oder explizit gewählt) -->
    <!-- ============================================================ -->
    <div v-if="isFreeTextMode" class="space-y-2">
      <div class="flex items-center justify-between">
        <span class="text-xs text-gray-500 flex items-center gap-1">
          <Pencil :size="12" />
          Manuell ({{ osMode === 'id' ? 'UUID' : 'Name' }})
        </span>
        <button
          @click="disableFreeText"
          type="button"
          class="text-xs text-emerald-700 hover:text-emerald-900 underline"
        >
          Liste wieder anzeigen
        </button>
      </div>
      <input
        :value="freeTextValue"
        @input="onFreeTextInput(($event.target as HTMLInputElement).value)"
        type="text"
        :placeholder="multi ? 'Werte mit Komma trennen' : `${osTypeLabel()}-${osMode === 'id' ? 'UUID' : 'Name'} eingeben`"
        class="w-full px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-emerald-500 outline-none font-mono text-sm"
      />
    </div>

    <!-- ============================================================ -->
    <!-- Credentials fehlen → CTA-Banner statt leerer Picker          -->
    <!-- ============================================================ -->
    <div v-else-if="errorReason === 'credentials_missing'">
      <CredentialMissingBanner
        variant="warning"
        title="OpenStack-Credentials fehlen"
        :message="`Hinterlege deine Zugangsdaten, dann kannst du ${osTypeLabel()}s direkt aus deinem Project wählen.`"
        cta="Credentials einrichten"
        ctaTo="/user/openstack"
        next="/deployment/new/variables"
      />
      <button
        v-if="allowFreeText"
        @click="enableFreeText"
        type="button"
        class="mt-2 text-xs text-emerald-700 hover:text-emerald-900 underline"
      >
        Stattdessen {{ osMode === 'id' ? 'UUID' : 'Name' }} manuell eingeben
      </button>
    </div>

    <!-- ============================================================ -->
    <!-- Picker (Single oder Multi) — Trigger-Button + Floating Panel  -->
    <!-- ============================================================ -->
    <div v-else class="space-y-2">
      <div class="flex items-start gap-2">
        <div class="flex-grow min-w-0">
          <button
            ref="triggerEl"
            @click="toggleDropdown"
            type="button"
            class="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border-2 border-gray-200 bg-white hover:border-emerald-300 transition focus:border-emerald-500 outline-none text-left"
          >
            <div class="flex flex-wrap items-center gap-1.5 flex-grow min-w-0">
              <!-- Single -->
              <template v-if="!multi">
                <template v-if="selectedDisplay.length === 0">
                  <span class="text-gray-400 text-sm">{{ placeholderText }}</span>
                </template>
                <template v-else>
                  <span
                    class="font-medium text-gray-900 text-sm truncate"
                    :title="selectedDisplay[0].value"
                  >
                    {{ selectedDisplay[0].displayName }}
                  </span>
                  <span
                    v-if="!selectedDisplay[0].known"
                    class="text-xs text-amber-600 ml-1"
                    :title="`Wert wird geladen oder ist nicht in der aktuellen Liste`"
                  >
                    (manuell)
                  </span>
                </template>
              </template>

              <!-- Multi: Chips -->
              <template v-else>
                <template v-if="selectedDisplay.length === 0">
                  <span class="text-gray-400 text-sm">{{ placeholderText }}</span>
                </template>
                <span
                  v-for="(entry, i) in selectedDisplay"
                  :key="i"
                  class="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-xs font-medium border border-emerald-200"
                  :class="entry.known ? '' : 'border-amber-200 bg-amber-50 text-amber-700'"
                  :title="entry.value"
                  @click.stop
                >
                  <span class="truncate max-w-[160px]">{{ entry.displayName }}</span>
                  <button
                    @click.stop="removeChip(entry.value)"
                    type="button"
                    class="hover:text-emerald-900"
                  >
                    <X :size="12" />
                  </button>
                </span>
              </template>
            </div>
            <component :is="isOpen ? ChevronUp : ChevronDown" :size="16" class="text-gray-400 flex-shrink-0" />
          </button>
        </div>

        <button
          @click="handleRefresh"
          type="button"
          :disabled="isLoading"
          class="flex-shrink-0 p-2 text-gray-500 hover:text-emerald-700 disabled:opacity-50 transition"
          title="Liste aktualisieren"
        >
          <RefreshCw :size="16" :class="isLoading ? 'animate-spin' : ''" />
        </button>
      </div>
    </div>

    <!-- ============================================================ -->
    <!-- Floating Dropdown — Teleport auf Body-Level                  -->
    <!-- ============================================================ -->
    <Teleport to="body">
      <div
        v-if="isOpen && !isFreeTextMode && errorReason !== 'credentials_missing'"
        ref="dropdownEl"
        :style="popupStyle"
        class="border-2 border-gray-200 rounded-lg bg-white shadow-2xl overflow-hidden flex flex-col"
        @mousedown.stop
      >
        <!-- Search -->
        <div class="relative border-b border-gray-100 p-2 flex-shrink-0">
          <Search :size="14" class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref="searchInputEl"
            v-model="searchQuery"
            type="text"
            :placeholder="`${osTypeLabel()} suchen...`"
            class="w-full pl-7 pr-2 py-1.5 rounded text-sm outline-none border border-transparent focus:border-emerald-300"
          />
        </div>

        <!-- Loading -->
        <div v-if="isLoading" class="p-6 text-center text-gray-400 text-sm">
          <div class="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-emerald-600 mb-2"></div>
          <p>Lade {{ osTypeLabel() }}s…</p>
        </div>

        <!-- Error: OpenStack down -->
        <div v-else-if="errorReason === 'unavailable'" class="p-4">
          <div class="flex items-start gap-2 text-amber-700 mb-2">
            <AlertTriangle :size="16" class="flex-shrink-0 mt-0.5" />
            <div class="text-sm">
              <p class="font-medium">OpenStack nicht erreichbar</p>
              <p class="text-xs text-amber-600 mt-1">{{ errorMessage }}</p>
            </div>
          </div>
          <div class="flex gap-2 mt-2">
            <button
              @click="handleRefresh"
              type="button"
              class="text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
            >
              Erneut versuchen
            </button>
            <button
              v-if="allowFreeText"
              @click="enableFreeText"
              type="button"
              class="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              Manuell eingeben
            </button>
          </div>
        </div>

        <!-- Empty -->
        <div v-else-if="filteredItems.length === 0" class="p-6 text-center text-gray-500 text-sm">
          <p v-if="searchQuery">Keine Treffer für „{{ searchQuery }}".</p>
          <template v-else>
            <p class="mb-2">Keine {{ osTypeLabel() }}s in deinem Project.</p>
            <button
              v-if="allowFreeText"
              @click="enableFreeText"
              type="button"
              class="text-xs text-emerald-700 hover:text-emerald-900 underline inline-flex items-center gap-1"
            >
              <Pencil :size="12" /> Manuell eingeben
            </button>
          </template>
        </div>

        <!-- Items — flex-grow + overflow-auto, damit max-height
             aus popupStyle die Scrolling-Region begrenzt -->
        <ul v-else class="flex-grow overflow-y-auto divide-y divide-gray-100">
          <li
            v-for="item in filteredItems"
            :key="item.id || item.name"
            @click="toggle(item)"
            class="flex items-center gap-3 px-3 py-2 hover:bg-emerald-50 cursor-pointer transition"
            :class="isSelected(item) ? 'bg-emerald-50' : ''"
          >
            <div
              class="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border"
              :class="
                isSelected(item)
                  ? 'bg-emerald-500 border-emerald-500'
                  : 'bg-white border-gray-300'
              "
            >
              <Check v-if="isSelected(item)" :size="12" class="text-white" />
            </div>

            <div class="flex-grow min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-medium text-gray-900 text-sm truncate">{{ item.name || '(unbenannt)' }}</span>
                <span
                  v-if="item.tertiary"
                  class="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium flex-shrink-0"
                >
                  {{ item.tertiary }}
                </span>
              </div>
              <div v-if="item.secondary" class="text-xs text-gray-500 truncate">
                {{ item.secondary }}
              </div>
              <!-- ID-Anzeige in id-Mode als sekundärer Hinweis;
                   im UI selbst wird der ``name`` als Hauptlabel
                   gezeigt (auch wenn der gespeicherte Wert die UUID
                   ist), das hier ist nur die Disambiguierung. -->
              <div v-if="osMode === 'id' && item.id" class="text-[10px] text-gray-400 font-mono truncate">
                {{ item.id }}
              </div>
            </div>
          </li>
        </ul>

        <!-- Footer mit Mode-Hint -->
        <div class="border-t border-gray-100 px-3 py-1.5 bg-gray-50 flex items-center justify-between text-[11px] text-gray-500 flex-shrink-0">
          <span>
            <template v-if="osMode === 'id'">Speichert UUID</template>
            <template v-else>Speichert Name</template>
            <template v-if="multi"> · Mehrfachauswahl</template>
          </span>
          <button
            v-if="allowFreeText"
            @click="enableFreeText"
            type="button"
            class="text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1"
          >
            <Pencil :size="10" /> Manuell
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>
