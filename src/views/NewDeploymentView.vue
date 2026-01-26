<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app.store'
import { useDeploymentStore } from '@/stores/deployment.store'

import { 
  BarChart3, 
  Terminal, 
  FileCode2, 
  ShieldAlert, 
  Gitlab,
  Layers
} from 'lucide-vue-next'

const router = useRouter()
const { t } = useI18n()
const appStore = useAppStore()
const deploymentStore = useDeploymentStore()

// Map backend app identifiers to UI presentation (icon + tailwind color)
const uiConfig: Record<string, { icon: any, color: string }> = {
  'nodejs': { icon: Terminal, color: 'text-green-600' },
  'jupyter': { icon: FileCode2, color: 'text-orange-500' },
  'pentest': { icon: ShieldAlert, color: 'text-blue-500' },
  'gitlab': { icon: Gitlab, color: 'text-orange-600' },
}

// Load app catalog and reset wizard draft on entry
onMounted(() => {
  appStore.fetchApps()
  deploymentStore.resetDraft()
})

// Combine server-provided apps with local UI config for rendering
const displayApps = computed(() => {
  return appStore.apps.map(app => {
    const config = uiConfig[app.appId] || { icon: Layers, color: 'text-gray-500' }
    
    return {
      ...app,
      icon: config.icon,
      colorClass: config.color
    }
  })
})

// Select an app for the deployment and prefill the latest release tag if available
const selectApp = (appId: string) => {
  deploymentStore.draft.appId = appId
  
  const selectedApp = appStore.apps.find(a => a.appId === appId)
  if (selectedApp) {
    deploymentStore.draft.releaseTag = selectedApp.releaseTag || ''
  }
}

// Proceed to the configuration step when an app is selected
const handleNext = () => {
  if (deploymentStore.draft.appId) {
    router.push({ name: 'deployment.config' })
  }
}

const handleBack = () => {
  router.back()
}
</script>

<template>
  <div class="bg-white rounded-2xl p-10 border shadow-sm max-w-5xl mx-auto">
    
    <div class="flex items-center gap-3 mb-8">
      <h1 class="text-3xl font-bold text-gray-900">
        {{ t('deployment.title') }}
      </h1>
      <BarChart3 :size="32" class="text-emerald-600" />
    </div>

    <div class="text-center mb-8">
      <h2 class="text-xl font-bold text-gray-900">
        {{ t('deployment.subtitle') }}
      </h2>
    </div>

    <div v-if="appStore.isLoading" class="flex justify-center items-center py-20">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
    </div>

    <div v-else-if="appStore.error" class="text-center text-red-500 py-10">
      {{ appStore.error }}
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
      <div 
        v-for="app in displayApps" 
        :key="app.appId"
        @click="selectApp(app.appId)"
        class="relative p-6 rounded-lg cursor-pointer transition-all duration-200 border-2 min-h-[180px] flex flex-col"
        :class="[
          deploymentStore.draft.appId === app.appId 
            ? 'border-purple-500 bg-green-50/30 ring-1 ring-purple-500' 
            : 'border-transparent bg-gray-100/80 hover:bg-gray-200/80 hover:border-gray-300'
        ]"
      >
        <div class="flex items-start gap-4 mb-3">
          <component :is="app.icon" :size="40" :class="app.colorClass" />
          
          <h3 class="text-lg font-bold text-gray-900 pt-1">
            {{ app.name }} </h3>
        </div>

        <p class="text-sm text-gray-600 leading-relaxed pl-1">
          {{ app.description }} </p>
      </div>
    </div>

    <div class="flex justify-between items-center">
      <button 
        @click="handleBack"
        class="px-8 py-2.5 rounded-full bg-gray-400 text-white font-semibold hover:bg-gray-500 transition-colors"
      >
        {{ t('deployment.actions.back') }}
      </button>
      
      <button 
        @click="handleNext"
        :disabled="!deploymentStore.draft.appId"
        class="px-8 py-2.5 rounded-full text-white font-bold transition-colors shadow-lg"
        :class="!deploymentStore.draft.appId 
          ? 'bg-gray-300 cursor-not-allowed shadow-none' 
          : 'bg-emerald-700 hover:bg-emerald-800 shadow-emerald-700/20'"
      >
        {{ t('deployment.actions.next') }}
      </button>
    </div>

  </div>
</template>