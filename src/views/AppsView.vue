<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
// API Imports
import { appApi } from '@/api/app.api'

// UI Imports
// Globe und Terminal sind wieder drin für React und Docker
import { Layers, Server, Box, Database, Terminal, Globe, LayoutTemplate, Shield } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'

const toast = useToast()
const router = useRouter()

const isLoading = ref(false)
const isDummyData = ref(false)

// --- DEV MODE: Deine ursprünglichen 6 Beispiele ---
const defaultApps = [
  {
    id: 1,
    name: 'Node.js Express',
    description: 'REST API mit Express und TypeScript',
    category: 'Backend',
    iconComp: Server
  },
  {
    id: 2,
    name: 'Vue 3 + Vite',
    description: 'Modernes Frontend mit Vue 3 und TypeScript',
    category: 'Frontend',
    iconComp: LayoutTemplate
  },
  {
    id: 3,
    name: 'Python FastAPI',
    description: 'Schnelle API mit Python und FastAPI',
    category: 'Backend',
    iconComp: Box
  },
  {
    id: 4,
    name: 'React + TypeScript',
    description: 'React App mit TypeScript und Vite',
    category: 'Frontend',
    iconComp: Globe
  },
  {
    id: 5,
    name: 'PostgreSQL',
    description: 'PostgreSQL Datenbank mit Docker',
    category: 'Database',
    iconComp: Database
  },
  {
    id: 6,
    name: 'Docker Compose',
    description: 'Multi-Container Setup mit Docker Compose',
    category: 'DevOps',
    iconComp: Terminal
  }
]
// ------------------------------------------------------------------

const apps = ref<any[]>([])

// Hilfsfunktion: Wählt Icon basierend auf dem Namen (für echte API Daten)
const getIconForApp = (app: any) => {
  if (app.iconComp) return app.iconComp // Nutze das Icon aus den Dummy-Daten

  const name = (app.name || '').toLowerCase()
  if (name.includes('node')) return Server
  if (name.includes('vue') || name.includes('front')) return LayoutTemplate
  if (name.includes('react')) return Globe
  if (name.includes('python') || name.includes('jupyter') || name.includes('fastapi')) return Box
  if (name.includes('postgres') || name.includes('sql') || name.includes('data')) return Database
  if (name.includes('docker') || name.includes('container')) return Terminal
  if (name.includes('security') || name.includes('pen')) return Shield
  return Layers // Fallback
}

const fetchApps = async () => {
  isLoading.value = true
  try {
    // Versuch 1: Echte API fragen
    const response = await appApi.list()

    // Prüfen ob Daten da sind
    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      console.log('API Daten geladen')
      apps.value = response.data
      isDummyData.value = false
    } else {
      // Fallback: Keine Daten in DB -> Error werfen um in den catch Block zu kommen
      throw new Error('Keine Daten')
    }
  } catch (error) {
    console.warn('Zeige Dummy-Daten an (API leer oder nicht erreichbar)')
    apps.value = defaultApps
    isDummyData.value = true
  } finally {
    isLoading.value = false
  }
}

// Deployment Starten
const handleDeploy = (app: any) => {
  // Fix für den TypeScript Fehler: Wir greifen sicher auf die ID zu
  const safeId = app.id || app._id

  toast.info(`Template "${app.name}" ausgewählt.`)

  router.push({
    name: 'deployments.create',
    query: { appId: safeId }
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
      <p class="text-gray-500 text-lg inline">
        {{ $t('AppsView.subtitle') || 'Vorlagen zur Erstellung neuer Deployments.' }}
      </p>

      <span v-if="isDummyData" class="ml-3 text-sm font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded border border-orange-200">
        ⚠ Demo-Daten
      </span>
    </div>

    <div v-if="!isLoading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

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
              class="w-full bg-[#2E5C46] text-white px-4 py-2.5 rounded-lg font-medium hover:bg-[#234a36] transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            Jetzt Deployen
          </button>
        </div>
      </div>
    </div>

    <div v-else class="flex justify-center py-20">
      <div class="text-gray-400">Lade Daten...</div>
    </div>

  </div>
</template>