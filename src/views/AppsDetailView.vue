<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { appApi } from '@/api/app.api'
import { useToast } from '@/composables/useToast'
import {
  Layers, Server, Box, Database, Terminal,
  Globe, LayoutTemplate, Shield, ArrowLeft, RefreshCw, GitBranch
} from 'lucide-vue-next'
import { useDeploymentStore } from '@/stores/deployment.store' // Store importieren

const deploymentStore = useDeploymentStore() // Store initialisieren
const route = useRoute()
const router = useRouter()
const toast = useToast()

const isLoading = ref(false)
const isRefreshing = ref(false) // Für den manuellen Refresh Button
const app = ref<any>(null) // 'any' verhindert Typ-Fehler, falls das Type-Interface noch nicht aktualisiert ist
const selectedVersion = ref('')

// ID aus der Route holen (aus /apps/:id)
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

  // Loading State nur beim ersten Laden oder explizitem Refresh anzeigen
  if (forceRefresh) {
    isRefreshing.value = true
  } else {
    isLoading.value = true
  }

  try {
    // KORREKTUR: Hier nutzen wir jetzt 'getById' passend zu deiner API-Datei
    const response = await appApi.getById(appId.value, forceRefresh)
    app.value = response.data

    // Falls Versionen da sind, wählen wir standardmäßig die erste (meist neueste) aus
    if (app.value.versions && app.value.versions.length > 0 && !selectedVersion.value) {
      selectedVersion.value = app.value.versions[0]
    }
  } catch (error) {
    console.error('Fehler beim Laden der App-Details:', error)
    toast.error('App-Details konnten nicht geladen werden.')

    // Fallback: Zurück zur Übersicht bei 404
    if (!app.value) {
      router.push({ name: 'apps.index' }) // Stelle sicher, dass diese Route in router/index.ts so benannt ist, sonst '/apps'
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

  // --- DER ENTSCHEIDENDE TEIL ---
  // 1. Zuerst den Draft im Store zurücksetzen (Sicherheitshalber)
  deploymentStore.resetDraft()

  // 2. Die Daten der gewählten App in den Store-Draft schreiben
  deploymentStore.draft.appId = app.value.appId || app.value.id
  deploymentStore.draft.releaseTag = selectedVersion.value

  toast.success(`Konfiguration für ${app.value.name} wird vorbereitet.`)

  // 4. Weiterleitung zur Config-Seite (wo man Kurse/Studenten wählt)
  router.push({ name: 'deployment.config' })
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
                  {{ app.created_at ? new Date(app.created_at).toLocaleDateString() : '-' }}
                </span>
              </li>
              <li class="flex justify-between">
                <span>Erstellt von:</span>
                <span class="font-medium">{{ app.user?.username || 'Unbekannt' }}</span>
              </li>
            </ul>
          </div>
        </div>

        <div class="bg-[#FAFAFA] border border-gray-200 rounded-xl p-6 h-fit sticky top-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">Deployment starten</h2>

          <div class="mb-6">
            <div class="flex justify-between items-center mb-2">
              <label class="block text-sm font-medium text-gray-700">Version auswählen</label>
              <button
                  @click="fetchAppDetails(true)"
                  class="text-xs text-primary hover:text-primary-dark flex items-center gap-1"
                  :disabled="isRefreshing"
              >
                <RefreshCw :size="12" :class="{ 'animate-spin': isRefreshing }" />
                Refresh
              </button>
            </div>

            <div class="relative">
              <select
                  v-model="selectedVersion"
                  class="block w-full rounded-lg border-gray-300 bg-white py-3 pl-3 pr-10 text-gray-900 focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm border shadow-sm cursor-pointer disabled:bg-gray-100 disabled:text-gray-400"
                  :disabled="!app.versions || app.versions.length === 0"
              >
                <option value="" disabled>Bitte wählen...</option>
                <option v-for="ver in app.versions" :key="ver" :value="ver">
                  {{ ver }}
                </option>
              </select>
            </div>

            <p v-if="!app.versions || app.versions.length === 0" class="text-xs text-red-500 mt-2">
              Keine Versionen gefunden. Bitte Git-Tags prüfen.
            </p>
          </div>

          <button
              @click="handleDeploy"
              :disabled="!selectedVersion"
              class="w-full bg-[#2E5C46] text-white px-4 py-3 rounded-lg font-bold hover:bg-[#234a36] transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Layers :size="18" />
            Jetzt Deployen
          </button>
        </div>

      </div>

    </div>
  </div>
</template>