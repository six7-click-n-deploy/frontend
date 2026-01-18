<script setup lang="ts">
import { computed } from 'vue'
import { Check } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'

// Wir erwarten eine Prop, die sagt, wo wir sind (1, 2 oder 3)
const props = defineProps<{
  currentStep: number
}>()

const { t } = useI18n()

// Definition der Schritte
const steps = [
  { id: 1, label: 'deployment.steps.config' },     // Konfiguration
  { id: 2, label: 'deployment.steps.assignment' }, // Zuweisung
  { id: 3, label: 'deployment.steps.summary' }     // Abschluss
]
</script>

<template>
  <div class="w-full max-w-3xl mx-auto mb-8">
    <div class="relative flex justify-between items-center">
      
      <div class="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -z-10 rounded-full transform -translate-y-1/2"></div>
      
      <div 
        class="absolute top-1/2 left-0 h-1 bg-emerald-500 -z-10 rounded-full transform -translate-y-1/2 transition-all duration-500 ease-out"
        :style="{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }"
      ></div>

      <div 
        v-for="step in steps" 
        :key="step.id" 
        class="flex flex-col items-center gap-2 bg-transparent"
      >
        <div 
          class="w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 bg-white"
          :class="[
            step.id < currentStep 
              ? 'border-emerald-500 bg-emerald-500 text-white' // Erledigt
              : step.id === currentStep 
                ? 'border-emerald-600 text-emerald-700 ring-4 ring-emerald-50' // Aktiv
                : 'border-gray-300 text-gray-400' // Ausstehend
          ]"
        >
          <Check v-if="step.id < currentStep" :size="20" stroke-width="3" />
          <span v-else class="font-bold text-sm">{{ step.id }}</span>
        </div>

        <span 
          class="text-xs font-semibold uppercase tracking-wider transition-colors duration-300 absolute mt-12 w-32 text-center"
          :class="[
            step.id <= currentStep ? 'text-emerald-700' : 'text-gray-400'
          ]"
        >
          {{ t(step.label) }}
        </span>
      </div>

    </div>
    <div class="h-6"></div>
  </div>
</template>