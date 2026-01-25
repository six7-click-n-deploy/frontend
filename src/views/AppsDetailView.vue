<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { appApi } from '@/api/app.api'
import { useToast } from '@/composables/useToast'
import {
  Layers, Server, Box, Database, Terminal,
  Globe, LayoutTemplate, Shield, ArrowLeft, GitBranch,
  Trash2 // <--- NEU: Icon importiert
} from 'lucide-vue-next'
import { useDeploymentStore } from '@/stores/deployment.store'

const deploymentStore = useDeploymentStore()
const route = useRoute()
const router = useRouter()
const toast = useToast()

const isLoading = ref(false)
const isRefreshing = ref(false)
const app = ref<any>(null)
const selectedVersion = ref('')

// Nur die Version-Strings aus app.versions aufbereiten (robust gegen Objekte)
const versionOptions = computed(() => {
  const raw = app.value?.versions || []
  return raw
    .map((v: any) => (typeof v === 'string' ? v : v?.version || v?.releaseTag || ''))
    .filter((v: string) => Boolean(v))
})

// Details der aktuell ausgewählten Version aus dem vorhandenen JSON ziehen
const selectedVersionDetails = computed(() => {
  if (!app.value?.versions || !selectedVersion.value) return null
  const match = app.value.versions.find((v: any) => {
    if (typeof v === 'string') return v === selectedVersion.value
    return (
      v?.version === selectedVersion.value ||
      v?.releaseTag === selectedVersion.value ||
      v?.tag === selectedVersion.value
    )
  })
  if (!match) return null
  return typeof match === 'string' ? { version: match } : match
})

// Hinweis: Versionsdetails werden ausschließlich aus selectedVersionDetails angezeigt

// Datum formatieren (ISO-Strings -> MM/DD/YYYY)
const formatDate = (val: any) => {
  if (val instanceof Date) {
    return val.toLocaleDateString('en-US')
  }
  if (typeof val === 'string') {
    const d = new Date(val)
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US')
    }
  }
  return val
}

// Geordnete Anzeige-Felder für die gewählte Version
const versionInfo = computed(() => {
  const d: any = selectedVersionDetails.value
  if (!d || typeof d !== 'object') return null
  return {
    name: d.name ?? '',
    type: d.type ?? '',
    commit: d.commit ?? d.commit_sha ?? '',
    description: d.description ?? '',
    author: d.author ?? d.commit_author ?? '',
    published_at: d.published_at ?? d.commit_date ?? '',
    prerelease: d.prerelease ?? '',
    html_url: d.html_url ?? d.url ?? ''
  }
})

const hasVersionInfo = computed(() => {
  const d: any = selectedVersionDetails.value
  if (!d || typeof d !== 'object') return false
  return [
    'name', 'type', 'commit', 'description', 'author', 'published_at', 'prerelease', 'html_url',
    'commit_sha', 'commit_author', 'commit_date', 'url'
  ].some((k) => Boolean(d[k]))
})

// ID aus der Route holen
const appId = computed(() => route.params.id as string)

// Hilfsfunktion: Icon Logik
const getIconForApp = (appName: string) => {
  const name = (appName || '').toLowerCase()
  if (name.includes('node')) return Server
  if (name.includes('vue') || name.includes('front')) return LayoutTemplate
  if (name.includes('react')) return Globe
  if (name.includes('python') || name.includes('jupyter') || name.includes('fastapi')) return Box
  if (name.includes('postgres') || name.includes('sql') || name.includes('data')) return Database
  if (name.includes('docker') || name.includes('container')) return Terminal
  if (name.includes('security') || name.includes('pen')) return Shield
  return Layers
}

// Daten laden
const fetchAppDetails = async (forceRefresh = false) => {
  if (!appId.value) return

  if (forceRefresh) {
    isRefreshing.value = true
  } else {
    isLoading.value = true
  }

  try {
    const response = await appApi.getById(appId.value, forceRefresh)
    app.value = response.data

    if (versionOptions.value.length > 0 && !selectedVersion.value) {
      selectedVersion.value = versionOptions.value[0]
    }
  } catch (error) {
    console.error('Fehler beim Laden der App-Details:', error)
    toast.error('App-Details konnten nicht geladen werden.')

    if (!app.value) {
      router.push({ name: 'apps.index' })
    }
  } finally {
    isLoading.value = false
    isRefreshing.value = false
  }
}

const handleDeploy = () => {
  if (!selectedVersion.value) {
    toast.warning('Bitte wähle zuerst eine Version aus.')
    return
  }

  deploymentStore.resetDraft()
  deploymentStore.draft.appId = app.value.appId || app.value.id
  // deploymentStore.draft.releaseTag = selectedVersion.value

  toast.success(`Konfiguration für ${app.value.name} wird vorbereitet.`)
  router.push({ name: 'deployment.config' })
}

// --- NEU: App Löschen Funktion ---
const handleDelete = async () => {
  if (!app.value) return

  // Sicherheitsabfrage
  if (!confirm(`Möchtest du die App "${app.value.name}" wirklich unwiderruflich löschen?`)) {
    return
  }

  const safeId = app.value.appId || app.value.id || app.value._id

  try {
    isLoading.value = true // Kurzes Laden anzeigen
    await appApi.delete(safeId)
    toast.success('App erfolgreich gelöscht.')

    // Zurück zur Übersicht leiten
    router.push({ name: 'apps' })
  } catch (error) {
    console.error('Fehler beim Löschen:', error)
    toast.error('App konnte nicht gelöscht werden.')
    isLoading.value = false
  }
}

onMounted(() => {
  fetchAppDetails()
})
</script>

<template>
  <div class="bg-white rounded-2xl p-10 border min-h-[600px]">

    <div class="mb-8">
      <button
          @click="router.back()"
          class="flex items-center text-gray-500 hover:text-gray-900 transition-colors mb-4"
      >
        <ArrowLeft :size="20" class="mr-2" /> Zurück zur Übersicht
      </button>
    </div>

    <div v-if="isLoading" class="flex justify-center py-20">
      <div class="flex flex-col items-center gap-3">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <div class="text-gray-400">Lade App Details...</div>
      </div>
    </div>

    <div v-else-if="app" class="max-w-4xl mx-auto">

      <div class="flex items-start gap-6 mb-8 border-b border-gray-100 pb-8">
        <div class="bg-[#EFF5F2] p-4 rounded-xl shadow-sm text-primary">
          <component :is="getIconForApp(app.name)" :size="48" />
        </div>
        <div class="flex-grow">
          <div class="flex justify-between items-start">
            <div>
              <h1 class="text-3xl font-bold text-gray-900 mb-2">{{ app.name }}</h1>
              <div class="flex items-center gap-3 text-sm text-gray-500">
                <span class="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                  <GitBranch :size="14" /> {{ app.versions?.length || 0 }} Versionen verfügbar
                </span>
                <span v-if="app.git_link" class="text-blue-600 hover:underline cursor-pointer">
                  {{ app.git_link }}
                </span>
              </div>
            </div>

            <button
                @click="handleDelete"
                class="flex items-center gap-2 text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors text-sm font-medium"
            >
              <Trash2 :size="18" />
              App Löschen
            </button>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-12">

        <div class="lg:col-span-2 space-y-6">
          <div>
            <h2 class="text-xl font-semibold text-gray-900 mb-3">Beschreibung</h2>
            <p class="text-gray-600 leading-relaxed text-lg">
              {{ app.description || 'Keine detaillierte Beschreibung für diese App verfügbar.' }}
            </p>
          </div>

          <div class="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">App Informationen</h3>
            <ul class="space-y-2 text-sm text-gray-600">
              <li class="flex justify-between">
                <span>Erstellt am:</span>
                <span class="font-medium">
                  {{ app.created_at ? formatDate(app.created_at) : '-' }}
                </span>
              </li>
              <li class="flex justify-between">
                <span>Erstellt von:</span>
                <span class="font-medium">{{ app.user?.username || 'Unbekannt' }}</span>
              </li>
            </ul>
          </div>
          <div class="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Versionsdetails</h3>
            <div class="space-y-6">
              <!-- Version spezifische Felder in fester Reihenfolge -->
              <div v-if="hasVersionInfo && versionInfo" class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-600">Name:</span>
                  <span class="font-medium text-right">{{ versionInfo.name || '-' }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Typ:</span>
                  <span class="font-medium text-right">{{ versionInfo.type || '-' }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Commit:</span>
                  <span class="font-medium text-right">{{ versionInfo.commit || '-' }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Autor:</span>
                  <span class="font-medium text-right">{{ versionInfo.author || '-' }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Published at:</span>
                  <span class="font-medium text-right">{{ versionInfo.published_at ? formatDate(versionInfo.published_at) : '-' }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">Pre-Release:</span>
                  <span class="font-medium text-right">
                    {{ String(versionInfo.prerelease ?? '').toLowerCase() === 'true' ? 'Yes' : (versionInfo.prerelease === '' ? '-' : 'No') }}
                  </span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-gray-600">Link:</span>
                  <template v-if="versionInfo.html_url">
                    <a :href="versionInfo.html_url" target="_blank" rel="noopener" class="font-medium text-blue-600 hover:underline break-all">{{ versionInfo.html_url }}</a>
                  </template>
                  <span v-else class="font-medium text-right">-</span>
                </div>
              </div>

              <!-- Leerer Zustand -->
              <p v-if="!hasVersionInfo" class="text-xs text-gray-400">Keine weiteren Angaben zur Version.</p>
            </div>
          </div>

          <!-- Beschreibungs-Container der Version -->
          <div v-if="versionInfo && versionInfo.description" class="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Versionsbeschreibung</h3>
            <p class="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{{ versionInfo.description }}</p>
          </div>
        </div>

        <div class="bg-[#FAFAFA] border border-gray-200 rounded-xl p-6 h-fit sticky top-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-6">Deployment starten</h2>

          <!-- Version Auswahl -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">Version auswählen</label>
            <select
                v-model="selectedVersion"
                class="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm text-gray-900 focus:ring-2 focus:ring-primary focus:border-primary shadow-sm cursor-pointer transition-all hover:border-gray-400"
                :disabled="versionOptions.length === 0"
            >
              <option v-for="ver in versionOptions" :key="ver" :value="ver">
                {{ ver }}
              </option>
            </select>
          </div>

          <!-- Deploy Button -->
          <button
              @click="handleDeploy"
              :disabled="!selectedVersion"
              class="w-full bg-gradient-to-r from-[#2E5C46] to-[#234a36] text-white px-4 py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
          >
            <Layers :size="18" />
            Jetzt Deployen
          </button>
        </div>

      </div>

    </div>
  </div>
</template>