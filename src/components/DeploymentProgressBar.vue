<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  currentStep: number
}>()

const { t } = useI18n()

// Definition der Schritte für sauberen Loop im Template
const steps = [
  { step: 1, key: 'deployment.steps.config' },
  { step: 2, key: 'deployment.steps.assignment' },
  { step: 3, key: 'deployment.steps.summary' }
]

// Berechnung der Breite des Verbindungsbalkens
// Da die Kreise mit 'justify-between' verteilt sind:
// Schritt 1: 0% (kein Balken nach rechts)
// Schritt 2: 50% (Balken bis zur Mitte)
// Schritt 3: 100% (voller Balken)
const progressWidth = computed(() => {
  if (props.currentStep === 1) return '0%'
  if (props.currentStep === 2) return '50%'
  return '100%'
})
</script>

<template>
  <div class="w-full mb-8 px-2"> <div class="relative">
      <div class="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -translate-y-1/2 rounded-full"></div>

      <div 
        class="absolute top-1/2 left-0 h-1 bg-emerald-500 -translate-y-1/2 rounded-full transition-all duration-500 ease-out"
        :style="{ width: progressWidth }"
      ></div>

      <div class="relative flex justify-between w-full">
        
        <div 
          v-for="item in steps" 
          :key="item.step" 
          class="flex flex-col items-center group"
        >
          <div 
            class="flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-bold z-10 transition-colors duration-300"
            :class="[
              currentStep >= item.step 
                ? 'bg-emerald-600 border-emerald-600 text-white shadow-[0_0_10px_rgba(16,185,129,0.4)]' 
                : 'bg-white border-gray-300 text-gray-400'
            ]"
          >
            {{ item.step }}
          </div>

          <span 
            class="absolute top-10 text-xs font-bold uppercase tracking-wider transition-colors duration-300 whitespace-nowrap"
            :class="[
              currentStep >= item.step ? 'text-emerald-700' : 'text-gray-400',
              // Kleine Justierung, damit Labels zentriert bleiben (optional, je nach Länge)
              item.step === 1 ? 'origin-left left-0' : '',
              item.step === 2 ? 'origin-center' : '',
              item.step === 3 ? 'origin-right right-0' : ''
            ]"
            :style="item.step === 2 ? 'transform: translateX(0)' : ''" 
          >
            {{ t(item.key) }}
          </span>
        </div>

      </div>
    </div>
    
    <div class="h-6"></div> 
  </div>
</template>