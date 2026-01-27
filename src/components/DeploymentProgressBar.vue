<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  currentStep: number
}>()

const { t } = useI18n()

// 4 Schritte: Auswahl -> Verteilung -> Variablen -> Übersicht
const steps = [
  { step: 1, key: 'deployment.steps.config' },
  { step: 2, key: 'deployment.steps.assignment' },
  { step: 3, key: 'deployment.steps.vars' },
  { step: 4, key: 'deployment.steps.summary' }
]

// Berechnet die Breite automatisch basierend auf der Länge des Arrays (jetzt 3)
const progressWidth = computed(() => {
  const totalSteps = steps.length
  // Schutz vor Division durch Null, falls nur 1 Schritt da wäre
  if (totalSteps <= 1) return '0%'
  
  const percentage = ((props.currentStep - 1) / (totalSteps - 1)) * 100
  // Begrenzung auf 0-100% zur Sicherheit
  return `${Math.min(Math.max(percentage, 0), 100)}%`
})

// Hilfsfunktion für Text-Ausrichtung
const getTextAlignmentClass = (step: number, total: number) => {
  if (step === 1) return 'left-0 origin-left'              // Erster: Linksbuendig
  if (step === total) return 'right-0 origin-right'        // Letzter: Rechtsbuendig
  return 'left-1/2 -translate-x-1/2 origin-center'         // Alle dazwischen: Zentriert
}
</script>

<template>
  <div class="w-full mb-8 px-2"> 
    <div class="relative">
      <div class="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -translate-y-1/2 rounded-full"></div>

      <div 
        class="absolute top-1/2 left-0 h-1 bg-emerald-500 -translate-y-1/2 rounded-full transition-all duration-500 ease-out"
        :style="{ width: progressWidth }"
      ></div>

      <div class="relative flex justify-between w-full">
        
        <div 
          v-for="item in steps" 
          :key="item.step" 
          class="flex flex-col items-center group relative" 
        >
          <div 
            class="flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-bold z-10 transition-all duration-300 bg-white"
            :class="[
              currentStep >= item.step 
                ? 'border-emerald-600 text-emerald-600 shadow-[0_0_10px_rgba(16,185,129,0.4)]' 
                : 'border-gray-300 text-gray-400',
              // Füllt den Kreis komplett grün, wenn der Schritt erledigt ist
              currentStep > item.step ? '!bg-emerald-600 !text-white' : '',
              // Aktueller Schritt ist weiß mit grünem Rand und pulsiert leicht
              currentStep === item.step ? 'text-emerald-600 animate-pulse' : ''
            ]"
          >
            <span v-if="currentStep > item.step">✓</span>
            <span v-else>{{ item.step }}</span>
          </div>

          <span 
            class="absolute top-10 text-xs font-bold uppercase tracking-wider transition-colors duration-300 whitespace-nowrap"
            :class="[
              currentStep >= item.step ? 'text-emerald-700' : 'text-gray-400',
              getTextAlignmentClass(item.step, steps.length)
            ]"
          >
            {{ t(item.key) }}
          </span>
        </div>

      </div>
    </div>
    
    <div class="h-6"></div> 
  </div>
</template>