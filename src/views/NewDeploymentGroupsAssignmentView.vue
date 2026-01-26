<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useDeploymentStore } from '@/stores/deployment.store'
import DeploymentProgressBar from '@/components/DeploymentProgressBar.vue'
import { 
  BarChart3, 
  Plus, 
  Minus, 
  Check, 
  Users, 
  Settings2,
  ChevronsDown,
  X
} from 'lucide-vue-next'

const { t } = useI18n()
const router = useRouter()
const store = useDeploymentStore()

const activeGroupIndex = ref(0) 

const groupNames = ref<string[]>(store.draft.groupNames || [])

watch(groupNames, (newVal) => {
  store.draft.groupNames = newVal
}, { deep: true })

const totalStudents = computed(() => store.draft.studentIds.length)

const groupCount = computed({
  get: () => store.draft.groupCount,
  set: (val) => store.draft.groupCount = val
})

const mode = computed(() => store.draft.groupMode)
const showControls = computed(() => mode.value === 'custom')
const groupIndices = computed(() => Array.from({ length: store.draft.groupCount }, (_, i) => i))

const isAllAssignedToCurrent = computed(() => {
  const currentAssignments = store.draft.assignments[activeGroupIndex.value] || []
  return totalStudents.value > 0 && currentAssignments.length === totalStudents.value
})

onMounted(() => {
  if (totalStudents.value === 0) {
    router.replace({ name: 'deployment.config' })
    return
  }
  ensureAssignmentArrays()
})

watch(groupCount, (newCount) => {
  ensureAssignmentArrays()
  if (activeGroupIndex.value >= newCount) activeGroupIndex.value = Math.max(0, newCount - 1)
})

// Ensure assignment arrays exist for the current group count and keep names array in sync
const ensureAssignmentArrays = () => {
  for (let i = 0; i < store.draft.groupCount; i++) {
    if (!store.draft.assignments[i]) store.draft.assignments[i] = []
    if (groupNames.value[i] === undefined) groupNames.value[i] = ''
  }
}

// Toggle assigning all students to the active group (exclusive)
const toggleAssignAll = () => {
  if (isAllAssignedToCurrent.value) {
    store.draft.assignments[activeGroupIndex.value] = []
  } else {
    for (let i = 0; i < store.draft.groupCount; i++) store.draft.assignments[i] = []
    store.draft.assignments[activeGroupIndex.value] = [...store.draft.studentIds]
  }
}

// Single shared group: everyone in group 0 with a default group name
const setOneGroup = () => {
  store.draft.groupMode = 'one'
  store.draft.groupCount = 1
  activeGroupIndex.value = 0 
  store.draft.assignments[0] = [...store.draft.studentIds]
  groupNames.value[0] = t('deployment.assignment.defaultSingleName')
}

// One VM per student: create N groups, each holding exactly one id
const setEachUser = () => {
  store.draft.groupMode = 'eachUser'
  store.draft.groupCount = totalStudents.value
  for (let i = 0; i < store.draft.groupCount; i++) {
    store.draft.assignments[i] = []
    groupNames.value[i] = '' 
  }
  store.draft.studentIds.forEach((studentId, index) => {
    if (store.draft.assignments[index]) store.draft.assignments[index].push(studentId)
    groupNames.value[index] = studentId 
  })
  activeGroupIndex.value = 0
}

// Custom grouping: allow manual count (>=2) and assignments
const setCustom = () => {
  store.draft.groupMode = 'custom'
  if (store.draft.groupCount === 1 && totalStudents.value > 1) store.draft.groupCount = 2
}

const increment = () => { if (store.draft.groupCount < totalStudents.value) store.draft.groupCount++ }
const decrement = () => { if (store.draft.groupCount > 1) store.draft.groupCount-- }

const isAssignedToCurrentGroup = (studentId: string) => store.draft.assignments[activeGroupIndex.value]?.includes(studentId)
// Check whether the given student is assigned to any other group than the active one
const isAssignedToOtherGroup = (studentId: string) => {
  for (let i = 0; i < store.draft.groupCount; i++) {
    if (i === activeGroupIndex.value) continue
    if (store.draft.assignments[i]?.includes(studentId)) return true
  }
  return false
}
// Return the group index a student belongs to or null if unassigned
const getAssignedGroupIndex = (studentId: string): number | null => {
  for (let i = 0; i < store.draft.groupCount; i++) if (store.draft.assignments[i]?.includes(studentId)) return i
  return null
}
// Toggle assignment of a single student for the active group.
// If the student belongs to a different group, move them here (exclusive membership).
const toggleStudent = (studentId: string) => {
  const currentGroupIndex = activeGroupIndex.value
  if (!store.draft.assignments[currentGroupIndex]) store.draft.assignments[currentGroupIndex] = []
  const currentGroup = store.draft.assignments[currentGroupIndex]
  const oldGroupIndex = getAssignedGroupIndex(studentId)
  if (oldGroupIndex === currentGroupIndex) {
    const index = currentGroup.indexOf(studentId)
    if (index > -1) currentGroup.splice(index, 1)
  } else if (oldGroupIndex !== null) {
    const oldGroup = store.draft.assignments[oldGroupIndex]
    if (oldGroup) {
        const idx = oldGroup.indexOf(studentId)
        if (idx > -1) oldGroup.splice(idx, 1)
    }
    currentGroup.push(studentId)
  } else {
    currentGroup.push(studentId)
  }
}

const handleNext = () => router.push({ name: 'deployment.vars' }) 
const handleBack = () => router.back()
</script>

<template>
  <div class="max-w-6xl mx-auto w-full">
    
    <div class="bg-white rounded-2xl border shadow-sm min-h-[600px] flex flex-col overflow-hidden">
      
      <div class="p-8 pb-4">
        <div class="flex items-center gap-3 mb-6">
          <h1 class="text-3xl font-bold text-gray-900">
            {{ t('deployment.title') }}
          </h1>
          <BarChart3 :size="32" class="text-emerald-600" />
        </div>

        <DeploymentProgressBar :current-step="2" />
        
        <div class="border-b border-gray-100 mt-4"></div>
      </div>

      <div class="flex-grow flex flex-col md:flex-row">
        
        <div class="p-8 md:w-1/3 border-b md:border-b-0 md:border-r border-gray-100 flex flex-col items-center bg-gray-50/50">
          <div class="flex items-center gap-2 mb-6 text-emerald-700">
            <Settings2 :size="20" />
            <h2 class="text-sm uppercase tracking-wider font-bold">{{ t('deployment.groups.title') }}</h2>
          </div>

          <div class="flex items-center gap-4 mb-8">
            <button v-if="showControls" @click="decrement" class="w-10 h-10 rounded-lg bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 flex items-center justify-center transition-all text-red-500 shadow-sm" :disabled="groupCount <= 1" :class="{ 'opacity-50 cursor-not-allowed': groupCount <= 1 }"><Minus :size="20" /></button>
            <div class="text-5xl font-light text-gray-900 w-16 text-center select-none tabular-nums">{{ groupCount }}</div>
            <button v-if="showControls" @click="increment" class="w-10 h-10 rounded-lg bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 flex items-center justify-center transition-all text-emerald-600 shadow-sm" :disabled="groupCount >= totalStudents" :class="{ 'opacity-50 cursor-not-allowed': groupCount >= totalStudents }"><Plus :size="20" /></button>
          </div>

          <div class="flex flex-col gap-3 w-full max-w-[240px]">
            <button @click="setOneGroup" class="w-full py-3 px-4 rounded-lg border font-medium transition-all text-sm text-left flex justify-between items-center group" :class="mode === 'one' ? 'bg-white border-emerald-500 ring-1 ring-emerald-500 text-emerald-900 shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'">
              <div class="flex flex-col">
                <span>{{ t('deployment.groups.one') }}</span>
                <span v-if="mode === 'one'" class="text-[10px] text-emerald-600 font-normal">{{ t('deployment.groups.autoAssigned') }}</span>
              </div>
              <div class="w-2 h-2 rounded-full" :class="mode === 'one' ? 'bg-emerald-500' : 'bg-gray-200 group-hover:bg-gray-300'"></div>
            </button>
            <button @click="setEachUser" class="w-full py-3 px-4 rounded-lg border font-medium transition-all text-sm text-left flex justify-between items-center group" :class="mode === 'eachUser' ? 'bg-white border-emerald-500 ring-1 ring-emerald-500 text-emerald-900 shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'">
              <div class="flex flex-col">
                <span>{{ t('deployment.groups.eachUser') }}</span>
                <span v-if="mode === 'eachUser'" class="text-[10px] text-emerald-600 font-normal">{{ t('deployment.groups.autoDistributed') }}</span>
              </div>
              <div class="w-2 h-2 rounded-full" :class="mode === 'eachUser' ? 'bg-emerald-500' : 'bg-gray-200 group-hover:bg-gray-300'"></div>
            </button>
            <button @click="setCustom" class="w-full py-3 px-4 rounded-lg border font-medium transition-all text-sm text-left flex justify-between items-center group" :class="mode === 'custom' ? 'bg-white border-emerald-500 ring-1 ring-emerald-500 text-emerald-900 shadow-md' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'">
              <span>{{ t('deployment.groups.custom') }}</span><div class="w-2 h-2 rounded-full" :class="mode === 'custom' ? 'bg-emerald-500' : 'bg-gray-200 group-hover:bg-gray-300'"></div>
            </button>
          </div>
          <div class="mt-auto pt-8 text-center hidden md:block"><p class="text-xs text-gray-400">{{ t('deployment.groups.studentsSelected', { count: totalStudents }) }}</p></div>
        </div>

        <div class="p-8 md:w-2/3 flex flex-col h-full bg-white">
          <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-2 text-emerald-700">
              <Users :size="20" /><h2 class="text-sm uppercase tracking-wider font-bold">{{ t('deployment.assignment.title') }}</h2>
            </div>
            
            <button 
              @click="toggleAssignAll" 
              class="text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors border"
              :class="isAllAssignedToCurrent 
                ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' 
                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'"
              :title="isAllAssignedToCurrent ? t('deployment.assignment.removeAllTooltip') : t('deployment.assignment.moveAllTooltip')"
            >
              <component :is="isAllAssignedToCurrent ? X : ChevronsDown" :size="14" />
              {{ isAllAssignedToCurrent ? t('deployment.assignment.removeAll') : t('deployment.assignment.moveAllHere') }}
            </button>
            </div>
          
          <div class="flex flex-col h-[500px] gap-4"> 
              <div class="flex gap-2 overflow-x-auto pb-2 min-h-[60px] flex-shrink-0 scrollbar-thin">
                  <div 
                    v-for="index in groupIndices" 
                    :key="index" 
                    @click="activeGroupIndex = index" 
                    class="flex-shrink-0 px-4 py-2 rounded-lg font-bold text-sm transition-all border flex flex-col items-center justify-center min-w-[120px] max-w-[160px] cursor-pointer" 
                    :class="activeGroupIndex === index ? 'bg-orange-50 border-orange-300 text-orange-900 shadow-sm ring-1 ring-orange-200' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300'"
                  >
                    <input 
                        v-if="activeGroupIndex === index"
                        type="text"
                        v-model="groupNames[index]"
                        @click.stop 
                        :placeholder="t('deployment.assignment.vmNamePlaceholder')"
                        class="w-full text-center bg-transparent border-b border-orange-300 focus:border-orange-500 focus:outline-none p-0 text-sm font-bold text-orange-900 placeholder-orange-300"
                    />

                    <span 
                        v-else 
                        class="truncate w-full text-center" 
                        :title="groupNames[index] || t('deployment.assignment.vmDefaultName', { index: index + 1 })"
                    >
                      {{ groupNames[index] || t('deployment.assignment.vmDefaultName', { index: index + 1 }) }}
                    </span>

                    <span class="mt-1 text-[10px] bg-black/5 px-1.5 rounded-full font-medium">
                      {{ t('deployment.assignment.userCount', { count: store.draft.assignments[index]?.length || 0 }) }}
                    </span>
                  </div>
              </div>

              <div class="flex-grow bg-gray-50 rounded-xl p-2 border border-gray-100 overflow-y-auto">
                <div v-if="store.draft.studentIds.length === 0" class="h-full flex items-center justify-center text-gray-400 text-sm">{{ t('deployment.assignment.noStudents') }}</div>
                <div v-for="studentId in store.draft.studentIds" :key="studentId" @click="toggleStudent(studentId)" class="flex items-center gap-4 px-4 py-3 border-b last:border-b-0 border-gray-100 bg-white first:rounded-t-lg last:rounded-b-lg mb-0.5 hover:bg-gray-50 cursor-pointer transition-colors group">
                  <div class="relative w-6 h-6 flex-shrink-0 flex items-center justify-center">
                    <div v-if="isAssignedToCurrentGroup(studentId)"><div class="w-6 h-6 bg-emerald-500 rounded flex items-center justify-center shadow-sm"><Check :size="16" class="text-white" stroke-width="3" /></div></div>
                    <div v-else-if="isAssignedToOtherGroup(studentId)"><div class="w-5 h-5 bg-orange-100 border border-orange-200 rounded" :title="t('deployment.assignment.alreadyAssigned')"></div></div>
                    <div v-else class="w-5 h-5 border-2 border-gray-200 rounded group-hover:border-gray-300 transition-colors"></div>
                  </div>
                  <div class="flex flex-col">
                    <span class="text-gray-700 font-medium text-sm md:text-base group-hover:text-gray-900">{{ studentId }}</span>
                    <span v-if="isAssignedToOtherGroup(studentId) && !isAssignedToCurrentGroup(studentId)" class="text-[10px] text-orange-500 font-medium">{{ t('deployment.assignment.inOtherGroup') }}</span>
                  </div>
                </div>
              </div>
          </div>
        </div>
      </div>

      <div class="flex justify-between items-center p-8 pt-4 bg-white">
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
  </div>
</template>