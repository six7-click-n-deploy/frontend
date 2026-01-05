<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { 
  BarChart3, 
  Check,
  Square
} from 'lucide-vue-next'

const { t } = useI18n()
const router = useRouter()

// --- Mock Data (Simuliert Daten aus vorherigen Schritten) ---
const groupCount = 2 // Angenommen, im Schritt vorher wurden 2 Gruppen gewählt

const allStudents = [
  { id: 's232723', name: 's232723' },
  { id: 's235734', name: 's235734' },
  { id: 's235778', name: 's235778' },
  { id: 's245633', name: 's245633' },
  { id: 's456789', name: 's456789' },
  { id: 's254764', name: 's254764' },
  { id: 's456999', name: 's456999' },
  { id: 's556723', name: 's556723' },
]

// --- State ---
const activeGroupIndex = ref(0) // Welche Gruppe bearbeiten wir gerade? (0 = Gruppe 1)

// Wir erstellen ein Array von Arrays. Index 0 ist Gruppe 1, Index 1 ist Gruppe 2...
// Initial leer.
const groups = ref<string[][]>(Array.from({ length: groupCount }, () => []))

// --- Helpers ---
const isAssignedToCurrentGroup = (studentId: string) => {
  return groups.value[activeGroupIndex.value]?.includes(studentId) ?? false;
}

const isAssignedToOtherGroup = (studentId: string) => {
  // Prüfen, ob die ID in IRGENDEINER Gruppe ist, aber NICHT in der aktuellen
  return groups.value.some((group, index) => 
    index !== activeGroupIndex.value && group.includes(studentId)
  )
}

// --- Actions ---
const toggleStudent = (studentId: string) => {
  // Wenn Student schon woanders drin ist, machen wir nichts (oder man könnte ihn rüberziehen)
  if (isAssignedToOtherGroup(studentId)) return
  
  //const currentGroup = groups.value[activeGroupIndex.value]
  //const index = currentGroup.indexOf(studentId)
  

  const currentGroup = groups.value[activeGroupIndex.value];

// Sicherheits-Check (Guard Clause)
if (!currentGroup) {
  console.warn("Fehler: Aktive Gruppe nicht gefunden für Index", activeGroupIndex.value);
  return; 
}

// Ab hier weiß TypeScript: currentGroup existiert wirklich
const index = currentGroup.indexOf(studentId);

  
  if (index === -1) {
    // Hinzufügen
    currentGroup.push(studentId)
  } else {
    // Entfernen
    currentGroup.splice(index, 1)
  }
}

const handleNext = () => {
  console.log('Final Assignments:', groups.value)
  router.push({ name: 'deployment-summary' })
  // Hier würde jetzt der API Call zum Backend gehen: "Starte Deployment!"
  // router.push({ name: 'deployment-success' }) 
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
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-12 flex-grow">
      
      <div class="flex flex-col gap-4">
        <button 
          v-for="(group, index) in groups"
          :key="index"
          @click="activeGroupIndex = index"
          class="py-4 px-6 rounded-2xl font-bold text-xl transition-all shadow-sm border-2 text-left"
          :class="activeGroupIndex === index 
            ? 'bg-gradient-to-r from-orange-300 to-orange-50 border-orange-300 text-gray-900 scale-105' 
            : 'bg-gray-100 border-transparent text-gray-500 hover:bg-gray-200'"
        >
          {{ t('deployment.assignment.groupPrefix') }} {{ index + 1 }}
        </button>
      </div>

      <div class="md:col-span-2 bg-gray-100/50 rounded-xl p-2 border border-gray-200 max-h-[400px] overflow-y-auto">
        
        <div 
          v-for="student in allStudents" 
          :key="student.id"
          @click="toggleStudent(student.id)"
          class="flex items-center gap-4 px-4 py-3 border-b last:border-b-0 border-gray-200 transition-colors select-none"
          :class="[
            isAssignedToOtherGroup(student.id) ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-200/50'
          ]"
        >
          <div class="relative w-6 h-6 flex-shrink-0">
             <div v-if="isAssignedToCurrentGroup(student.id)">
                <Check :size="24" class="text-gray-800" stroke-width="3" />
             </div>
             
             <div v-else-if="isAssignedToOtherGroup(student.id)">
                <div class="w-5 h-5 bg-gray-400 rounded-sm mt-0.5 ml-0.5"></div>
             </div>
             
             <div v-else class="w-5 h-5 border-2 border-gray-400 rounded-sm mt-0.5 ml-0.5"></div>
          </div>
          <span class="text-gray-700 font-medium text-lg">{{ student.name }}</span>
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