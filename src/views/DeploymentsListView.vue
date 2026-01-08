<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { 
  BarChart3, 
  CircleArrowRight, 
  Plus, 
  CheckCircle, // Neu: Für das Icon
  X            // Neu: Zum Schließen
} from 'lucide-vue-next'
import BaseButton from '@/components/ui/BaseButton.vue'

const route = useRoute()
const router = useRouter()
const showSuccess = ref(false)

// Überwacht die URL auf "?success=true"
watch(
  () => route.query,
  (newQuery) => {
    if (newQuery.success === 'true') {
      showSuccess.value = true
      
      // URL sofort bereinigen (Parameter entfernen)
      const cleanQuery = { ...newQuery }
      delete cleanQuery.success
      router.replace({ query: cleanQuery })

      // Automatisch nach 5 Sekunden ausblenden
      setTimeout(() => {
        showSuccess.value = false
      }, 5000)
    }
  },
  { immediate: true }
)
</script>

<template>
  <div class="p-6">
    
   <!-- <div v-if="showSuccess" class="mb-8 p-4 bg-green-100 border border-green-300 text-green-800 rounded-lg flex items-center justify-between shadow-md">
      <div class="flex items-center gap-3">
        <CheckCircle :size="24" />
        <span class="font-bold text-lg">201 Deployment erfolgreich</span>
      </div>
      <button @click="showSuccess = false">
        <X :size="20" class="hover:text-green-900" />
      </button>
    </div>-->

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
        <BaseButton variant="yellow" class="text-2xl h-fit flex items-center gap-2">
          <Plus :size="20" />
          {{ $t('DeploymentsView.newDeployment') }}
        </BaseButton>
      </RouterLink>
    </div>

    <div class="space-y-3">
      <div class="grid grid-cols-[40px_2fr_2fr_1.5fr_1fr_1.5fr_1.5fr] px-6 py-3 text-xl font-semibold text-gray-700 bg-lightGreen rounded-lg">
        <div></div>
        <div>{{ $t('DeploymentsView.deploymentName') }}</div>
        <div>{{ $t('DeploymentsView.deploymentApp') }}</div>
        <div>{{ $t('DeploymentsView.deploymentStatus') }}</div>
        <div>{{ $t('DeploymentsView.deploymentVM') }}</div>
        <div>{{ $t('DeploymentsView.deploymentCourse') }}</div>
        <div>{{ $t('DeploymentsView.deploymentActivity') }}</div>
      </div>

      <div class="grid grid-cols-[40px_2fr_2fr_1.5fr_1fr_1.5fr_1.5fr] items-center px-6 py-4 bg-ultraLightGreen rounded-lg text-lg text-gray-800">
        <div>
          <RouterLink :to="{ name: 'deployments.detail' }">
            <button class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-primary/20 transition">
              <CircleArrowRight :size="40" class="text-primary" />
            </button>
          </RouterLink>
        </div>
        <div class="font-semibold">NodeJS-WWI23SEB</div>
        <div>NodeJS Template v1.2</div>
        <div>In Erstellung</div>
        <div>3</div>
        <div>WWI23SEB</div>
        <div class="text-gray-500">07.12.2025 09:17</div>
      </div>
    </div>
    
  </div>
</template>