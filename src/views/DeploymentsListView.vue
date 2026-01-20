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
import BackCard from '@/components/ui/CardForBG.vue'
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

// 🎨 MODERNISIERT: Dezente Status-Anzeige mit Icon-Farben
const getStatusConfig = (status: string) => {
  switch (status) {
    case 'success':
      return { label: t('DeploymentsView.deploymentSuccessful'), textClass: 'text-emerald-600', iconClass: 'text-emerald-500', icon: CheckCircle2 }
    case 'running':
      return { label: t('DeploymentsView.deploymentRunning'), textClass: 'text-blue-600', iconClass: 'text-blue-500', icon: PlayCircle }
    case 'pending':
      return { label: t('DeploymentsView.deploymentPending'), textClass: 'text-gray-500', iconClass: 'text-gray-500', icon: Clock }
    case 'failed':
      return { label: t('DeploymentsView.deploymentFailed'), textClass: 'text-red-600', iconClass: 'text-red-500', icon: AlertCircle }
    case 'cancelled':
      return { label: t('DeploymentsView.deploymentCancelled'), textClass: 'text-gray-500', iconClass: 'text-gray-400', icon: XCircle }
    default:
      return { label: 'no status', textClass: 'text-gray-400', iconClass: 'text-gray-300', icon: Clock }
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

  <div class="space-y-3">

     <!-- 🎨 ANGEPASST: Spalten mit border-r für vertikale Linien -->
    <div class="grid grid-cols-[40px_2fr_2fr_1.5fr_1.5fr_1.5fr_1.5fr]
            px-6 py-3 text-lg font-semibold text-white
            bg-primaryLight rounded-lg">

      <div></div>
      <div class="pl-4">{{ $t('DeploymentsView.deploymentName') }}</div>
      <div class="pl-4">{{ $t('DeploymentsView.deploymentApp') }}</div>
      <div class="pl-4">{{ $t('DeploymentsView.deploymentAppVersion') }}</div>
      <div class="pl-4">{{ $t('DeploymentsView.deploymentStatus') }}</div>
      <div class="pl-4">{{ $t('DeploymentsView.deploymentVM') }}</div>
      <div class="pl-4">{{ $t('DeploymentsView.deploymentCourse') }}</div>

    </div>

    <div v-if="deploymentStore.isLoading" class="flex justify-center py-10">
      <Loader2 class="animate-spin text-emerald-600" :size="40" />
    </div>

    <div v-else-if="deploymentStore.deployments.length === 0"
      class="text-center py-10 bg-gray-50 rounded-lg border-2 border-dashed">
      <p class="text-gray-500 text-lg">{{ $t('DeploymentsView.deploymentsMissingMessage') }}</p>
    </div>

      <!-- 🎨 ANGEPASST: Zeilen mit border-r für vertikale Linien + pl-4 für Abstand -->
    <div v-else v-for="deployment in deploymentStore.deployments" :key="deployment.deploymentId" 
         class="grid grid-cols-[40px_2fr_2fr_1.5fr_1.5fr_1.5fr_1.5fr]
                items-center px-6 py-4 border border-gray-200
                bg-ultraLightGreen rounded-lg
                text-base text-gray-800 hover:bg-emerald-50 transition-colors">
      
   <div>
  <RouterLink :to="{ name: 'deployments.detail', params: { id: deployment.deploymentId } }" class="group">
    <div class="p-1 transition-transform duration-200 group-hover:scale-110 group-active:scale-95">
      <CircleArrowRight 
        :size="32" 
        class="text-primary/70 group-hover:text-primary transition-colors filter group-hover:drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.4)]" 
      />
    </div>
  </RouterLink>
</div>
      
      <div class="font-semibold truncate pr-4 pl-4" :title="deployment.name">
        {{ deployment.name }}
      </div>

      <div class="pl-4">
        {{ getAppName(deployment.appId) }}
      </div>

      <div class="pl-4">
        <!-- TBD {{ getAppVersion(deployment.deploymentId) }} -->
        -
      </div>

      <div class="pl-4">
        <!-- 🎨 MODERNISIERT: Dezenter Status ohne Background, nur Icon + Text -->
        <div v-if="deploymentStore.deploymentTasks[deployment.deploymentId]"
          class="flex items-center gap-1.5">
          <component :is="getStatusConfig(deploymentStore.deploymentTasks[deployment.deploymentId].status).icon"
            :size="15" 
            :class="getStatusConfig(deploymentStore.deploymentTasks[deployment.deploymentId].status).iconClass" />
          <span :class="['text-sm font-medium', getStatusConfig(deploymentStore.deploymentTasks[deployment.deploymentId].status).textClass]">
            {{ getStatusConfig(deploymentStore.deploymentTasks[deployment.deploymentId].status).label }}
          </span>
        </div>

        <div v-else class="flex items-center gap-2 text-gray-400 text-sm italic">
          <Loader2 :size="14" class="animate-spin" />
          Prüfe...
        </div>
      </div>

      <div class="pl-4">
        -
      </div>

      <div>
        -
      </div>

    </div>

  </div>
</BackCard>
</template> 