<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useDeploymentStore } from '@/stores/deployment.store'
import DeploymentProgressBar from '@/components/DeploymentProgressBar.vue'
import { useToast } from '@/composables/useToast' 
import { 
  BarChart3, 
  Search,
  Check,
  ArrowLeft,
  ArrowRight
} from 'lucide-vue-next'
import { courseApi } from '@/api/course.api'
import { userApi } from '@/api/user.api'
import { useToast } from '@/composables/useToast'

const { t } = useI18n()
const router = useRouter()
const store = useDeploymentStore()
const toast = useToast()

const courses = ref<any[]>([])

// Zwei separate Listen: Cache (initial) + aktuelle Ansicht (Suche/Filter)
const allStudents = ref<any[]>([])
const students = ref<any[]>([])

// Verwende den globalen Cache aus dem Store
const studentCache = computed(() => store.studentCache)
const courseCache = computed(() => store.courseCache)

const studentSearchQuery = ref('')
const loadingCourses = ref(false)
const loadingStudents = ref(false)
const coursesError = ref<string | null>(null)
const studentsError = ref<string | null>(null)

// Helper: Studenten in Cache speichern (keyed by userId)
// Überschreibe nur, wenn das neue Objekt mehr Infos hat (z.B. firstName)
function cacheStudents(list: any[]) {
  for (const s of list || []) {
    if (!s?.userId || typeof s.userId !== 'string' || !s.userId.trim()) continue
    const existing = store.studentCache.get(s.userId)
    // Immer updaten, wenn mehr Infos oder noch nicht vorhanden
    if (!existing || (s.firstName && !existing?.firstName) || (s.lastName && !existing?.lastName) || (s.username && !existing?.username)) {
      store.studentCache.set(s.userId, s)
    }
  }
}

function cacheCourses(list: any[]) {
  for (const c of list || []) {
    if (!c?.courseId || typeof c.courseId !== 'string' || !c.courseId.trim()) continue
    const existing = store.courseCache.get(c.courseId)
    if (!existing || (c.name && !existing.name)) {
      store.courseCache.set(c.courseId, c)
    }
  }
}

// Gefilterte Liste: zeigt Suchresultate oder initiale Liste
// Gibt IMMER das Objekt aus dem Cache zurück, falls vorhanden
const filteredStudents = computed(() => {
  const q = studentSearchQuery.value.trim().toLowerCase()
  // Initial: keine Studenten anzeigen, erst nach Suche
  if (!q || q.length < 2) {
    return []
  }
  let filtered = students.value.filter((s: any) =>
    (s.username || s.name || s.email || s.firstName || s.lastName || '')
      .toLowerCase()
      .includes(q)
  )
  // Letzten ausgewählten Studenten ausblenden, wenn einer ausgewählt ist
  const lastSelected = store.draft.studentIds.at(-1)
  if (lastSelected) {
    filtered = filtered.filter((s: any) => s.userId !== lastSelected)
  }
  return filtered.map((s: any) => {
    const cached = s?.userId ? studentCache.value.get(s.userId) : undefined
    return cached || s
  }).filter(Boolean)
})

// Ausgewählte Studenten: immer aus Cache auflösen (bleibt stabil, keyed by keycloak_id)
const selectedStudents = computed(() => {
  return store.draft.studentIds
    .map((uid: string) => studentCache.value.get(uid))
    .filter(Boolean)
})

const toggleCourse = (courseId: string) => {
  const index = store.draft.courseIds.indexOf(courseId)
  if (index > -1) store.draft.courseIds.splice(index, 1)
  else store.draft.courseIds.push(courseId)
}

const toggleStudent = (studentUserId: string) => {
  if (!studentUserId || typeof studentUserId !== 'string' || !studentUserId.trim()) return
  const index = store.draft.studentIds.indexOf(studentUserId)
  if (index > -1) store.draft.studentIds.splice(index, 1)
  else store.draft.studentIds.push(studentUserId)
}

const handleNext = () => {
  // Kleine Validierung: Mindestens 1 Student muss gewählt sein
  if (store.draft.studentIds.length === 0) {
    alert("Bitte wählen Sie mindestens einen Studenten aus.")
    return
  }

  // Debugging: Sehen was im Store landet
  console.log('Store Config Updated:', {
    name: store.draft.name,
    courses: store.draft.courseIds,
    students: store.draft.studentIds
  })
  
  router.push({ name: 'deployment.grouassignment' })
}

const handleBack = () => {
  // 1. Wir holen die App ID aus dem Draft
  const appId = store.draft.appId

  if (appId) {
    // 2. Wir navigieren explizit zur App-Detail-Seite zurück
    // WICHTIG: Prüfe in deiner router/index.ts, wie die Route heißt! 
    // Oft heißt sie 'apps.detail', 'apps.show' oder 'app-details'.
    router.push({ name: 'apps.detail', params: { id: appId } })
  } else {
    // Fallback: Zurück zur Übersicht, falls (warum auch immer) keine ID da ist
    router.push('/apps')
  }
}

// Kurse laden
async function loadCourses() {
  loadingCourses.value = true
  coursesError.value = null
  try {
    const res = await courseApi.list(0, 200)
    courses.value = res.data || []
    cacheCourses(courses.value)
  } catch (err) {
    coursesError.value = 'Kurse konnten nicht geladen werden.'
    toast.error(coursesError.value)
  } finally {
    loadingCourses.value = false
  }
}

// Initiale Studentenliste laden (wird gecacht)
async function loadAllStudents() {
  loadingStudents.value = true
  studentsError.value = null
  try {
    const res = await userApi.list({ role: 'student', limit: 1000 })
    allStudents.value = res.data || []
    students.value = allStudents.value
    cacheStudents(allStudents.value)
    // Nach jedem Laden: alle geladenen Studenten in den globalen Cache schreiben
    cacheStudents(students.value)
  } catch (err) {
    studentsError.value = 'Studenten konnten nicht geladen werden.'
    toast.error(studentsError.value)
  } finally {
    loadingStudents.value = false
  }
}

// Suche mit Debouncing
let searchTimer: number | undefined
watch(studentSearchQuery, (val) => {
  if (searchTimer) window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(async () => {
    const q = val?.trim() || ''

    // Nur bei mindestens 2 Zeichen suchen
    if (q.length < 2) {
      students.value = []
      toast.clear()
      return
    }

    // Suche durchführen
    try {
      loadingStudents.value = true
      const res = await userApi.search(q, 50)
      toast.clear()
      students.value = res.data || []
      cacheStudents(students.value)
      // Nach jeder Suche: alle gefundenen Studenten in den globalen Cache schreiben
      cacheStudents(students.value)
    } catch (err) {
      console.error('User search error:', err)
      const e: any = err
      const msg = e?.response?.data?.detail || e?.message || 'Fehler bei der Suche nach Benutzern.'
      toast.error(msg)
    } finally {
      loadingStudents.value = false
    }
  }, 300)
})

// Beim Mounten Kurse + initiale Studenten laden
onMounted(async () => {
  await loadCourses()
  await loadAllStudents()
})
</script>

<template>
  <div class="bg-white rounded-2xl p-10 border shadow-sm max-w-5xl mx-auto min-h-[600px] flex flex-col">
    
    <div class="flex items-center gap-3 mb-8">
      <h1 class="text-3xl font-bold text-gray-900">
        {{ t('deployment.title') }}
      </h1>
      <BarChart3 :size="32" class="text-emerald-600" />
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-12 flex-grow">
      
      <div>
        <div class="mb-8">
          <label class="block text-xl font-bold text-gray-900 mb-3">
            {{ t('deployment.config.nameLabel') }}
          </label>
          <input 
            v-model="store.draft.name"
            type="text" 
            :placeholder="t('deployment.config.namePlaceholder')"
            class="w-full px-4 py-3 rounded-full border-2 border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
          />
        </div>

        <div>
          <h2 class="text-xl font-bold text-gray-900 mb-3">
             {{ t('deployment.config.courseLabel') }}
          </h2>
          <div class="flex flex-col gap-3 items-start">
            <button 
              v-for="course in availableCourses"
              :key="course.id"
              @click="toggleCourse(course.id)"
              class="px-6 py-3 rounded-full font-bold transition-all border-2"
              :class="store.draft.courseIds.includes(course.id) 
                ? 'bg-emerald-100 text-emerald-800 border-emerald-600' 
                : 'bg-gray-100 text-gray-500 border-gray-200 hover:border-gray-300'"
            >
              {{ course.name }}
            </button>
          </div>
        </div>
      </div>

      <div>
        <div class="flex justify-between items-center mb-3">
          <h2 class="text-xl font-bold text-gray-900">
            {{ t('deployment.config.studentsLabel') }}
          </h2>
          <span class="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
            {{ store.draft.studentIds.length }} gewählt
          </span>
        </div>
        
        <div class="relative mb-4">
          <Search class="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" :size="20" />
          <input 
            v-model="studentSearchQuery"
            type="text"
            :placeholder="t('deployment.config.searchPlaceholder')"
            class="w-full pl-12 pr-4 py-3 rounded-full border-2 border-gray-200 focus:border-emerald-500 outline-none transition-all"
          />
        </div>

          <!-- Studentenliste (gefiltert oder initial) -->
          <div class="bg-gray-100 rounded-xl overflow-hidden border-2 border-gray-200 max-h-[300px] overflow-y-auto">
            <div 
              v-for="student in filteredStudents"
              :key="student.userId"
              @click="toggleStudent(student.userId)"
              class="flex items-center gap-3 px-4 py-3 cursor-pointer border-b last:border-b-0 border-gray-200 transition-colors select-none"
              :class="store.draft.studentIds.includes(student.userId) ? 'bg-emerald-50' : 'hover:bg-gray-200/50'"
            >
              <div class="w-6 h-6 flex items-center justify-center rounded border transition-colors"
                 :class="store.draft.studentIds.includes(student.userId) ? 'bg-emerald-500 border-emerald-500' : 'border-gray-400 bg-white'"
              >
                 <Check v-if="store.draft.studentIds.includes(student.userId)" :size="16" class="text-white" />
              </div>
              <span class="text-gray-700 font-medium">
                {{ (student.firstName || student.lastName) 
                    ? `${student.firstName || ''} ${student.lastName || ''}`.trim()
                    : (student.username || student.email || student.name || student.userId) }}
              </span>
            </div>
            
            <span class="text-gray-700 font-medium">{{ student.name }}</span>
          </div>

          <!-- Separater Bereich: aktuell ausgewählte Studierende -->
          <div v-if="selectedStudents.length > 0" class="mt-4">
            <h3 class="text-sm font-semibold text-gray-800 mb-2">Ausgewählte Studierende</h3>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="s in selectedStudents"
                :key="s.userId"
                class="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 flex items-center gap-2"
              >
                <span class="text-sm">
                  {{ (s.firstName || s.lastName) 
                      ? `${s.firstName || ''} ${s.lastName || ''}`.trim()
                      : (s.username || s.email || s.name || s.userId) }}
                </span>
                <button 
                  @click.stop="toggleStudent(s.userId)" 
                  class="text-emerald-700 hover:text-emerald-900 font-bold text-lg leading-none"
                  title="Entfernen"
                >
                  ×
                </button>
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Navigation -->
      <div class="flex justify-between items-center mt-8 pt-4">
        <button 
          @click="handleBack"
          class="flex items-center gap-2 px-8 py-2.5 rounded-full bg-gray-100 text-gray-600 font-semibold hover:bg-gray-200 transition-colors"
        >
          <ArrowLeft :size="18" />
          {{ t('deployment.actions.back') }}
        </button>
        
        <button 
          @click="handleNext"
          class="flex items-center gap-2 px-8 py-2.5 rounded-full bg-emerald-700 text-white font-bold hover:bg-emerald-800 transition-colors shadow-lg shadow-emerald-700/20"
        >
          {{ t('deployment.actions.next') }}
          <ArrowRight :size="18" />
        </button>
      </div>

  </div>
</template>