<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useDeploymentStore } from '@/stores/deployment.store'
//import DeploymentProgressBar from '@/components/DeploymentProgressBar.vue'
import { 
  BarChart3, 
  // Terminal, <--- HIER WURDE DER IMPORT GELÖSCHT
  ArrowRight, 
  ArrowLeft 
} from 'lucide-vue-next'

const { t } = useI18n()
const router = useRouter()
const store = useDeploymentStore()

// State Sync
const userInputVar = computed({
  get: () => store.draft.userInputVar,
  set: (val) => store.draft.userInputVar = val
})

// Navigation
// ACHTUNG: Prüfe hier nochmal die Routen-Namen. 
// Wenn diese View Schritt 2 ist, sollte "Zurück" zu Config (Schritt 1) gehen
// und "Weiter" zu Assignment (Schritt 3).
const handleBack = () => router.push({ name: 'deployment.assignment' }) // War vorher assignment
const handleNext = () => router.push({ name: 'deployment.summary' }) // War vorher summary
</script>

<template>
  <div class="max-w-6xl mx-auto w-full">
    <div class="bg-white rounded-2xl border shadow-sm min-h-[600px] flex flex-col overflow-hidden">
      
      <div class="p-8 pb-4">
        <div class="flex items-center gap-3 mb-6">
          <h1 class="text-3xl font-bold text-gray-900">{{ t('deployment.title') }}</h1>
          <BarChart3 :size="32" class="text-emerald-600" />
        </div>
        <DeploymentProgressBar :current-step="2" />
        <div class="border-b border-gray-100 mt-4"></div>
      </div>

      <div class="flex-grow p-8 flex flex-col items-center justify-center bg-gray-50/50">
        <div class="w-full max-w-2xl">
          <div class="mb-8 text-center">
            <h2 class="text-2xl font-bold text-gray-900">Umgebungsvariablen</h2>
            <p class="text-gray-500 mt-2">Spezifische Parameter für das Deployment.</p>
          </div>

          <div class="bg-white p-1 rounded-xl border border-gray-200 shadow-sm focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 transition-all">
            <div class="relative">
              <textarea
                v-model="userInputVar"
                rows="12"
                class="w-full p-6 bg-gray-900 text-emerald-400 font-mono text-sm rounded-lg outline-none resize-none leading-relaxed"
                placeholder='{"KEY": "VALUE"}'
                spellcheck="false"
              ></textarea>
              <div class="absolute top-4 right-4 text-[10px] font-bold text-gray-500 bg-gray-800 px-2 py-1 rounded tracking-wider pointer-events-none">
                USER INPUT VAR
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="flex justify-between items-center p-8 pt-4 bg-white border-t border-gray-100">
        <button @click="handleBack" class="flex items-center gap-2 px-8 py-2.5 rounded-full bg-gray-100 text-gray-600 font-semibold hover:bg-gray-200 transition-colors">
          <ArrowLeft :size="18" /> {{ t('deployment.actions.back') }}
        </button>
        <button @click="handleNext" class="flex items-center gap-2 px-8 py-2.5 rounded-full bg-emerald-700 text-white font-bold hover:bg-emerald-800 transition-colors shadow-lg shadow-emerald-700/20">
          {{ t('deployment.actions.next') }} <ArrowRight :size="18" />
        </button>
      </div>
    </div>
  </div>
</template>