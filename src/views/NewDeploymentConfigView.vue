<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useDeploymentStore } from '@/stores/deployment.store'
import DeploymentProgressBar from '@/components/DeploymentProgressBar.vue'
import { 
  BarChart3, 
  Search,
  Check,
  Users,
  BookOpen,
  UserPlus
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

// Cache-Map für alle jemals gesehenen Studenten (bleibt stabil, keyed by keycloak_id)
const studentCache = ref(new Map<string, any>())

const studentSearchQuery = ref('')
const loadingCourses = ref(false)
const loadingStudents = ref(false)
const coursesError = ref<string | null>(null)
const studentsError = ref<string | null>(null)

// Tab für die Auswahl: 'courses' oder 'individuals'
const activeTab = ref<'courses' | 'individuals'>('courses')

// Helper: Studenten in Cache speichern (keyed by keycloak_id)
// Überschreibe nur, wenn das neue Objekt mehr Infos hat (z.B. firstName)
function cacheStudents(list: any[]) {
  for (const s of list || []) {
    if (!s?.keycloak_id || typeof s.keycloak_id !== 'string' || !s.keycloak_id.trim()) continue
    const existing = studentCache.value.get(s.keycloak_id)
    if (!existing || (s.firstName && !existing.firstName) || (s.lastName && !existing.lastName)) {
      studentCache.value.set(s.keycloak_id, s)
      store.studentCache.set(s.keycloak_id, s)
    }
  }
}

// Gefilterte Liste für individuelle Suche: zeigt Suchresultate oder initiale Liste
// Gibt IMMER das Objekt aus dem Cache zurück, falls vorhanden
const filteredStudents = computed(() => {
  const q = studentSearchQuery.value.trim().toLowerCase()
  // Basis: wenn leer, zeige leere Liste (keine Studenten ohne Suche)
  if (!q) {
    return []
  }
  let filtered = students.value
  if (q) {
    filtered = students.value.filter((s: any) =>
      (s.username || s.name || s.email || s.firstName || s.lastName || '')
        .toLowerCase()
        .includes(q)
    )
  }
  // Für jeden Studenten: immer das Objekt aus dem Cache zurückgeben (verhindert Duplikate)
  // Niemals null zurückgeben!
  return filtered.map((s: any) => {
    const cached = s?.keycloak_id ? studentCache.value.get(s.keycloak_id) : undefined
    return cached || s
  }).filter(Boolean)
})

// Ausgewählte Studenten: immer aus Cache auflösen (bleibt stabil, keyed by keycloak_id)
const selectedStudents = computed(() => {
  return store.draft.studentIds
    .map((kid: string) => studentCache.value.get(kid))
    .filter(Boolean)
})

// Cache für Studenten pro Kurs (lazy loading)
const courseStudentsCache = ref(new Map<string, any[]>())

// Hilfsfunktion: Gibt alle Studenten-IDs eines Kurses zurück (lazy loading)
async function getStudentIdsForCourse(courseId: string): Promise<string[]> {
  // Prüfe Cache
  if (courseStudentsCache.value.has(courseId)) {
    const students = courseStudentsCache.value.get(courseId)!
    return students.map((s: any) => s.keycloak_id)
  }

  // Lade Studenten für diesen Kurs
  try {
    const res = await courseApi.getById(courseId)
    const students = res.data.users || []
    courseStudentsCache.value.set(courseId, students)
    // Cache auch in studentCache
    cacheStudents(students)
    return students.map((s: any) => s.keycloak_id)
  } catch (err) {
    console.error(`Failed to load students for course ${courseId}:`, err)
    return []
  }
}

// Loading states für Kurse
const loadingCourseStudents = ref(new Set<string>())

// Hilfsfunktion: Gibt Anzahl Studenten pro Kurs zurück (lazy loading)
function getStudentCountForCourse(courseId: string) {
  if (courseStudentsCache.value.has(courseId)) {
    return courseStudentsCache.value.get(courseId)!.length
  }
  // Wenn nicht geladen, lade lazy
  if (!loadingCourseStudents.value.has(courseId)) {
    loadingCourseStudents.value.add(courseId)
    getStudentIdsForCourse(courseId).then(() => {
      loadingCourseStudents.value.delete(courseId)
    }).catch(() => {
      loadingCourseStudents.value.delete(courseId)
    })
  }
  return 0 // Placeholder während loading
}

// Kurs-Checkbox: checked, wenn alle Studenten des Kurses ausgewählt sind
function isCourseSelected(courseId: string) {
  if (!courseStudentsCache.value.has(courseId)) {
    return false // Noch nicht geladen
  }
  const studentIds = courseStudentsCache.value.get(courseId)!.map((s: any) => s.keycloak_id)
  return studentIds.length > 0 && studentIds.every((id) => store.draft.studentIds.includes(id))
}

// Kurs-Checkbox toggeln: alle Studenten des Kurses auswählen/abwählen
const toggleCourse = async (courseId: string) => {
  const studentIds = await getStudentIdsForCourse(courseId)
  if (studentIds.length === 0) {
    toast.warning(`Keine Studenten in diesem Kurs gefunden.`)
    return
  }
  const allSelected = studentIds.length > 0 && studentIds.every((id) => store.draft.studentIds.includes(id))
  if (allSelected) {
    // Abwählen: entferne alle Studenten dieses Kurses aus Auswahl
    store.draft.studentIds = store.draft.studentIds.filter((id: string) => !studentIds.includes(id))
  } else {
    // Auswählen: füge alle Studenten dieses Kurses zur Auswahl hinzu (ohne Duplikate)
    const set = new Set([...store.draft.studentIds, ...studentIds])
    store.draft.studentIds = Array.from(set)
  }
  // Kursauswahl-Liste synchronisieren
  syncCourseSelection()
}

// Student-Checkbox toggeln (für individuelle Auswahl)
const toggleStudent = (studentKeycloakId: string) => {
  if (!studentKeycloakId || typeof studentKeycloakId !== 'string' || !studentKeycloakId.trim()) return
  const index = store.draft.studentIds.indexOf(studentKeycloakId)
  if (index > -1) {
    store.draft.studentIds.splice(index, 1)
  } else {
    store.draft.studentIds.push(studentKeycloakId)
  }
  // Nach jedem Toggle: Kursauswahl synchronisieren
  syncCourseSelection()
}

// Synchronisiert store.draft.courseIds mit aktuellem Studenten-Selection-State
async function syncCourseSelection() {
  // Für jeden Kurs: Wenn alle Studenten ausgewählt, Kurs in courseIds, sonst raus
  const newCourseIds: string[] = []
  for (const course of courses.value) {
    if (courseStudentsCache.value.has(course.courseId)) {
      const studentIds = courseStudentsCache.value.get(course.courseId)!.map((s: any) => s.keycloak_id)
      if (studentIds.length > 0 && studentIds.every((id) => store.draft.studentIds.includes(id))) {
        newCourseIds.push(course.courseId)
      }
    }
  }
  store.draft.courseIds = newCourseIds
}

const handleNext = () => {
  // Prüfe ob Name ausgefüllt ist
  if (!store.draft.name || store.draft.name.trim() === '') {
    toast.warning('Bitte geben Sie einen Namen für das Deployment an.')
    return
  }

  // Prüfe ob mindestens ein Student ausgewählt ist
  if (store.draft.studentIds.length === 0) {
    toast.warning('Bitte wählen Sie mindestens einen Studenten aus.')
    return
  }
  router.push({ name: 'deployment.teams' })
}

const handleBack = () => {
  const appId = store.draft.appId
  if (appId) {
    router.push({ name: 'apps.detail', params: { id: appId } })
  } else {
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

    // Leere Suche: zeige initiale Liste (kein erneuter API-Call)
    if (!q) {
      students.value = allStudents.value
      toast.clear()
      return
    }

    // Zu kurze Suche: behalte aktuelle Liste (kein Flackern)
    if (q.length < 2) {
      toast.clear()
      return
    }

    // Suche durchführen
    try {
      loadingStudents.value = true
      const res = await userApi.search(q, 50)
      toast.clear()
      students.value = res.data || []
      cacheStudents(students.value) // Neue Studenten cachen (keyed by keycloak_id)
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
  <div class="max-w-6xl mx-auto w-full">
    
    <div class="bg-white rounded-2xl p-10 border shadow-sm min-h-[700px] flex flex-col">
      
      <div class="flex items-center gap-3 mb-6">
        <h1 class="text-3xl font-bold text-gray-900">
          {{ t('deployment.title') }}
        </h1>
        <BarChart3 :size="32" class="text-emerald-600" />
      </div>

      <DeploymentProgressBar :current-step="1" />

      <!-- Basis-Konfiguration -->
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

      <!-- Zielgruppe definieren -->
      <div class="flex-grow">
        <h2 class="text-xl font-bold text-gray-900 mb-4">
          Zielgruppe definieren
        </h2>

        <!-- Tabs -->
        <div class="flex border-b border-gray-200 mb-6">
          <button
            @click="activeTab = 'courses'"
            class="px-6 py-3 font-semibold transition-colors border-b-2"
            :class="activeTab === 'courses' 
              ? 'border-emerald-500 text-emerald-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'"
          >
            <BookOpen :size="20" class="inline mr-2" />
            Kurse auswählen
          </button>
          <button
            @click="activeTab = 'individuals'"
            class="px-6 py-3 font-semibold transition-colors border-b-2"
            :class="activeTab === 'individuals' 
              ? 'border-emerald-500 text-emerald-600' 
              : 'border-transparent text-gray-500 hover:text-gray-700'"
          >
            <UserPlus :size="20" class="inline mr-2" />
            Einzelne Studenten
          </button>
        </div>

        <!-- Tab Content -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          <!-- Linke Spalte: Aktueller Tab -->
          <div>
            <!-- Kurs-Tab -->
            <div v-if="activeTab === 'courses'">
              <h3 class="text-lg font-semibold text-gray-800 mb-4">Verfügbare Kurse</h3>
              <div class="space-y-3 max-h-[400px] overflow-y-auto">
                <div 
                  v-for="course in courses"
                  :key="course.courseId"
                  @click="toggleCourse(course.courseId)"
                  class="flex items-center gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all"
                  :class="isCourseSelected(course.courseId) 
                    ? 'bg-emerald-50 border-emerald-300' 
                    : 'bg-gray-50 border-gray-200 hover:border-gray-300'"
                >
                  <div class="w-6 h-6 flex items-center justify-center rounded border transition-colors"
                       :class="isCourseSelected(course.courseId) ? 'bg-emerald-500 border-emerald-500' : 'border-gray-400 bg-white'"
                  >
                     <Check v-if="isCourseSelected(course.courseId)" :size="16" class="text-white" />
                  </div>
                  <div class="flex-grow">
                    <div class="font-semibold text-gray-900">{{ course.name }}</div>
                    <div class="text-sm text-gray-600">
                      <span v-if="loadingCourseStudents.has(course.courseId)">Lade...</span>
                      <span v-else>{{ getStudentCountForCourse(course.courseId) }} Studenten</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Einzel-Tab -->
            <div v-if="activeTab === 'individuals'">
              <h3 class="text-lg font-semibold text-gray-800 mb-4">Studenten suchen</h3>
              
              <!-- Suchfeld -->
              <div class="relative mb-4">
                <Search class="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" :size="20" />
                <input 
                  v-model="studentSearchQuery"
                  type="text"
                  :placeholder="t('deployment.config.searchPlaceholder')"
                  class="w-full pl-12 pr-4 py-3 rounded-full border-2 border-gray-200 focus:border-emerald-500 outline-none transition-all"
                />
              </div>

              <!-- Studentenliste -->
              <div class="bg-gray-50 rounded-lg overflow-hidden border-2 border-gray-200 max-h-[350px] overflow-y-auto">
                <div 
                  v-for="student in filteredStudents"
                  :key="student.keycloak_id"
                  @click="toggleStudent(student.keycloak_id)"
                  class="flex items-center gap-3 px-4 py-3 cursor-pointer border-b last:border-b-0 border-gray-200 transition-colors select-none"
                  :class="store.draft.studentIds.includes(student.keycloak_id) ? 'bg-emerald-50' : 'hover:bg-gray-100'"
                >
                  <div class="w-6 h-6 flex items-center justify-center rounded border transition-colors"
                       :class="store.draft.studentIds.includes(student.keycloak_id) ? 'bg-emerald-500 border-emerald-500' : 'border-gray-400 bg-white'"
                  >
                     <Check v-if="store.draft.studentIds.includes(student.keycloak_id)" :size="16" class="text-white" />
                  </div>
                  <span class="text-gray-700 font-medium">
                    {{ (student.firstName || student.lastName) 
                        ? `${student.firstName || ''} ${student.lastName || ''}`.trim()
                        : (student.username || student.email || student.name || student.keycloak_id) }}
                  </span>
                </div>
                
                <div v-if="filteredStudents.length === 0" class="p-4 text-gray-500 text-center">
                  Keine Studenten gefunden.
                </div>
              </div>
            </div>
          </div>

          <!-- Rechte Spalte: Zusammenfassung -->
          <div>
            <h3 class="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Users :size="20" />
              Ausgewählte Studenten ({{ selectedStudents.length }})
            </h3>
            
            <div class="bg-gray-50 rounded-lg border-2 border-gray-200 p-4 max-h-[400px] overflow-y-auto">
              <div v-if="selectedStudents.length === 0" class="text-gray-500 text-center py-8">
                Noch keine Studenten ausgewählt
              </div>
              <div v-else class="space-y-2">
                <div
                  v-for="student in selectedStudents"
                  :key="student.keycloak_id"
                  class="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200"
                >
                  <span class="text-gray-700 font-medium">
                    {{ (student.firstName || student.lastName) 
                        ? `${student.firstName || ''} ${student.lastName || ''}`.trim()
                        : (student.username || student.email || student.name || student.keycloak_id) }}
                  </span>
                  <button 
                    @click="toggleStudent(student.keycloak_id)" 
                    class="text-red-500 hover:text-red-700 font-bold text-lg leading-none"
                    title="Entfernen"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>

            <!-- Info-Box -->
            <div class="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p class="text-sm text-blue-800">
                <strong>Hinweis:</strong> Die Gesamtmenge der Studenten ergibt sich aus der Kombination der ausgewählten Kurse und einzeln hinzugefügten Studenten. Duplikate werden automatisch entfernt.
              </p>
            </div>
          </div>

        </div>
      </div>

      <!-- Navigation -->
      <div class="flex justify-between items-center mt-8 pt-4 border-t border-gray-200">
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