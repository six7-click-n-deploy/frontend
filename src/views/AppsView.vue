<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { appApi } from '@/api/app.api'
import {
  Layers, Server, Box, Database, Terminal,
  Globe, LayoutTemplate, Shield, Inbox
} from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'

const toast = useToast()
const router = useRouter()

const isLoading = ref(false)
const apps = ref<any[]>([])

// Hilfsfunktion: Wählt Icon basierend auf dem Namen
const getIconForApp = (app: any) => {
  const name = (app.name || '').toLowerCase()
  if (name.includes('node')) return Server
  if (name.includes('vue') || name.includes('front')) return LayoutTemplate
  if (name.includes('react')) return Globe
  if (name.includes('python') || name.includes('jupyter') || name.includes('fastapi')) return Box
  if (name.includes('postgres') || name.includes('sql') || name.includes('data')) return Database
  if (name.includes('docker') || name.includes('container')) return Terminal
  if (name.includes('security') || name.includes('pen')) return Shield
  return Layers
}

const fetchApps = async () => {
  isLoading.value = true
  try {
    const response = await appApi.list()
    // Wenn Daten da sind, zuweisen, sonst leeres Array
    apps.value = (response.data && Array.isArray(response.data)) ? response.data : []
  } catch (error) {
    console.error('Fehler beim Laden der Apps:', error)
    toast.error('Apps konnten nicht geladen werden.')
    apps.value = [] // Sicherstellen, dass es leer bleibt
  } finally {
    isLoading.value = false
  }
}

const handleDeploy = (app: any) => {
  const safeId = app.id || app._id || app.appId // API scheint appId oder id zu nutzen

  // Änderung: Wir gehen jetzt zur Detail-View (Name muss in router.ts definiert sein)
  router.push({
    name: 'apps.detail',
    params: { id: safeId }
  })
}

onMounted(() => {
  fetchApps()
})
</script>

<template>
  <div class="bg-white rounded-2xl p-10 border min-h-[600px]">

    <div class="flex justify-between items-center mb-8">
      <div class="flex items-center gap-4 text-primary">
        <Layers :size="28" />
        <h1 class="text-3xl font-bold text-gray-900">
          {{ $t('AppsView.title') || 'Apps' }}
        </h1>
      </div>

      <RouterLink :to="{ name: 'apps.create' }">
        <button class="bg-[#FFE4D6] text-[#E85C33] px-6 py-2 rounded-full font-bold hover:bg-[#ffdec9] transition-colors shadow-sm">
          App hinzufügen
        </button>
      </RouterLink>
    </div>

    <div class="mb-10 max-w-3xl">
      <p class="text-gray-500 text-lg">
        {{ $t('AppsView.subtitle') || 'Vorlagen zur Erstellung neuer Deployments.' }}
      </p>
    </div>

    <div v-if="isLoading" class="flex justify-center py-20">
      <div class="flex flex-col items-center gap-3">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <div class="text-gray-400">Lade Daten...</div>
      </div>
    </div>

    <div v-else-if="apps.length === 0" class="flex flex-col items-center justify-center py-20 border-2 border-dashed border-gray-100 rounded-2xl">
      <Inbox :size="64" class="text-gray-200 mb-4" />
      <h2 class="text-xl font-semibold text-gray-900 mb-2">Keine Apps vorhanden</h2>
      <p class="text-gray-500">Es wurden noch keine Apps in der Datenbank angelegt.</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
          v-for="app in apps"
          :key="app.id"
          class="bg-[#EFF5F2] border border-gray-200 rounded-xl p-6 flex flex-col hover:shadow-lg transition-all duration-200 group h-full"
      >
        <div class="flex items-center gap-4 mb-4">
          <div class="bg-white p-3 rounded-lg shadow-sm text-gray-700 group-hover:text-primary transition-colors">
            <component :is="getIconForApp(app)" :size="32" />
          </div>
          <h3 class="font-bold text-xl text-gray-900 leading-tight">
            {{ app.name }}
          </h3>
        </div>

        <p class="text-gray-600 text-sm mb-6 flex-grow leading-relaxed text-left">
          {{ app.description || 'Keine Beschreibung verfügbar.' }}
        </p>

        <div class="mt-auto">
          <button
              @click="handleDeploy(app)"
              class="w-full bg-white border-2 border-[#2E5C46] text-[#2E5C46] px-4 py-2.5 rounded-lg font-medium hover:bg-[#2E5C46] hover:text-white transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            Details & Versionen
          </button>
        </div>
      </div>
    </div>

  </div>
</template>