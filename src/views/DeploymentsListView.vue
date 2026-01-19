<script setup lang="ts">

import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

import {
  BarChart3,
  CircleArrowRight,
  Plus,
  Loader2,
  Clock,
  PlayCircle,
  CheckCircle2,
  AlertCircle,
  XCircle
} from 'lucide-vue-next'

import BaseButton from '@/components/ui/BaseButton.vue'
import { useDeploymentStore } from '@/stores/deployment.store'
import { useAppStore } from '@/stores/app.store'

const deploymentStore = useDeploymentStore()
const appStore = useAppStore()
const { t } = useI18n()

// Daten beim Laden der Seite initialisieren
onMounted(async () => {
  await Promise.all([
    deploymentStore.fetchDeployments(),
    appStore.fetchApps()
  ])

  // Für jedes geladene Deployment den Status-Task über den Store abfragen
  deploymentStore.deployments.forEach(dep => {
    deploymentStore.fetchStatusForDeployment(dep.deploymentId)
  })
})

// --- Helper Funktionen ---

// App Namen anhand der ID finden
const getAppName = (appId: string) => {
  const app = appStore.apps.find(a => a.appId === appId)
  return app ? app.name : '-'
}

// Konfiguration für die Status-Anzeige
const getStatusConfig = (status: string) => {
  switch (status) {
    case 'success':
      return { label: t('DeploymentsView.deploymentSuccessful'), class: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 }
    case 'running':
      return { label: t('DeploymentsView.deploymentRunning'), class: 'bg-blue-100 text-blue-700 border-blue-200', icon: PlayCircle }
    case 'pending':
      return { label: t('DeploymentsView.deploymentPending'), class: 'bg-amber-100 text-amber-700 border-amber-200', icon: Clock }
    case 'failed':
      return { label: t('DeploymentsView.deploymentFailed'), class: 'bg-red-100 text-red-700 border-red-200', icon: AlertCircle }
    case 'cancelled':
      return { label: t('DeploymentsView.deploymentCancelled'), class: 'bg-gray-100 text-gray-500 border-gray-200', icon: XCircle }
    default:
      return { label: 'no status', class: 'bg-gray-100 text-gray-400 border-gray-200', icon: Clock }
  }
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

    <RouterLink :to="{ name: 'apps' }">
      <BaseButton variant="yellow" class="text-2xl h-fit flex gap-2 items-center">
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
      <p class="text-gray-500 text-xl">{{ $t('DeploymentsView.deploymentsMissingMessage') }}</p>
    </div>

    <div v-else v-for="deployment in deploymentStore.deployments" :key="deployment.deploymentId" class="grid grid-cols-[40px_2fr_2fr_1.5fr_1.5fr_1.5fr_1.5fr]
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
        <div v-if="deploymentStore.deploymentTasks[deployment.deploymentId]"
          :class="['flex items-center gap-2 px-4 py-1.5 rounded-full border w-fit text-sm font-bold shadow-sm', getStatusConfig(deploymentStore.deploymentTasks[deployment.deploymentId].status).class]">
          <component :is="getStatusConfig(deploymentStore.deploymentTasks[deployment.deploymentId].status).icon"
            :size="16" />
          {{ getStatusConfig(deploymentStore.deploymentTasks[deployment.deploymentId].status).label }}
        </div>

        <div v-else class="flex items-center gap-2 text-gray-400 text-sm italic">
          <Loader2 :size="14" class="animate-spin" />
          Prüfe...
        </div>
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