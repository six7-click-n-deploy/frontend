// Hilfsfunktion: Standardnamen setzen
function ensureDefaultGroupNames() {
  for (let i = 0; i < groupCount.value; i++) {
    if (!groupNames.value[i] || groupNames.value[i].trim() === '') {
      groupNames.value[i] = `team-${i + 1}`
    }
  }
  // Entferne überzählige Namen
  groupNames.value.length = groupCount.value
}

// Watcher für Gruppenanzahl, um Teamnamen zu setzen und Studenten aus entfernten Gruppen zu entfernen
watch(groupCount, (newCount, oldCount) => {
  ensureAssignmentArrays()
  ensureDefaultGroupNames()
  if (activeGroupIndex.value >= newCount) activeGroupIndex.value = Math.max(0, newCount - 1)

  // Wenn Gruppen reduziert werden: Studenten aus entfernten Gruppen in unassigned pool verschieben
  if (typeof oldCount === 'number' && oldCount > newCount) {
    // Alle Studenten aus entfernten Gruppen sammeln
    const removedStudents = []
    for (let i = newCount; i < oldCount; i++) {
      if (store.draft.assignments[i]) {
        removedStudents.push(...store.draft.assignments[i])
      }
    }
    // Entferne die Gruppen
    store.draft.assignments.length = newCount
    // Füge entfernte Studenten zu unassigned hinzu (d.h. entferne sie aus allen Gruppen, sie werden automatisch als unassigned erkannt)
    // (Die Logik für unassignedStudents computed macht das automatisch)
  }
}, { immediate: false })
<script setup lang="ts">

import { ref, computed, onMounted, watch, reactive, nextTick } from 'vue'
import { userApi } from '@/api/user.api'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useDeploymentStore } from '@/stores/deployment.store'
import DeploymentProgressBar from '@/components/DeploymentProgressBar.vue'
import { Plus, Minus, Users, ArrowLeft, ArrowRight, GripVertical, Trash2, UserPlus, Shuffle, X } from 'lucide-vue-next'


const { t } = useI18n()
const router = useRouter()
const store = useDeploymentStore()


// --- Reaktiver Cache-Wrapper ---
// Vue 3 erkennt Map-Änderungen nicht automatisch, daher als reactive-Objekt spiegeln
const studentCacheMap = store.studentCache ?? new Map<string, any>()
const studentCache = reactive({})

function syncStudentCacheToReactive() {
  // Map in reaktives Objekt spiegeln
  for (const [id, val] of studentCacheMap.entries()) {
    studentCache[id] = val
  }
}

// Initiales Spiegeln
syncStudentCacheToReactive()

// Helper: Student in Map UND reaktives Objekt setzen
function setStudentCache(id, val) {
  studentCacheMap.set(id, val)
  studentCache[id] = val
}

// --- State ---
const activeGroupIndex = ref(0) 
const draggedStudent = ref<string | null>(null)
const dragOverGroup = ref<number | null>(null)
const dragOverUnassigned = ref(false)

// Initialisierung aus dem Store
const groupNames = ref<string[]>(store.draft.groupNames || [])

// Synchronisierung mit Store
watch(groupNames, (newVal) => {
  store.draft.groupNames = newVal
}, { deep: true })


// --- Computed ---
const totalStudents = computed(() => store.draft.studentIds.length)

const groupCount = computed({
  get: () => store.draft.groupCount,
  set: (val) => store.draft.groupCount = val
})

const mode = computed(() => store.draft.groupMode)
const showControls = computed(() => mode.value === 'custom')
const groupIndices = computed(() => Array.from({ length: store.draft.groupCount }, (_, i) => i))

// Unzugewiesene Studenten
const unassignedStudents = computed(() => {
  const assigned = new Set<string>()
  if (store.draft.assignments && Array.isArray(store.draft.assignments)) {
    store.draft.assignments.forEach(group => {
      if (group) group.forEach(id => assigned.add(id))
    })
  }
  return store.draft.studentIds.filter(id => !assigned.has(id))
})

// --- Lifecycle ---


onMounted(async () => {
  // Draft-Check: Wenn keine Studenten im Draft, zurück zur Config
  if (!store.draft.studentIds || store.draft.studentIds.length === 0) {
    router.replace({ name: 'deployment.config' })
    return
  }
  // Draft-Check: Wenn keine Gruppenanzahl, setze auf 1
  if (!store.draft.groupCount || store.draft.groupCount < 1) {
    store.draft.groupCount = 1
  }
  ensureAssignmentArrays()
  // Cache befüllen/ergänzen: alle bekannten Studenten-Objekte aus Draft (Config-View hat Cache schon befüllt)
  const allIds = Array.from(new Set([
    ...store.draft.studentIds,
    ...[].concat(...(store.draft.assignments || [])),
    ...unassignedStudents.value
  ]))
  const missingIds: string[] = [];
  for (const id of allIds) {
    const cached = studentCache[id]
    const needsUpdate = !cached || (!cached.firstName && !cached.lastName && !cached.username && !cached.email)
    if (needsUpdate) {
      // Suche in allen gecachten Studenten nach dem Objekt mit dieser ID und mehr Infos
      let found = null
      for (const key in studentCache) {
        const s = studentCache[key]
        if (s && s.userId === id && (s.firstName || s.lastName || s.username || s.email)) {
          found = s
          break
        }
      }
      if (found) {
        setStudentCache(id, found)
      } else {
        missingIds.push(id)
        if (!cached) setStudentCache(id, { userId: id })
      }
    }
  }
  // Fehlt für IDs der Name, dann per API nachladen
  if (missingIds.length > 0) {
    const results = await Promise.all(missingIds.map(id => userApi.getById(id).then(res => res.data).catch(() => null)))
    results.forEach((user, idx) => {
      if (user && user.userId) {
        setStudentCache(user.userId, user)
      }
    })
    await nextTick()
  }
})

watch(groupCount, (newCount) => {
  ensureAssignmentArrays()
  if (activeGroupIndex.value >= newCount) activeGroupIndex.value = Math.max(0, newCount - 1)
})

// --- Logic ---
const ensureAssignmentArrays = () => {
  for (let i = 0; i < store.draft.groupCount; i++) {
    if (!store.draft.assignments[i]) store.draft.assignments[i] = []
    if (groupNames.value[i] === undefined) groupNames.value[i] = ''
  }
}

const setOneGroup = () => {
  store.draft.groupMode = 'one'
  store.draft.groupCount = 1
  activeGroupIndex.value = 0 
  store.draft.assignments[0] = [...store.draft.studentIds]
  groupNames.value[0] = t('deployment.assignment.defaultSingleName')
}

const setEachUser = () => {
  store.draft.groupMode = 'eachUser'
  store.draft.groupCount = totalStudents.value
  for (let i = 0; i < store.draft.groupCount; i++) {
    store.draft.assignments[i] = []
    groupNames.value[i] = `team-${i + 1}`
  }
  store.draft.studentIds.forEach((studentId, index) => {
    if (store.draft.assignments[index]) store.draft.assignments[index].push(studentId)
  })
  activeGroupIndex.value = 0
}

const setCustom = () => {
  store.draft.groupMode = 'custom'
  if (store.draft.groupCount === 1 && totalStudents.value > 1) store.draft.groupCount = 2
}

const increment = () => { if (store.draft.groupCount < totalStudents.value) store.draft.groupCount++ }
const decrement = () => {
  if (store.draft.groupCount > 1) {
    const oldCount = store.draft.groupCount
    const newCount = oldCount - 1
    // Studenten aus entfernten Gruppen sammeln und aus assignments entfernen
    const removedStudents = []
    for (let i = newCount; i < oldCount; i++) {
      if (store.draft.assignments[i]) {
        removedStudents.push(...store.draft.assignments[i])
      }
    }
    // Entferne die Gruppen
    store.draft.assignments.length = newCount
    // Die Studenten werden automatisch als unassigned erkannt (unassignedStudents computed)
    store.draft.groupCount = newCount
  }
}


// --- Drag & Drop Logic ---
const handleDragStart = (studentId: string, event: DragEvent) => {
  draggedStudent.value = studentId
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', studentId)
  }
}

const handleDragEnd = () => {
  draggedStudent.value = null
  dragOverGroup.value = null
  dragOverUnassigned.value = false
}

const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

const handleDragEnterGroup = (groupIndex: number) => {
  dragOverGroup.value = groupIndex
}

const handleDragLeaveGroup = () => {
  dragOverGroup.value = null
}

const handleDragEnterUnassigned = () => {
  dragOverUnassigned.value = true
}

const handleDragLeaveUnassigned = () => {
  dragOverUnassigned.value = false
}

const handleDropOnGroup = (groupIndex: number, event: DragEvent) => {
  event.preventDefault()
  const studentId = draggedStudent.value
  if (!studentId) return

  // Entferne von allen Gruppen (keine Mehrfachzuweisung)
  store.draft.assignments.forEach(group => {
    if (group) {
      let idx
      while ((idx = group.indexOf(studentId)) > -1) {
        group.splice(idx, 1)
      }
    }
  })

  // Füge zur Zielgruppe hinzu, falls nicht schon drin
  if (!store.draft.assignments[groupIndex]) {
    store.draft.assignments[groupIndex] = []
  }
  if (!store.draft.assignments[groupIndex].includes(studentId)) {
    store.draft.assignments[groupIndex].push(studentId)
  }

  dragOverGroup.value = null
}

const handleDropOnUnassigned = (event: DragEvent) => {
  event.preventDefault()
  const studentId = draggedStudent.value
  if (!studentId) return

  // Entferne von allen Gruppen (keine Mehrfachzuweisung)
  store.draft.assignments.forEach(group => {
    if (group) {
      let idx
      while ((idx = group.indexOf(studentId)) > -1) {
        group.splice(idx, 1)
      }
    }
  })

  dragOverUnassigned.value = false
}

const removeFromGroup = (studentId: string, groupIndex: number) => {
  const group = store.draft.assignments[groupIndex]
  if (group) {
    const idx = group.indexOf(studentId)
    if (idx > -1) group.splice(idx, 1)
  }
}

const shuffleStudents = () => {
  // Alle Studenten sammeln
  const allStudents = [...store.draft.studentIds]
  
  // Fisher-Yates Shuffle
  for (let i = allStudents.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allStudents[i], allStudents[j]] = [allStudents[j], allStudents[i]]
  }
  
  // Gleichmäßig auf Gruppen verteilen
  const studentsPerGroup = Math.floor(allStudents.length / store.draft.groupCount)
  const remainder = allStudents.length % store.draft.groupCount
  
  let currentIndex = 0
  for (let i = 0; i < store.draft.groupCount; i++) {
    const groupSize = studentsPerGroup + (i < remainder ? 1 : 0)
    store.draft.assignments[i] = allStudents.slice(currentIndex, currentIndex + groupSize)
    currentIndex += groupSize
  }
}

const clearAllAssignments = () => {
  for (let i = 0; i < store.draft.groupCount; i++) {
    store.draft.assignments[i] = []
  }
}

const handleNext = () => router.push({ name: 'deployment.variables' }) 
const handleBack = () => router.push({ name: 'deployment.config' }) 
</script>

<template>
  <div class="max-w-[1800px] mx-auto w-full px-4">
    
    <div class="bg-gradient-to-br from-white to-gray-50 rounded-2xl border-2 border-gray-200 shadow-xl min-h-[700px] flex flex-col overflow-hidden">
      
      <!-- Header -->
      <div class="p-8 pb-6 bg-white border-b-2 border-gray-200">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg">
            <Users :size="28" class="text-white" />
          </div>
          <h1 class="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            {{ t('deployment.title') }}
          </h1>
        </div>
        <DeploymentProgressBar :current-step="2" />
      </div>

      <!-- Controls Section -->
      <div class="p-6 bg-white border-b-2 border-gray-200">
        <div class="flex flex-wrap items-center justify-between gap-4">
          
          <!-- Mode Selection -->
          <div class="flex gap-2">
            <button @click="setOneGroup" 
              class="px-5 py-2.5 rounded-xl font-semibold transition-all text-sm border-2"
              :class="mode === 'one' 
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-lg shadow-emerald-600/30' 
                : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50'">
              {{ t('deployment.groups.one') }}
            </button>
            <button @click="setEachUser" 
              class="px-5 py-2.5 rounded-xl font-semibold transition-all text-sm border-2"
              :class="mode === 'eachUser' 
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-lg shadow-emerald-600/30' 
                : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50'">
              {{ t('deployment.groups.eachUser') }}
            </button>
            <button @click="setCustom" 
              class="px-5 py-2.5 rounded-xl font-semibold transition-all text-sm border-2"
              :class="mode === 'custom' 
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-lg shadow-emerald-600/30' 
                : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50'">
              {{ t('deployment.groups.custom') }}
            </button>
          </div>

          <!-- Team Counter -->
          <div v-if="showControls" class="flex items-center gap-3 bg-gray-100 px-4 py-2 rounded-xl border-2 border-gray-200">
            <button @click="decrement" 
              class="w-9 h-9 rounded-lg bg-white border border-gray-300 hover:border-red-400 hover:bg-red-50 flex items-center justify-center transition-all text-red-600 disabled:opacity-40 disabled:cursor-not-allowed" 
              :disabled="groupCount <= 1">
              <Minus :size="18" />
            </button>
            <div class="flex items-center gap-2">
              <span class="text-3xl font-bold text-gray-900 w-12 text-center tabular-nums">{{ groupCount }}</span>
              <span class="text-sm font-semibold text-gray-600">Teams</span>
            </div>
            <button @click="increment" 
              class="w-9 h-9 rounded-lg bg-white border border-gray-300 hover:border-emerald-400 hover:bg-emerald-50 flex items-center justify-center transition-all text-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed" 
              :disabled="groupCount >= totalStudents">
              <Plus :size="18" />
            </button>
          </div>

          <!-- Action Buttons -->
          <div class="flex gap-2">
            <button @click="shuffleStudents" 
              class="px-4 py-2.5 rounded-xl bg-purple-100 text-purple-700 font-semibold hover:bg-purple-200 transition-all flex items-center gap-2 border-2 border-purple-200"
              title="Zufällig verteilen">
              <Shuffle :size="18" />
              Zufall
            </button>
            <button @click="clearAllAssignments" 
              class="px-4 py-2.5 rounded-xl bg-red-100 text-red-700 font-semibold hover:bg-red-200 transition-all flex items-center gap-2 border-2 border-red-200"
              title="Alle Zuweisungen löschen">
              <Trash2 :size="18" />
              Zurücksetzen
            </button>
          </div>
        </div>

        <!-- Info Banner -->
        <div class="mt-4 bg-blue-50 border-2 border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <div class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
            <GripVertical :size="16" class="text-white" />
          </div>
          <div>
            <p class="font-semibold text-blue-900 mb-1">Drag & Drop aktiviert</p>
            <p class="text-sm text-blue-700">Ziehen Sie Studenten per Drag & Drop zwischen den Teams und dem Nicht-zugewiesenen Bereich hin und her.</p>
          </div>
        </div>
      </div>

      <!-- Main Content Grid -->
      <div class="flex-grow p-6 overflow-hidden">
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
          
          <!-- Unassigned Students Pool -->
          <div class="lg:col-span-1">
            <div class="h-full flex flex-col bg-white rounded-xl border-2 border-gray-300 overflow-hidden shadow-lg">
              <div class="bg-white px-4 py-3 border-b-2 border-gray-200 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <UserPlus :size="20" class="text-gray-700" />
                  <h3 class="font-bold text-gray-900">Nicht zugewiesen</h3>
                </div>
                <span class="px-2.5 py-1 bg-gray-100 rounded-full text-xs font-bold text-gray-700 border-2 border-gray-200">
                  {{ unassignedStudents.length }}
                </span>
              </div>
              
              <div 
                class="flex-grow p-3 overflow-y-auto bg-gray-50"
                :class="dragOverUnassigned ? 'bg-gray-200 ring-4 ring-gray-400' : ''"
                @dragover="handleDragOver"
                @dragenter="handleDragEnterUnassigned"
                @dragleave="handleDragLeaveUnassigned"
                @drop="handleDropOnUnassigned">
                
                <div v-if="unassignedStudents.length === 0" 
                  class="h-full flex items-center justify-center text-gray-400 text-sm italic text-center px-4 border-2 border-dashed border-gray-300 rounded-lg bg-white">
                  Alle Studenten sind Teams zugewiesen
                </div>
                
                <div v-else class="space-y-2">
                  <div v-for="studentId in unassignedStudents" 
                    :key="studentId"
                    draggable="true"
                    @dragstart="(e) => handleDragStart(studentId, e)"
                    @dragend="handleDragEnd"
                    class="group bg-white rounded-lg px-4 py-3 border-2 border-gray-200 cursor-move hover:border-gray-400 hover:shadow-lg hover:scale-[1.02] transition-all flex items-center gap-3">
                    <GripVertical :size="18" class="text-gray-400 group-hover:text-gray-600 transition-colors" />
                    <span class="font-semibold text-gray-700 group-hover:text-gray-900 flex-1 transition-colors">
                      {{
                        (() => {
                          const s = studentCache[studentId]
                          if (!s) return studentId;
                          if (s.firstName || s.lastName) return `${s.firstName || ''} ${s.lastName || ''}`.trim();
                          if (s.username) return s.username;
                          if (s.email) return s.email;
                          return studentId;
                        })()
                      }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Teams Grid -->
          <div class="lg:col-span-3">
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 h-full overflow-y-auto pr-2">
              <div v-for="(assignments, index) in store.draft.assignments.slice(0, groupCount)" 
                :key="index"
                class="flex flex-col bg-white rounded-xl border-2 shadow-lg overflow-hidden transition-all"
                :class="dragOverGroup === index 
                  ? 'border-emerald-500 ring-4 ring-emerald-200 shadow-2xl scale-[1.02]' 
                  : 'border-gray-200 hover:border-emerald-300 hover:shadow-xl'">
                
                <!-- Team Header -->
                <div class="bg-white px-4 py-3 border-b-2 border-gray-200">
                  <input 
                    type="text"
                    v-model="groupNames[index]"
                    :placeholder="t('deployment.assignment.vmDefaultName', { index: index + 1 })"
                    class="w-full bg-gray-50 text-gray-900 placeholder-gray-400 px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 focus:outline-none font-bold text-center transition-all"
                  />
                  <div class="mt-2 flex items-center justify-center gap-2 bg-emerald-50 rounded-lg px-3 py-1.5">
                    <Users :size="16" class="text-emerald-600" />
                    <span class="text-sm font-semibold text-emerald-700">
                      {{ assignments?.length || 0 }} {{ assignments?.length === 1 ? 'Student' : 'Studenten' }}
                    </span>
                  </div>
                </div>

                <!-- Drop Zone -->
                <div 
                  class="flex-grow p-3 min-h-[200px] overflow-y-auto"
                  :class="dragOverGroup === index ? 'bg-emerald-50' : 'bg-gray-50'"
                  @dragover="handleDragOver"
                  @dragenter="() => handleDragEnterGroup(index)"
                  @dragleave="handleDragLeaveGroup"
                  @drop="(e) => handleDropOnGroup(index, e)">
                  
                  <div v-if="!assignments || assignments.length === 0" 
                    class="h-full flex flex-col items-center justify-center text-gray-400 text-sm italic border-2 border-dashed border-gray-300 rounded-lg p-4 bg-white">
                    <UserPlus :size="32" class="mb-2 opacity-50" />
                    <p>Studenten hier ablegen</p>
                  </div>
                  
                  <div v-else class="space-y-2">
                    <div v-for="studentId in assignments" 
                      :key="studentId"
                      draggable="true"
                      @dragstart="(e) => handleDragStart(studentId, e)"
                      @dragend="handleDragEnd"
                      class="group bg-white rounded-lg px-3 py-2.5 border-2 border-gray-200 cursor-move hover:border-emerald-400 hover:shadow-lg hover:scale-[1.02] transition-all flex items-center gap-2">
                      <GripVertical :size="16" class="text-gray-400 group-hover:text-emerald-600 transition-colors flex-shrink-0" />
                      <span class="font-semibold text-gray-700 group-hover:text-gray-900 flex-1 text-sm transition-colors">
                        {{
                          (() => {
                            const s = studentCache[studentId]
                            if (!s) return studentId;
                            if (s.firstName || s.lastName) return `${s.firstName || ''} ${s.lastName || ''}`.trim();
                            if (s.username) return s.username;
                            if (s.email) return s.email;
                            return studentId;
                          })()
                        }}
                      </span>
                      <button 
                        @click="removeFromGroup(studentId, index)"
                        class="opacity-0 group-hover:opacity-100 transition-all p-1.5 hover:bg-red-100 rounded-lg"
                        title="Entfernen">
                        <X :size="14" class="text-red-600" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- Footer -->
      <div class="flex justify-between items-center p-6 pt-4 bg-white border-t-2 border-gray-200">
        <button 
          @click="handleBack"
          class="flex items-center gap-2 px-8 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-all shadow-md">
          <ArrowLeft :size="20" />
          {{ t('deployment.actions.back') }}
        </button>
        
        <div class="text-center">
          <p class="text-sm text-gray-500 mb-1">Fortschritt</p>
          <p class="text-lg font-bold text-emerald-600">
            {{ totalStudents - unassignedStudents.length }} / {{ totalStudents }} zugewiesen
          </p>
        </div>
        
        <button 
          @click="handleNext"
          :disabled="unassignedStudents.length > 0 || store.draft.assignments.slice(0, groupCount).some(g => !g || g.length === 0)"
          class="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold hover:from-emerald-700 hover:to-teal-700 transition-all shadow-lg shadow-emerald-600/30 disabled:opacity-50 disabled:cursor-not-allowed">
          {{ t('deployment.actions.next') }}
          <ArrowRight :size="20" />
        </button>
      </div>

    </div>
  </div>
</template>