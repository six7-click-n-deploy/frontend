<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  currentStep: number
}>()

const { t } = useI18n()

// Berechnung der Breite des grünen Balkens
const progressWidth = computed(() => {
  if (props.currentStep === 1) return '33%'
  if (props.currentStep === 2) return '66%'
  return '100%'
})
</script>

<template>
  <div class="w-full mb-8">
    
    <div class="flex justify-between text-xs font-bold uppercase tracking-wider mb-2 transition-colors duration-300">
      <span :class="currentStep >= 1 ? 'text-emerald-700' : 'text-gray-400'">
        {{ t('deployment.steps.config') }}
      </span>
      
      <span :class="currentStep >= 2 ? 'text-emerald-700' : 'text-gray-400'">
        {{ t('deployment.steps.assignment') }}
      </span>
      
      <span :class="currentStep >= 3 ? 'text-emerald-700' : 'text-gray-400'">
        {{ t('deployment.steps.summary') }}
      </span>
    </div>

    <div class="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
      <div 
        class="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-700 ease-out rounded-full shadow-[0_0_10px_rgba(16,185,129,0.4)]"
        :style="{ width: progressWidth }"
      ></div>
    </div>
    
  </div>
</template>