<script setup lang="ts">
import { computed, onMounted } from 'vue' // onMounted hinzugefügt
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useDeploymentStore } from '@/stores/deployment.store' // <--- STORE IMPORTIEREN
import { 
  BarChart3, 
  Plus,
  Minus
} from 'lucide-vue-next'

const { t } = useI18n()
const router = useRouter()
const store = useDeploymentStore() // <--- STORE NUTZEN

// --- Computed Data ---
// Wir holen die ECHTE Anzahl der ausgewählten Studenten aus dem Store
const totalStudents = computed(() => store.draft.studentIds.length)

// Hilfsvariable für die UI-Steuerung (damit der Code lesbar bleibt)
// Wir greifen direkt auf den Store zu, statt lokale refs zu nutzen
const groupCount = computed({
  get: () => store.draft.groupCount,
  set: (val) => store.draft.groupCount = val
})

const mode = computed(() => store.draft.groupMode)

const showControls = computed(() => mode.value === 'custom')

// --- Lifecycle ---
onMounted(() => {
  // Sicherheits-Check: Wenn keine Studenten gewählt wurden, zurück zur Config
  if (totalStudents.value === 0) {
    router.replace({ name: 'deployment.config' })
  }
})

// --- Actions ---
const setOneGroup = () => {
  store.draft.groupMode = 'one'
  store.draft.groupCount = 1
}

const setEachUser = () => {
  store.draft.groupMode = 'eachUser' // Wichtig: Muss zum Type in types/index.ts passen ('eachUser', nicht 'each')
  store.draft.groupCount = totalStudents.value // <--- Hier wird jetzt die echte Anzahl gesetzt!
}

const setCustom = () => {
  store.draft.groupMode = 'custom'
  // Startwert für Individuell: Wenn aktuell 1, setzen wir es auf 2, damit man direkt sieht was passiert
  if (store.draft.groupCount === 1 && totalStudents.value > 1) {
    store.draft.groupCount = 2
  }
}

const increment = () => {
  if (store.draft.groupCount < totalStudents.value) {
    store.draft.groupCount++
  }
}

const decrement = () => {
  if (store.draft.groupCount > 1) {
    store.draft.groupCount--
  }
}

const handleNext = () => {
  console.log('Group Mode:', store.draft.groupMode)
  console.log('Group Count:', store.draft.groupCount)
  
  // Wir müssen nichts mehr als Query übergeben, da alles im Store gespeichert ist.
  router.push({ name: 'deployment.assignment' }) 
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

    <div class="flex-grow flex flex-col items-center justify-center max-w-lg mx-auto w-full">
      
      <h2 class="text-lg font-bold text-gray-900 mb-8">
        {{ t('deployment.groups.title') }}
      </h2>

      <div class="flex items-center gap-6 mb-10 h-20">
        <button 
          v-if="showControls"
          @click="decrement"
          class="w-12 h-12 rounded-lg bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors text-red-500"
          :disabled="groupCount <= 1"
          :class="{ 'opacity-50 cursor-not-allowed': groupCount <= 1 }"
        >
          <Minus :size="24" />
        </button>
        
        <div class="text-5xl font-normal text-gray-900 w-20 text-center select-none">
          {{ groupCount }}
        </div>
        
        <button 
          v-if="showControls"
          @click="increment"
          class="w-12 h-12 rounded-lg bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors text-emerald-600"
          :disabled="groupCount >= totalStudents"
          :class="{ 'opacity-50 cursor-not-allowed': groupCount >= totalStudents }"
        >
          <Plus :size="24" />
        </button>
      </div>

      <div class="flex flex-col gap-3 w-full max-w-xs">
        
        <button 
          @click="setOneGroup"
          class="w-full py-3 px-4 rounded-md border-2 font-medium transition-all text-sm"
          :class="mode === 'one' 
            ? 'bg-gray-300 border-gray-400 text-gray-900 font-bold' 
            : 'bg-gray-200 border-transparent text-gray-700 hover:bg-gray-300'"
        >
          {{ t('deployment.groups.one') }}
        </button>

        <button 
          @click="setEachUser"
          class="w-full py-3 px-4 rounded-md border-2 font-medium transition-all text-sm"
          :class="mode === 'eachUser' 
            ? 'bg-gray-300 border-gray-400 text-gray-900 font-bold' 
            : 'bg-gray-200 border-transparent text-gray-700 hover:bg-gray-300'"
        >
          {{ t('deployment.groups.eachUser') }}
        </button>

        <button 
          @click="setCustom"
          class="w-full py-3 px-4 rounded-md border-2 font-medium transition-all text-sm"
          :class="mode === 'custom' 
            ? 'bg-gray-300 border-gray-400 text-gray-900 font-bold' 
            : 'bg-gray-200 border-transparent text-gray-700 hover:bg-gray-300'"
        >
          {{ t('deployment.groups.custom') }}
        </button>

      </div>
    </div>

    <div class="flex justify-between items-center mt-8">
      <button 
        @click="handleBack"
        class="px-8 py-2.5 rounded-full bg-gray-400 text-white font-semibold hover:bg-gray-500 transition-colors"
      >
        {{ t('deployment.actions.back') }}
      </button>
      
      <button 
        @click="handleNext"
        class="px-8 py-2.5 rounded-full bg-emerald-700 text-white font-bold hover:bg-emerald-800 transition-colors shadow-lg shadow-emerald-700/20"
      >
        {{ t('deployment.actions.next') }}
      </button>
    </div>

  </div>
</template>