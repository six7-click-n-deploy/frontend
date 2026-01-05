<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { 
  BarChart3, 
  ArrowRight
} from 'lucide-vue-next'

const { t } = useI18n()
const router = useRouter()

// --- Mock Data (Entspricht exakt deinem Screenshot) ---
const configDetails = [
  { label: 'flavor', value: 'm1.medium (4 vCPU, 8 GB RAM)' },
  { label: 'vms', value: '2' }, // Anzahl der VMs
  { label: 'image', value: 'Kali Linux (aktuelle Stable-Version)' },
  { label: 'ports', value: '22 (SSH)' },
  { label: 'network', value: 'Isoliertes Kurs-VLAN (automatisch)' },
  { label: 'secGroup', value: 'SSH only (vorkonfiguriert)' },
  { label: 'accounts', value: 'pro Studierendem ein Benutzer (automatisch)' },
  { label: 'storage', value: '40 GB' },
  { label: 'software', value: 'Kali Linux Standard Toolset (Wireshark, John The Ripper)' },
]

// --- Actions ---
const handleCustomize = () => {
  console.log('User wants to customize config')
  // Hier könnte ein Modal aufgehen oder zu einer Detail-Seite navigiert werden
}

const handleDeploy = () => {
  console.log('Deployment started!')
  // Hier API Call senden -> Dann weiter zum Dashboard oder Success-Screen
  router.push({ name: 'dashboard' }) 
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
    </div>

    <div class="flex-grow max-w-3xl mx-auto w-full">
      
      <div class="grid grid-cols-[160px_1fr] gap-y-4 text-gray-800">
        
        <template v-for="(item, index) in configDetails" :key="index">
          <div class="font-bold text-gray-900">
            {{ t(`deployment.summary.labels.${item.label}`) }}
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
        {{ t('deployment.actions.next') }}
      </button>
    </div>

  </div>
</template>