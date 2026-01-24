<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useDeploymentStore } from '@/stores/deployment.store'
import DeploymentProgressBar from '@/components/DeploymentProgressBar.vue'
import { 
  BarChart3, 
  Search,
  Check
} from 'lucide-vue-next'

const { t } = useI18n()
const router = useRouter()
const store = useDeploymentStore()

// --- Mock Data ---
const availableCourses = [
  { id: 'c1', name: 'WWI-23-SEB' },
  { id: 'c2', name: 'WWI-24-SCA' },
  { id: 'c3', name: 'WWI-25-IMBIT' },
]

const allStudents = [
  { id: 's232723', name: 's232723' },
  { id: 's235734', name: 's235734' },
  { id: 's235735', name: 's235735' },
  { id: 's235736', name: 's235736' },
  { id: 's241234', name: 's241234' },
  { id: 's456789', name: 's456789' },
  { id: 's254764', name: 's254764' },
  { id: 's456999', name: 's456999' },
  { id: 's556723', name: 's556723' },
  { id: 's235778', name: 's235778' },
  { id: 's245633', name: 's245633' },
]

const studentSearchQuery = ref('')

const filteredStudents = computed(() => {
  if (!studentSearchQuery.value) return allStudents
  const query = studentSearchQuery.value.toLowerCase()
  return allStudents.filter(s => s.name.toLowerCase().includes(query))
})

const toggleCourse = (courseId: string) => {
  const index = store.draft.courseIds.indexOf(courseId)
  if (index > -1) store.draft.courseIds.splice(index, 1)
  else store.draft.courseIds.push(courseId)
}

const toggleStudent = (studentId: string) => {
  const index = store.draft.studentIds.indexOf(studentId)
  if (index > -1) store.draft.studentIds.splice(index, 1)
  else store.draft.studentIds.push(studentId)
}

const handleNext = () => {

  if (store.draft.studentIds.length === 0) {

    alert("Bitte wählen Sie mindestens einen Studenten aus.")

    return

  }

  router.push({ name: 'deployment.grouassignment' })

}



const handleBack = () => {
  // Hier holen wir die App ID aus dem Store, um korrekt zurück zur App-Detail Seite zu kommen
  const appId = store.draft.appId
  if (appId) {
     // Wichtig: Passe 'apps.detail' an den echten Namen deiner Route an (siehe router/index.ts)
     router.push({ name: 'apps.detail', params: { id: appId } })
  } else {
     router.push('/apps')
  }
}
</script>

<template>
  <div class="max-w-5xl mx-auto w-full">
    
    <div class="bg-white rounded-2xl p-10 border shadow-sm min-h-[600px] flex flex-col">
      
      <div class="flex items-center gap-3 mb-6">
        <h1 class="text-3xl font-bold text-gray-900">
          {{ t('deployment.title') }}
        </h1>
        <BarChart3 :size="32" class="text-emerald-600" />
      </div>

      <DeploymentProgressBar :current-step="1" />

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
              {{ t('deployment.config.selectedCount', { count: store.draft.studentIds.length }) }}
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

          <div class="bg-gray-100 rounded-xl overflow-hidden border-2 border-gray-200 max-h-[300px] overflow-y-auto">
            <div 
              v-for="student in filteredStudents"
              :key="student.id"
              @click="toggleStudent(student.id)"
              class="flex items-center gap-3 px-4 py-3 cursor-pointer border-b last:border-b-0 border-gray-200 transition-colors select-none"
              :class="store.draft.studentIds.includes(student.id) ? 'bg-emerald-50' : 'hover:bg-gray-200/50'"
            >
              <div class="w-6 h-6 flex items-center justify-center rounded border transition-colors"
                 :class="store.draft.studentIds.includes(student.id) ? 'bg-emerald-500 border-emerald-500' : 'border-gray-400 bg-white'"
              >
                 <Check v-if="store.draft.studentIds.includes(student.id)" :size="16" class="text-white" />
              </div>
              <span class="text-gray-700 font-medium">{{ student.name }}</span>
            </div>
            
            <div v-if="filteredStudents.length === 0" class="p-4 text-gray-500 text-center">
              Keine Studenten gefunden.
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
  </div>
</template>