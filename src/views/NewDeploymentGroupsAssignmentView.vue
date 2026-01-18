<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useDeploymentStore } from '@/stores/deployment.store'
import { 
  BarChart3, 
  Plus, 
  Minus, 
  Check, 
  Users, 
  Settings2,
  ArrowDownToLine // Neues Icon für "Alle zuweisen"
} from 'lucide-vue-next'

const { t } = useI18n()
const router = useRouter()
const store = useDeploymentStore()

// --- State für Assignment ---
const activeGroupIndex = ref(0) 

// --- Computed Data ---
const totalStudents = computed(() => store.draft.studentIds.length)

const groupCount = computed({
  get: () => store.draft.groupCount,
  set: (val) => store.draft.groupCount = val
})

const mode = computed(() => store.draft.groupMode)
const showControls = computed(() => mode.value === 'custom')

const groupIndices = computed(() => {
  return Array.from({ length: store.draft.groupCount }, (_, i) => i)
})

// --- Lifecycle ---
onMounted(() => {
  if (totalStudents.value === 0) {
    router.replace({ name: 'deployment.config' })
    return
  }
  ensureAssignmentArrays()
})

watch(groupCount, (newCount) => {
  ensureAssignmentArrays()
  if (activeGroupIndex.value >= newCount) {
    activeGroupIndex.value = Math.max(0, newCount - 1)
  }
})

const ensureAssignmentArrays = () => {
  for (let i = 0; i < store.draft.groupCount; i++) {
    if (!store.draft.assignments[i]) {
      store.draft.assignments[i] = []
    }
  }
}

// --- NEUE LOGIK: Alle in die aktuelle Gruppe verschieben ---
const assignAllToCurrentGroup = () => {
  // 1. Alle bestehenden Zuweisungen löschen (um Duplikate zu vermeiden)
  for (let i = 0; i < store.draft.groupCount; i++) {
    store.draft.assignments[i] = []
  }
  
  // 2. Alle Studenten in die AKTUELLER Gruppe kopieren
  // Wir erstellen eine Kopie des Arrays, um Referenzprobleme zu vermeiden
  store.draft.assignments[activeGroupIndex.value] = [...store.draft.studentIds]
}

// --- Actions: Groups Config (ANGESPASST) ---
const setOneGroup = () => {
  store.draft.groupMode = 'one'
  store.draft.groupCount = 1
  activeGroupIndex.value = 0 // Fokus auf die erste Gruppe
  
  // AUTOMATISCH: Alle in diese eine Gruppe werfen
  assignAllToCurrentGroup()
}

const setEachUser = () => {
  store.draft.groupMode = 'eachUser'
  store.draft.groupCount = totalStudents.value
  
  // AUTOMATISCH: Jeden User seiner eigenen Gruppe zuweisen (Index-basiert)
  // Erst alles leeren
  for (let i = 0; i < store.draft.groupCount; i++) {
    store.draft.assignments[i] = []
  }
  // Dann 1:1 verteilen
  store.draft.studentIds.forEach((studentId, index) => {
    if (store.draft.assignments[index]) {
      store.draft.assignments[index].push(studentId)
    }
  })
  
  activeGroupIndex.value = 0
}

const setCustom = () => {
  store.draft.groupMode = 'custom'
  // Bei Custom löschen wir nichts automatisch, da der User evtl. experimentiert
  if (store.draft.groupCount === 1 && totalStudents.value > 1) {
    store.draft.groupCount = 2
  }
}

const increment = () => {
  if (store.draft.groupCount < totalStudents.value) store.draft.groupCount++
}

const decrement = () => {
  if (store.draft.groupCount > 1) store.draft.groupCount--
}

// --- Actions: Assignment Logic ---
const isAssignedToCurrentGroup = (studentId: string) => {
  const currentGroup = store.draft.assignments[activeGroupIndex.value] || []
  return currentGroup.includes(studentId)
}

const isAssignedToOtherGroup = (studentId: string) => {
  for (let i = 0; i < store.draft.groupCount; i++) {
    if (i === activeGroupIndex.value) continue
    if (store.draft.assignments[i]?.includes(studentId)) return true
  }
  return false
}

const getAssignedGroupIndex = (studentId: string): number | null => {
  for (let i = 0; i < store.draft.groupCount; i++) {
    if (store.draft.assignments[i]?.includes(studentId)) return i
  }
  return null
}

const toggleStudent = (studentId: string) => {
  const currentGroupIndex = activeGroupIndex.value
  if (!store.draft.assignments[currentGroupIndex]) store.draft.assignments[currentGroupIndex] = []
  
  const currentGroup = store.draft.assignments[currentGroupIndex]
  const oldGroupIndex = getAssignedGroupIndex(studentId)

  if (oldGroupIndex === currentGroupIndex) {
    const index = currentGroup.indexOf(studentId)
    if (index > -1) currentGroup.splice(index, 1)
  }
  else if (oldGroupIndex !== null) {
    const oldGroup = store.draft.assignments[oldGroupIndex]
    if (oldGroup) {
        const idx = oldGroup.indexOf(studentId)
        if (idx > -1) oldGroup.splice(idx, 1)
    }
    currentGroup.push(studentId)
  }
  else {
    currentGroup.push(studentId)
  }
}

// --- Navigation ---
const handleNext = () => router.push({ name: 'deployment.summary' }) 
const handleBack = () => router.back()
</script>

<template>
  <div class="bg-white rounded-2xl border shadow-sm max-w-6xl mx-auto min-h-[600px] flex flex-col overflow-hidden">
    
    <div class="p-8 pb-4 flex items-center gap-3 border-b border-gray-100">
      <h1 class="text-3xl font-bold text-gray-900">
        {{ t('deployment.title') }}
      </h1>
      <BarChart3 :size="32" class="text-emerald-600" />
    </div>

    <div class="flex-grow flex flex-col md:flex-row">
      
      <div class="p-8 md:w-1/3 border-b md:border-b-0 md:border-r border-gray-100 flex flex-col items-center bg-gray-50/50">
        
        <div class="flex items-center gap-2 mb-6 text-emerald-700">
          <Settings2 :size="20" />
          <h2 class="text-sm uppercase tracking-wider font-bold">
            {{ t('deployment.groups.title') }}
          </h2>
        </div>

        <div class="flex items-center gap-4 mb-8">
          <button 
            v-if="showControls"
            @click="decrement"
            class="w-10 h-10 rounded-lg bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 flex items-center justify-center transition-all text-red-500 shadow-sm"
            :disabled="groupCount <= 1"
            :class="{ 'opacity-50 cursor-not-allowed': groupCount <= 1 }"
          >
            <Minus :size="20" />
          </button>
          
          <div class="text-5xl font-light text-gray-900 w-16 text-center select-none tabular-nums">
            {{ groupCount }}
          </div>
          
          <button 
            v-if="showControls"
            @click="increment"
            class="w-10 h-10 rounded-lg bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 flex items-center justify-center transition-all text-emerald-600 shadow-sm"
            :disabled="groupCount >= totalStudents"
            :class="{ 'opacity-50 cursor-not-allowed': groupCount >= totalStudents }"
          >
            <Plus :size="20" />
          </button>
        </div>

        <div class="flex flex-col gap-3 w-full max-w-[240px]">
          <button 
            @click="setOneGroup"
            class="w-full py-3 px-4 rounded-lg border font-medium transition-all text-sm text-left flex justify-between items-center group"
            :class="mode === 'one' 
              ? 'bg-white border-emerald-500 ring-1 ring-emerald-500 text-emerald-900 shadow-md' 
              : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'"
          >
            <div class="flex flex-col">
              <span>{{ t('deployment.groups.one') }}</span>
              <span v-if="mode === 'one'" class="text-[10px] text-emerald-600 font-normal">Automatisch zugewiesen</span>
            </div>
            <div class="w-2 h-2 rounded-full" :class="mode === 'one' ? 'bg-emerald-500' : 'bg-gray-200 group-hover:bg-gray-300'"></div>
          </button>

          <button 
            @click="setEachUser"
            class="w-full py-3 px-4 rounded-lg border font-medium transition-all text-sm text-left flex justify-between items-center group"
            :class="mode === 'eachUser' 
              ? 'bg-white border-emerald-500 ring-1 ring-emerald-500 text-emerald-900 shadow-md' 
              : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'"
          >
             <div class="flex flex-col">
              <span>{{ t('deployment.groups.eachUser') }}</span>
              <span v-if="mode === 'eachUser'" class="text-[10px] text-emerald-600 font-normal">Automatisch verteilt</span>
            </div>
            <div class="w-2 h-2 rounded-full" :class="mode === 'eachUser' ? 'bg-emerald-500' : 'bg-gray-200 group-hover:bg-gray-300'"></div>
          </button>

          <button 
            @click="setCustom"
            class="w-full py-3 px-4 rounded-lg border font-medium transition-all text-sm text-left flex justify-between items-center group"
            :class="mode === 'custom' 
              ? 'bg-white border-emerald-500 ring-1 ring-emerald-500 text-emerald-900 shadow-md' 
              : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'"
          >
            <span>{{ t('deployment.groups.custom') }}</span>
            <div class="w-2 h-2 rounded-full" :class="mode === 'custom' ? 'bg-emerald-500' : 'bg-gray-200 group-hover:bg-gray-300'"></div>
          </button>
        </div>

        <div class="mt-auto pt-8 text-center hidden md:block">
           <p class="text-xs text-gray-400">
             {{ totalStudents }} Studenten ausgewählt
           </p>
        </div>
      </div>

      <div class="p-8 md:w-2/3 flex flex-col h-full bg-white">
        
        <div class="flex items-center justify-between mb-6">
          <div class="flex items-center gap-2 text-emerald-700">
            <Users :size="20" />
            <h2 class="text-sm uppercase tracking-wider font-bold">
              {{ t('deployment.assignment.title') }}
            </h2>
          </div>
          
          <button 
            @click="assignAllToCurrentGroup"
            class="text-xs font-semibold flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full hover:bg-emerald-100 transition-colors border border-emerald-200"
            title="Verschiebt alle Studenten in diese Gruppe"
          >
            <ArrowDownToLine :size="14" />
            Alle hierhin verschieben
          </button>
        </div>

        <div class="flex flex-col h-[500px] gap-6">
            <div class="flex gap-2 overflow-x-auto pb-2 min-h-[60px] flex-shrink-0">
                <button 
                  v-for="index in groupIndices"
                  :key="index"
                  @click="activeGroupIndex = index"
                  class="flex-shrink-0 px-5 py-2 rounded-lg font-bold text-sm transition-all border flex flex-col items-center justify-center min-w-[80px]"
                  :class="activeGroupIndex === index 
                    ? 'bg-orange-50 border-orange-300 text-orange-900 shadow-sm' 
                    : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300'"
                >
                  <span class="text-xs font-normal opacity-70">VM</span>
                  <span>#{{ index + 1 }}</span>
                  <span class="mt-1 text-[10px] bg-black/5 px-1.5 rounded-full font-medium">
                     {{ store.draft.assignments[index]?.length || 0 }}
                  </span>
                </button>
            </div>

            <div class="flex-grow bg-gray-50 rounded-xl p-2 border border-gray-100 overflow-y-auto">
              <div v-if="store.draft.studentIds.length === 0" class="h-full flex items-center justify-center text-gray-400 text-sm">
                 Keine Studenten verfügbar.
              </div>

              <div 
                v-for="studentId in store.draft.studentIds" 
                :key="studentId"
                @click="toggleStudent(studentId)"
                class="flex items-center gap-4 px-4 py-3 border-b last:border-b-0 border-gray-100 bg-white first:rounded-t-lg last:rounded-b-lg mb-0.5 hover:bg-gray-50 cursor-pointer transition-colors group"
              >
                <div class="relative w-6 h-6 flex-shrink-0 flex items-center justify-center">
                   <div v-if="isAssignedToCurrentGroup(studentId)">
                      <div class="w-6 h-6 bg-emerald-500 rounded flex items-center justify-center shadow-sm">
                        <Check :size="16" class="text-white" stroke-width="3" />
                      </div>
                   </div>
                   
                   <div v-else-if="isAssignedToOtherGroup(studentId)">
                      <div class="w-5 h-5 bg-orange-100 border border-orange-200 rounded" title="Bereits zugewiesen"></div>
                   </div>
                   
                   <div v-else class="w-5 h-5 border-2 border-gray-200 rounded group-hover:border-gray-300 transition-colors"></div>
                </div>

                <div class="flex flex-col">
                  <span class="text-gray-700 font-medium text-sm md:text-base group-hover:text-gray-900">{{ studentId }}</span>
                  <span v-if="isAssignedToOtherGroup(studentId) && !isAssignedToCurrentGroup(studentId)" class="text-[10px] text-orange-500 font-medium">
                     In anderer Gruppe
                  </span>
                </div>
              </div>
            </div>
        </div>

      </div>
    </div>

    <div class="p-6 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
      <button 
        @click="handleBack"
        class="px-6 py-2.5 rounded-lg text-gray-600 font-medium hover:bg-gray-200 hover:text-gray-900 transition-colors"
      >
        {{ t('deployment.actions.back') }}
      </button>
      
      <button 
        @click="handleNext"
        class="px-8 py-2.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center gap-2"
      >
        {{ t('deployment.actions.next') }}
        <Check :size="18" />
      </button>
    </div>

  </div>
</template>