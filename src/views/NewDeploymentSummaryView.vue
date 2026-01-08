<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useDeploymentStore } from '@/stores/deployment.store'
import { useAppStore } from '@/stores/app.store'
import { 
  BarChart3, 
  ArrowRight
} from 'lucide-vue-next'

const { t } = useI18n()
const router = useRouter()
const deploymentStore = useDeploymentStore()
const appStore = useAppStore()

// --- 1. Die gewählte App finden ---
const selectedApp = computed(() => {
  return appStore.apps.find(a => a.appId === deploymentStore.draft.appId)
})

// --- 2. Konfigurations-Bibliothek (Frontend Mapping) ---
const appConfigs: Record<string, any> = {
  'NodeJS VM': {
    flavor: 'm1.small (2 vCPU, 4 GB RAM)',
    image: 'NodeJS 20 (Alpine)',
    ports: '3000, 8080',
    network: 'Shared VLAN',
    secGroup: 'Web Dev (HTTP/HTTPS)',
    software: 'NPM, Node, Git',
    storage: '20 GB'
  },
  'Jupyter Notebook': {
    flavor: 'g1.medium (4 vCPU, 16 GB RAM, 1 GPU)',
    image: 'Jupyter DataScience',
    ports: '8888',
    network: 'Isolated VLAN',
    secGroup: 'Data Science Only',
    software: 'Python 3.11, Pandas, PyTorch',
    storage: '50 GB'
  },
  'Pentesting Lab': {
    flavor: 'm1.medium (4 vCPU, 8 GB RAM)',
    image: 'Kali Linux (Stable)',
    ports: '22 (SSH)',
    network: 'Isoliertes Kurs-VLAN (automatisch)',
    secGroup: 'SSH only (vorkonfiguriert)',
    software: 'Kali Standard (Wireshark, John The Ripper)',
    storage: '40 GB'
  },
  'GitLab Server': {
    flavor: 'm2.large (8 vCPU, 32 GB RAM)',
    image: 'GitLab CE Omni',
    ports: '80, 443, 22',
    network: 'Public VLAN',
    secGroup: 'Web Server',
    software: 'GitLab, Docker Runner',
    storage: '100 GB'
  }
}

const fallbackConfig = {
  flavor: 't2.micro (Standard)',
  image: 'Ubuntu 22.04 LTS',
  ports: '80',
  network: 'Default',
  secGroup: 'Standard',
  software: 'Basic Utilities',
  storage: '10 GB'
}

// --- 3. Die Liste dynamisch berechnen ---
const configDetails = computed(() => {
  const appName = selectedApp.value?.name || ''
  const staticConfig = appConfigs[appName] || fallbackConfig

  const vmCount = deploymentStore.draft.groupCount
  const mode = deploymentStore.draft.groupMode
  
  let accountText = ''
  if (mode === 'one') accountText = 'Ein gemeinsamer Admin-Account'
  else if (mode === 'eachUser') accountText = 'Pro Studierendem ein Benutzer (automatisch)'
  else accountText = 'Individuelle Benutzer-Zuweisung'

  return [
    { label: 'flavor', value: staticConfig.flavor },
    { label: 'vms', value: vmCount.toString() },
    { label: 'image', value: staticConfig.image },
    { label: 'ports', value: staticConfig.ports },
    { label: 'network', value: staticConfig.network },
    { label: 'secGroup', value: staticConfig.secGroup },
    { label: 'accounts', value: accountText },
    { label: 'storage', value: staticConfig.storage },
    { label: 'software', value: staticConfig.software },
  ]
})

// --- Actions ---
const handleCustomize = () => {
  console.log('User wants to customize config')
}

const handleDeploy = async () => {
  try {
    await deploymentStore.submitDraft()
    router.push({ name: 'dashboard' }) 
  } catch (error) {
    console.error(error)
    alert("Fehler beim Deployment: " + error)
  }
}

const handleBack = () => {
  router.back()
}
</script>

<template>
  <div class="bg-white rounded-2xl p-10 border shadow-sm max-w-5xl mx-auto min-h-[500px] flex flex-col">
    
    <div class="flex items-center gap-3 mb-8">
      <h1 class="text-3xl font-bold text-gray-900">
        {{ t('deployment.title') }}
      </h1>
      <BarChart3 :size="32" class="text-emerald-600" />
    </div>

    <div class="text-center mb-10">
      <h2 class="text-xl font-bold text-gray-900">
        {{ t('deployment.summary.title') }}
      </h2>
      <p class="text-emerald-600 font-medium mt-2" v-if="selectedApp">
        App: {{ selectedApp.name }}
      </p>
    </div>

    <div class="flex-grow max-w-3xl mx-auto w-full">
      
      <div class="grid grid-cols-[160px_1fr] gap-y-4 text-gray-800">
        
        <template v-for="(item, index) in configDetails" :key="index">
          <div class="font-bold text-gray-900">
            {{ t(`deployment.summary.labels.${item.label}`, item.label) }}
          </div>
          
          <div class="text-gray-700 font-medium">
            {{ item.value }}
          </div>
        </template>

      </div>

      <div class="flex justify-end mt-8">
        <button 
          @click="handleCustomize"
          class="flex items-center gap-2 px-6 py-2 rounded-full bg-emerald-100 text-emerald-800 font-bold hover:bg-emerald-200 transition-colors"
        >
          <ArrowRight :size="18" />
          {{ t('deployment.summary.customize') }}
        </button>
      </div>

    </div>

    <div class="flex justify-between items-center mt-8 pt-4">
      <button 
        @click="handleBack"
        class="px-8 py-2.5 rounded-full bg-gray-400 text-white font-semibold hover:bg-gray-500 transition-colors"
      >
        {{ t('deployment.actions.back') }}
      </button>
      
      <button 
        @click="handleDeploy"
        class="px-8 py-2.5 rounded-full bg-emerald-700 text-white font-bold hover:bg-emerald-800 transition-colors shadow-lg shadow-emerald-700/20"
      >
        <span v-if="deploymentStore.isLoading">Wird erstellt...</span>
        <span v-else>{{ t('deployment.actions.deploy') }}</span>
      </button>
    </div>

  </div>
</template>