<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useDeploymentStore } from '@/stores/deployment.store'
import { 
  BarChart3, 
  Check
} from 'lucide-vue-next'

const { t } = useI18n()
const router = useRouter()
const store = useDeploymentStore()

// --- State ---
const activeGroupIndex = ref(0) // Welche Gruppe bearbeiten wir gerade? (0 = Gruppe 1)

// --- Lifecycle ---
onMounted(() => {
  // Sicherheits-Check: Wenn keine Studenten gewählt wurden, zurück zur Config
  if (store.draft.studentIds.length === 0) {
    router.replace({ name: 'deployment.config' })
    return
  }

  // Initialisierung: Wir stellen sicher, dass für jede Gruppe ein leeres Array existiert
  for (let i = 0; i < store.draft.groupCount; i++) {
    if (!store.draft.assignments[i]) {
      store.draft.assignments[i] = []
    }
  }
})

// --- Computed ---

// Erzeugt ein Array von Indizes [0, 1, 2...] basierend auf der echten Anzahl aus dem Store
const groupIndices = computed(() => {
  return Array.from({ length: store.draft.groupCount }, (_, i) => i)
})

// Prüft, ob ein Student in der AKTUELLEN Gruppe ist
const isAssignedToCurrentGroup = (studentId: string) => {
  const currentGroup = store.draft.assignments[activeGroupIndex.value] || []
  return currentGroup.includes(studentId)
}

// Prüft, ob ein Student in IRGENDEINER ANDEREN Gruppe ist
const isAssignedToOtherGroup = (studentId: string) => {
  for (let i = 0; i < store.draft.groupCount; i++) {
    if (i === activeGroupIndex.value) continue // Aktuelle Gruppe ignorieren
    if (store.draft.assignments[i]?.includes(studentId)) {
      return true
    }
  }
  return false
}

// Hilfsfunktion: Findet heraus, WO der Student gerade ist
const getAssignedGroupIndex = (studentId: string): number | null => {
  for (let i = 0; i < store.draft.groupCount; i++) {
    if (store.draft.assignments[i]?.includes(studentId)) {
      return i
    }
  }
  return null
}

// --- Actions (REPARIERT) ---
const toggleStudent = (studentId: string) => {
  const currentGroupIndex = activeGroupIndex.value
  
  // Sicherstellen, dass das Ziel-Array existiert
  if (!store.draft.assignments[currentGroupIndex]) {
    store.draft.assignments[currentGroupIndex] = []
  }
  const currentGroup = store.draft.assignments[currentGroupIndex]

  const oldGroupIndex = getAssignedGroupIndex(studentId)

  // Fall 1: Student ist schon in der aktuellen Gruppe -> Entfernen
  if (oldGroupIndex === currentGroupIndex) {
    const index = currentGroup.indexOf(studentId)
    if (index > -1) currentGroup.splice(index, 1)
  }
  // Fall 2: Student ist in einer ANDEREN Gruppe -> Verschieben (Move)
  else if (oldGroupIndex !== null) {
    // Alte Gruppe holen
    const oldGroup = store.draft.assignments[oldGroupIndex]
    
    // FIX: Prüfen ob oldGroup wirklich existiert bevor wir darauf zugreifen
    if (oldGroup) {
        const idx = oldGroup.indexOf(studentId)
        if (idx > -1) oldGroup.splice(idx, 1)
    }

    // In neue Gruppe hinzufügen
    currentGroup.push(studentId)
  }
  // Fall 3: Student ist nirgends -> Hinzufügen
  else {
    currentGroup.push(studentId)
  }
}

const handleNext = () => {
  console.log('Final Assignments:', store.draft.assignments)
  router.push({ name: 'deployment.vars' })
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

    <div class="text-center mb-8">
      <h2 class="text-lg font-bold text-gray-900">
        {{ t('deployment.assignment.title') }}
      </h2>
      <p class="text-xs text-gray-400 mt-1">
        {{ store.draft.groupCount }} VMs verfügbar
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-12 flex-grow">
      
      <div class="flex flex-col gap-4 overflow-y-auto max-h-[400px] pr-1">
        <button 
          v-for="index in groupIndices"
          :key="index"
          @click="activeGroupIndex = index"
          class="py-4 px-6 rounded-2xl font-bold text-xl transition-all shadow-sm border-2 text-left flex justify-between items-center"
          :class="activeGroupIndex === index 
            ? 'bg-gradient-to-r from-orange-300 to-orange-50 border-orange-300 text-gray-900 scale-105' 
            : 'bg-gray-100 border-transparent text-gray-500 hover:bg-gray-200'"
        >
          <span>{{ t('deployment.assignment.groupPrefix') }} {{ index + 1 }}</span>
          
          <span class="text-sm bg-white/40 px-2 py-0.5 rounded text-gray-700 font-normal">
             {{ store.draft.assignments[index]?.length || 0 }}
          </span>
        </button>
      </div>

      <div class="md:col-span-2 bg-gray-100/50 rounded-xl p-2 border border-gray-200 max-h-[400px] overflow-y-auto">
        
        <div 
          v-for="studentId in store.draft.studentIds" 
          :key="studentId"
          @click="toggleStudent(studentId)"
          class="flex items-center gap-4 px-4 py-3 border-b last:border-b-0 border-gray-200 transition-colors select-none cursor-pointer hover:bg-gray-200/50"
        >
          <div class="relative w-6 h-6 flex-shrink-0">
             <div v-if="isAssignedToCurrentGroup(studentId)">
                <Check :size="24" class="text-gray-800" stroke-width="3" />
             </div>
             
             <div v-else-if="isAssignedToOtherGroup(studentId)">
                <div class="w-5 h-5 bg-orange-300 rounded-sm mt-0.5 ml-0.5" title="Bereits zugewiesen"></div>
             </div>
             
             <div v-else class="w-5 h-5 border-2 border-gray-400 rounded-sm mt-0.5 ml-0.5"></div>
          </div>

          <div class="flex flex-col">
            <span class="text-gray-700 font-medium text-lg">{{ studentId }}</span>
            <span v-if="isAssignedToOtherGroup(studentId) && !isAssignedToCurrentGroup(studentId)" class="text-xs text-orange-600">
               Bereits in anderer Gruppe
            </span>
          </div>
        </div>

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
        @click="handleNext"
        class="px-8 py-2.5 rounded-full bg-emerald-700 text-white font-bold hover:bg-emerald-800 transition-colors shadow-lg shadow-emerald-700/20"
      >
        {{ t('deployment.actions.next') }}
      </button>
    </div>

  </div>
</template>