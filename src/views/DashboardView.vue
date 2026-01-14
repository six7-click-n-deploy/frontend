<!--<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  BarChart3,
  Layers,
  GraduationCap,
  Clock
} from 'lucide-vue-next'

const stats = ref({
  deployments: 0,
  apps: 0,
  courses: 0,
  loading: true
})

const fetchDashboardData = async () => {
  stats.value.loading = true
  const token = localStorage.getItem('token')
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json'
  }

  try {
    // 1. User Info holen
    const userMeRes = await fetch('http://localhost:8000/auth/me', { headers })
    if (!userMeRes.ok) throw new Error("Auth fehlgeschlagen")

    const userData = await userMeRes.json()

    // Hier nutzen wir jetzt den korrekten Namen aus deinem JSON: userId
    const currentUserId = userData.userId

    // 2. Parallel Statistik (mit der ID) und Kurse laden
    const [statsRes, coursesRes] = await Promise.all([
      fetch(`http://localhost:8000/users/${currentUserId}/statistics`, { headers }),
      fetch('http://localhost:8000/courses/', { headers })
    ])

    if (!statsRes.ok) {
      const errorData = await statsRes.json()
      console.error("Statistik Fehler Details:", errorData)
      throw new Error("Statistik konnte nicht geladen werden")
    }

    const statsData = await statsRes.json()
    const coursesData = await coursesRes.json()

    // 3. Daten zuweisen (entsprechend deiner JSON-Struktur)
    stats.value.apps = statsData.total_apps
    stats.value.deployments = statsData.total_deployments
    stats.value.courses = coursesData.length

  } catch (err) {
    console.error("Dashboard-Fehler:", err)
  } finally {
    stats.value.loading = false
  }
}

onMounted(() => {
  fetchDashboardData()
})
</script> -->

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  BarChart3,
  Layers,
  GraduationCap,
  Clock
} from 'lucide-vue-next'

import { useKeycloak } from '@/composables/useKeycloak' // Pfad anpassen falls nötig

const { getUser } = useKeycloak() // Falls dein Composable das Token oder User bereitstellt
const stats = ref({
  deployments: 0,
  apps: 0,
  courses: 0,
  loading: true
})

const fetchDashboardData = async () => {
  stats.value.loading = true
  // ... Token-Logik wie zuvor ...
  const user = await getUser()
  const token = user?.access_token 

  try {
    const headers = { 
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }

    // Wir laden die Listen einzeln, falls /statistics einen 500er wirft
    const [appsRes, deploymentsRes, coursesRes] = await Promise.all([
      fetch('http://localhost:8000/apps/', { headers }),
      fetch('http://localhost:8000/deployments/', { headers }),
      fetch('http://localhost:8000/courses/', { headers })
    ])

    // Prüfen ob die Antworten okay sind
    if (!appsRes.ok || !deploymentsRes.ok || !coursesRes.ok) {
       throw new Error("Fehler beim Laden der Listen");
    }

    const appsData = await appsRes.json()
    const deploymentsData = await deploymentsRes.json()
    const coursesData = await coursesRes.json()

    // Zuweisung über die Länge der Listen
    stats.value.apps = appsData.length
    stats.value.deployments = deploymentsData.length
    stats.value.courses = coursesData.length

  } catch (err) {
    console.error("Dashboard-Fehler:", err)
    // Optional: Setze Standardwerte auf 0, damit die UI nicht kaputt geht
  } finally {
    stats.value.loading = false
  }
}

onMounted(() => {
  fetchDashboardData()
})

</script>

<template>
  <!-- TBD: Background Logo -> sieht noch nicht gut aus :(
  <div class="fixed right-0 pointer-events-none z-0 flex items-center justify-end"
    style="top: 80px; height: calc(100vh - 80px);">
    <img src="@/assets/onlySix7-green-withoutBackground.png" alt="" class="opacity-5"
      style="transform: rotate(90deg); height: 50%; width: auto;" />
  </div> -->


  <!-- Content -->
  <div class="relative z-10 space-y-8">
    <!-- Header mit Gradient -->
    <div class="space-y-2">
      <h1 class="text-5xl font-bold text-primary">
        {{ $t('DashboardView.title') }}
      </h1>
      <p class="text-lg text-gray-500">
        {{ $t('DashboardView.subtitle') }}
      </p>
    </div>

    <!-- Stats Grid mit modernen Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Deployments Card -->
      <div
        class="group relative bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
        <!-- Gradient Background on Hover -->
        <div
          class="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        </div>

        <div class="relative">
          <div class="flex items-start justify-between mb-4">
            <div class="space-y-1">
              <p class="text-2xl font-semibold text-primary">{{ $t('DashboardView.deployments') }}</p>
            </div>
            <div class="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors duration-300">
              <BarChart3 :size="28" class="text-primary" />
            </div>
          </div>

          <div class="flex items-center mb-2">
            <p class="text-4xl font-bold text-gray-900">{{ stats.deployments }}</p>

          </div>
          <p class="text-sm text-gray-600 mb-4">{{ $t('DashboardView.deploymentsRunning') }}</p>

          <div class="pt-4 border-t border-gray-100">
            <RouterLink :to="{ name: 'deployments.list' }"
              class="text-sm font-medium text-primary hover:text-primary/80 transition-colors inline-block">
              {{ $t('DashboardView.deploymentsAll') }} →
            </RouterLink>
            <!--<button class="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
              {{ $t('DashboardView.deploymentsAll') }} →
            </button>-->
          </div>
        </div>
      </div>

      <!-- Apps Card -->
      <div
        class="group relative bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
        <div
          class="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        </div>

        <div class="relative">
          <div class="flex items-start justify-between mb-4">
            <div class="space-y-1">
              <p class="text-2xl font-semibold text-primary">{{ $t('DashboardView.apps') }}</p>
            </div>
            <div class="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors duration-300">
              <Layers :size="28" class="text-primary" />
            </div>
          </div>

          <div class="flex items-center mb-2">
            <p class="text-4xl font-bold text-gray-900">{{ stats.apps }}</p>

          </div>
          <p class="text-sm text-gray-600 mb-4">{{ $t('DashboardView.appsActive') }}</p>

          <div class="pt-4 border-t border-gray-100">
            <RouterLink to="/apps"
              class="text-sm font-medium text-primary hover:text-primary/80 transition-colors inline-block">
              {{ $t('DashboardView.appsAll') }} →
            </RouterLink>
          </div>
        </div>
      </div>

      <!-- Courses Card -->
      <div
        class="group relative bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
        <div
          class="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        </div>

        <div class="relative">
          <div class="flex items-start justify-between mb-4">
            <div class="space-y-1">
              <p class="text-2xl font-semibold text-primary">{{ $t('DashboardView.courses') }}</p>
            </div>
            <div class="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors duration-300">
              <GraduationCap :size="28" class="text-primary" />
            </div>
          </div>

          <div class="flex items-center mb-2">
            <p class="text-4xl font-bold text-gray-900">{{ stats.courses }}</p>

          </div>
          <p class="text-sm text-gray-600 mb-4">{{ $t('DashboardView.coursesActive') }}</p>

          <div class="pt-4 border-t border-gray-100">
            <RouterLink to="/courses"
              class="text-sm font-medium text-primary hover:text-primary/80 transition-colors inline-block">
              {{ $t('DashboardView.coursesAll') }} →
            </RouterLink>
          </div>
        </div>
      </div>
    </div>

    <!--TBD: ACTIVITY PAGE WITH REAL ACTIVITIES-->
    <!-- Activity & Resources Section - 60/40 Split -->
    <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <!-- Activity Section - 60% width -->
      <div class="lg:col-span-3 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-semibold text-gray-900">
            {{ $t('DashboardView.activity') }}
          </h2>
          <button class="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
            Alle anzeigen →
          </button>
        </div>

        <div class="space-y-4">
          <div class="group flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors duration-200">
            <div class="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
              <Layers :size="20" class="text-primary" />
            </div>
            <div class="flex-1">
              <p class="font-medium text-gray-900">{{ $t('DashboardView.appUpdated') }}</p>
              <p class="text-sm text-gray-500">NodeJS App v1.2 wurde aktualisiert</p>
            </div>
            <div class="flex items-center gap-2 text-sm text-gray-500">
              <Clock :size="16" />
              <span>2 min</span>
            </div>
          </div>

          <div class="group flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors duration-200">
            <div class="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
              <BarChart3 :size="20" class="text-primary" />
            </div>
            <div class="flex-1">
              <p class="font-medium text-gray-900">{{ $t('DashboardView.deploymentCreated') }}</p>
              <p class="text-sm text-gray-500">NodeJS-WWI23SEB wurde erstellt</p>
            </div>
            <div class="flex items-center gap-2 text-sm text-gray-500">
              <Clock :size="16" />
              <span>{{ $t('DashboardView.today') }}</span>
            </div>
          </div>

          <div class="group flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors duration-200">
            <div class="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
              <GraduationCap :size="20" class="text-primary" />
            </div>
            <div class="flex-1">
              <p class="font-medium text-gray-900">{{ $t('DashboardView.courseEdited') }}</p>
              <p class="text-sm text-gray-500">Kubernetes Grundlagen bearbeitet</p>
            </div>
            <div class="flex items-center gap-2 text-sm text-gray-500">
              <Clock :size="16" />
              <span>{{ $t('DashboardView.yesterday') }}</span>
            </div>
          </div>
        </div>
      </div>

      <!--TBD: REAL RESSOURCES-->
      <!-- Resources Section - 40% width -->
      <div class="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div class="mb-6">
          <h2 class="text-xl font-semibold text-gray-900">
            {{ $t('DashboardView.availableResources') }}
          </h2>
        </div>

        <div class="space-y-6">
          <!-- vCPUs -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-base font-semibold text-gray-900">vCPUs:</span>
              <span class="text-base font-bold text-gray-900">16/20</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div class="bg-red-500 h-4 rounded-full transition-all duration-500" style="width: 80%"></div>
            </div>
            <p class="text-sm text-gray-500 mt-1">80% ausgelastet</p>
          </div>

          <!-- VMs -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-base font-semibold text-gray-900">VMs:</span>
              <span class="text-base font-bold text-gray-900">6/10</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div class="bg-green-500 h-4 rounded-full transition-all duration-500" style="width: 60%"></div>
            </div>
            <p class="text-sm text-gray-500 mt-1">60% ausgelastet</p>
          </div>

          <!-- RAM -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-base font-semibold text-gray-900">RAM:</span>
              <span class="text-base font-bold text-gray-900">40/64GB</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div class="bg-orange-500 h-4 rounded-full transition-all duration-500" style="width: 62.5%"></div>
            </div>
            <p class="text-sm text-gray-500 mt-1">62.5% ausgelastet</p>
          </div>


        </div>
      </div>
    </div>
  </div>

</template>