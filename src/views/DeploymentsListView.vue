<script setup lang="ts">
//import { onMounted } from 'vue'
import { ref, onMounted, computed } from 'vue'
import {
  BarChart3,
  CircleArrowRight,
  Plus,
  Loader2
} from 'lucide-vue-next'

import BaseButton from '@/components/ui/BaseButton.vue'
import { useDeploymentStore } from '@/stores/deployment.store'
import { useAppStore } from '@/stores/app.store'
const deploymentStore = useDeploymentStore()
const appStore = useAppStore()

/*
onMounted(async () => {
  const token = localStorage.getItem('token')
  
  try {
    // 1. Den aktuellen User abfragen
    const userMeRes = await fetch('http://localhost:8000/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const userData = await userMeRes.json()
    
    // Wichtig: Wir nutzen 'userId' (wie wir vorhin im Log gesehen haben)
    const currentUserId = userData.userId

    // 2. Daten laden mit dem Filter-Objekt
    await Promise.all([
      // Hier übergibst du das Objekt, das dein Store erwartet:
      deploymentStore.fetchDeployments({ userId: currentUserId }), 
      appStore.fetchApps()
    ])
  } catch (error) {
    console.error("Fehler beim Laden der Deployments:", error)
  }
})*/


const currentUserId = ref<string | null>(null) // ID speichern

onMounted(async () => {
  const token = localStorage.getItem('token')
  try {
    const userMeRes = await fetch('http://localhost:8000/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const userData = await userMeRes.json()
    currentUserId.value = userData.userId // ID in ref schreiben

    await Promise.all([
      // Als Teacher lädt er hier alle, das ist okay für den Store
      deploymentStore.fetchDeployments(),
      appStore.fetchApps()
    ])
  } catch (error) {
    console.error(error)
  }
})

// 2. Die gefilterte Liste erstellen
const myOwnDeployments = computed(() => {
  if (!currentUserId.value) return []

  // Filtert alle Deployments aus dem Store, sodass nur die eigenen übrig bleiben
  return deploymentStore.deployments.filter(
    deployment => deployment.userId === currentUserId.value
  )
})

// --- Helper Funktionen ---
// App Namen anhand der ID finden
const getAppName = (appId: string) => {
  const app = appStore.apps.find(a => a.appId === appId)
  return app ? app.name : '-'
}

// --- TBD: App Version anhand der Deployment ID bzw. anhand App ID finden ---
/*const getAppVersion = (deploymentId: string) => {
  const deployment = deploymentStore.deployments.find(d => d.deploymentId === deploymentId)
  console.log(deployment)
  return deployment ? deployment.releaseTag : '-'
}*/

</script>

<template>
  <div class="flex items-start justify-between mb-12">
    <div>
      <div class="flex items-center gap-6 text-primary mb-3">
        <h1 class="text-5xl font-bold text-gray-900">
          {{ $t('DeploymentsView.title') }}
        </h1>
        <BarChart3 :size="45" />
      </div>
      <p class="text-gray-500 text-xl">
        {{ $t('DeploymentsView.subtitle') }}
      </p>
    </div>
    <RouterLink :to="{ name: 'deployments.create' }">
      <BaseButton variant="yellow" class="text-2xl h-fit flex gap-2 items-center">
        <Plus :size="20" />
        {{ $t('DeploymentsView.newDeployment') }}
      </BaseButton>
    </RouterLink>
  </div>
  <div class="space-y-3">

    <div class="grid grid-cols-[40px_2fr_2fr_1.5fr_1.5fr_1.5fr_1.5fr]
            px-6 py-3 text-xl font-semibold text-gray-700
            bg-lightGreen rounded-lg">
      <div></div>
      <div>{{ $t('DeploymentsView.deploymentName') }}</div>
      <div>{{ $t('DeploymentsView.deploymentApp') }}</div>
      <div>{{ $t('DeploymentsView.deploymentAppVersion') }}</div>
      <div>{{ $t('DeploymentsView.deploymentStatus') }}</div>
      <div>{{ $t('DeploymentsView.deploymentVM') }}</div>
      <div>{{ $t('DeploymentsView.deploymentCourse') }}</div>
    </div>
    <div v-if="deploymentStore.isLoading" class="flex justify-center py-10">
      <Loader2 class="animate-spin text-emerald-600" :size="40" />
    </div>
    <div v-else-if="deploymentStore.deployments.length === 0"
      class="text-center py-10 bg-gray-50 rounded-lg border-2 border-dashed">
      <p class="text-gray-500 text-xl">{{ $t('DeploymentsView.deploymentMessage') }}</p>
    </div>
    <div v-else v-for="deployment in myOwnDeployments" :key="deployment.deploymentId" class="grid grid-cols-[40px_2fr_2fr_1.5fr_1.5fr_1.5fr_1.5fr]
         items-center px-6 py-4
         bg-ultraLightGreen rounded-lg
         text-lg text-gray-800 hover:bg-emerald-50 transition-colors">

      <div>
        <RouterLink :to="{ name: 'deployments.detail', params: { id: deployment.deploymentId } }">
          <button class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-primary/20 transition">
            <CircleArrowRight :size="40" class="text-primary" />
          </button>
        </RouterLink>
      </div>
      <div class="font-semibold truncate pr-4" :title="deployment.name">
        {{ deployment.name }}
      </div>
      <div>
        {{ getAppName(deployment.appId) }}
      </div>

      <div>
        <!-- TBD {{ getAppVersion(deployment.deploymentId) }} -->
        -
      </div>
      <div>
        <span class="px-3 py-1 rounded-full text-sm font-bold uppercase" :class="{
          'bg-yellow-100 text-yellow-700': deployment.status === 'pending',
          'bg-green-100 text-green-700': deployment.status === 'running' || deployment.status === 'success',
          'bg-red-100 text-red-700': deployment.status === 'failed'
        }">
          {{ deployment.status }}
        </span>
      </div>
      <div>
        -
      </div>
      <div>
        -
      </div>

    </div>
  </div>
</template>
