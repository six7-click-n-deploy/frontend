<script setup lang="ts">

import { onMounted } from 'vue'

import {
  BarChart3,
  CircleArrowRight,
  Loader2,
  
} from 'lucide-vue-next'

import BaseButton from '@/components/ui/BaseButton.vue'
import BackCard from '@/components/ui/CardForBG.vue'
import { useDeploymentStore } from '@/stores/deployment.store'
import { useAppStore } from '@/stores/app.store'

const deploymentStore = useDeploymentStore()
const appStore = useAppStore()

onMounted(async () => {
  deploymentStore.fetchDeployments()
  appStore.fetchApps()
})

const getAppName = (appId: string) => {
  const app = appStore.apps.find(a => a.appId === appId)
  return app ? app.name : '-'
}

// Datum formatieren
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

// Status Farben
const getStatusColor = (status: string) => {
  const colors = {
    'success': 'bg-green-100 text-green-800 border-green-300',
    'failed': 'bg-red-100 text-red-800 border-red-300',
    'running': 'bg-blue-100 text-blue-800 border-blue-300',
    'pending': 'bg-yellow-100 text-yellow-800 border-yellow-300'
  }
  return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-300'
}

</script>



<template>

  <BackCard>
  <div class="flex items-start justify-between mb-12">
    <div>
      <div class="flex items-center gap-4 text-primary mb-3">
         <BarChart3 :size="30" />
        <h1 class="text-3xl font-bold text-gray-900">
          {{ $t('DeploymentsView.title') }}
        </h1>
       
      </div>

      <p class="text-gray-500 text-lg">
        {{ $t('DeploymentsView.subtitle') }}
      </p>

    </div>

    <RouterLink :to="{ name: 'apps' }">
      <BaseButton variant="yellow" class="text-2xl h-fit flex gap-2 items-center">
        {{ $t('DeploymentsView.newDeployment') }}
      </BaseButton>
    </RouterLink>
  </div>

  <div class="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">

    <div class="grid grid-cols-[50px_2fr_1.5fr_120px_120px_1fr_1fr_140px]
            px-6 py-4 text-sm font-semibold text-gray-600 uppercase tracking-wide
            bg-gray-50 border-b border-gray-200">

      <div></div>
      <div>{{ $t('DeploymentsView.deploymentName') }}</div>
      <div>{{ $t('DeploymentsView.deploymentApp') }}</div>
      <div>{{ $t('DeploymentsView.deploymentAppVersion') }}</div>
      <div>{{ $t('DeploymentsView.deploymentStatus') }}</div>
      <div>{{ $t('DeploymentsView.deploymentVM') }}</div>
      <div>{{ $t('DeploymentsView.deploymentCourse') }}</div>
      <div>{{ $t('DeploymentsView.deploymentCreatedAt') }}</div>

    </div>

    <div v-if="deploymentStore.isLoading" class="flex justify-center py-10">
      <Loader2 class="animate-spin text-emerald-600" :size="40" />
    </div>

    <div v-else-if="deploymentStore.deployments.length === 0"
      class="text-center py-10 bg-gray-50">
      <p class="text-gray-500 text-xl">{{ $t('DeploymentsView.deploymentsMissingMessage') }}</p>
    </div>

    <div v-else v-for="deployment in deploymentStore.deployments" :key="deployment.deploymentId" 
         class="grid grid-cols-[50px_2fr_1.5fr_120px_120px_1fr_1fr_140px]
                items-center px-6 py-4
                text-base text-gray-800 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0">
      
      <div>
        <RouterLink :to="{ name: 'deployments.detail', params: { id: deployment.deploymentId } }">
          <button class="w-9 h-9 flex items-center justify-center rounded-full hover:bg-primary/10 transition">
            <CircleArrowRight :size="24" class="text-primary" />
          </button>
        </RouterLink>
      </div>
      
      <div class="font-semibold truncate pr-4 text-gray-900" :title="deployment.name">
        {{ deployment.name }}
      </div>

      <div class="text-gray-600 truncate pr-2">
        {{ getAppName(deployment.appId) }}
      </div>

      <div>
        <span class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-300">
          {{ deployment.releaseTag }}
        </span>
      </div>

      <div>
        <span 
          class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border capitalize"
          :class="getStatusColor(deployment.status)">
          {{ deployment.status }}
        </span>
      </div>

      <div class="text-gray-500 text-sm">
        -
      </div>

      <div class="text-gray-500 text-sm">
        -
      </div>

      <div class="text-gray-500 text-sm">
        {{ formatDate(deployment.created_at) }}
      </div>

    </div>

  </div>
</BackCard>
</template> 