<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { GraduationCap, Plus, Edit, Trash2 } from 'lucide-vue-next'
import { useCourseStore } from '@/stores/course.store'
import { useToast } from '@/composables/useToast'
import { usePermissions } from '@/composables/usePermissions'
import Card from '@/components/ui/Card.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import Modal from '@/components/ui/Modal.vue'

const courseStore = useCourseStore()
const toast = useToast()
const { can } = usePermissions()

const showModal = ref(false)
const editingCourse = ref<any>(null)
const formData = ref({
  name: '',
  description: '',
  startDate: '',
  endDate: ''
})

onMounted(async () => {
  try {
    await courseStore.fetchCourses()
  } catch (error) {
    toast.error('Fehler beim Laden der Kurse')
  }
})

const openCreateModal = () => {
  editingCourse.value = null
  formData.value = {
    name: '',
    description: '',
    startDate: '',
    endDate: ''
  }
  showModal.value = true
}

const openEditModal = (course: any) => {
  editingCourse.value = course
  formData.value = {
    name: course.name,
    description: course.description || '',
    startDate: course.startDate?.split('T')[0] || '',
    endDate: course.endDate?.split('T')[0] || ''
  }
  showModal.value = true
}

const saveCourse = async () => {
  try {
    if (editingCourse.value) {
      await courseStore.updateCourse(editingCourse.value.courseId, formData.value)
      toast.success('Kurs aktualisiert!')
    } else {
      await courseStore.createCourse(formData.value)
      toast.success('Kurs erstellt!')
    }
    showModal.value = false
  } catch (error: any) {
    toast.error(error.response?.data?.detail || 'Fehler beim Speichern')
  }
}

const deleteCourse = async (courseId: string) => {
  if (!confirm('Möchten Sie diesen Kurs wirklich löschen?')) return
  
  try {
    await courseStore.deleteCourse(courseId)
    toast.success('Kurs gelöscht!')
  } catch (error: any) {
    toast.error(error.response?.data?.detail || 'Fehler beim Löschen')
  }
}

/*const formatDate = (dateString: string) => {
  if (!dateString) return 'Nicht gesetzt'
  return new Date(dateString).toLocaleDateString('de-DE')
}*/
</script>

<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 mb-1">Kurse</h1>
        <p class="text-gray-500">Verwalte deine Kurse</p>
      </div>
      <BaseButton
        v-if="can.createCourse.value"
        @click="openCreateModal"
        class="flex items-center gap-2"
      >
        <Plus :size="20" />
        Neuer Kurs
      </BaseButton>
    </div>

    <!-- Loading -->
    <div v-if="courseStore.isLoading" class="text-center py-12">
      <p class="text-gray-500">Lädt Kurse...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="courseStore.courses.length === 0" class="text-center py-12">
      <GraduationCap :size="64" class="mx-auto text-gray-300 mb-4" />
      <p class="text-gray-500 mb-4">Noch keine Kurse vorhanden</p>
      <BaseButton v-if="can.createCourse.value" @click="openCreateModal">
        Ersten Kurs erstellen
      </BaseButton>
    </div>

    <!-- Courses Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card
        v-for="course in courseStore.courses"
        :key="course.courseId"
        class="hover:shadow-lg transition"
      >
        <div class="flex items-start justify-between mb-4">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <GraduationCap :size="24" class="text-blue-600" />
            </div>
        <!--    <div>
              <h3 class="font-semibold text-gray-900">{{ course.name }}</h3>
              <Badge variant="blue">{{ course.users?.length || 0 }} Studenten</Badge>
            </div> -->
          </div>
          <div v-if="can.editCourse.value" class="flex gap-2">
            <button
              @click="openEditModal(course)"
              class="p-2 hover:bg-gray-100 rounded-lg transition"
              title="Bearbeiten"
            >
              <Edit :size="16" class="text-gray-600" />
            </button>
            <button
              v-if="can.deleteCourse.value"
              @click="deleteCourse(course.courseId)"
              class="p-2 hover:bg-red-50 rounded-lg transition"
              title="Löschen"
            >
              <Trash2 :size="16" class="text-red-600" />
            </button>
          </div>
        </div>

        <p class="text-sm text-gray-600 mb-4 line-clamp-2">
          {{ course.description || 'Keine Beschreibung' }}
        </p>

       <!-- <div class="text-xs text-gray-500 space-y-1">
          <div>Start: {{ formatDate(course.startDate) }}</div>
          <div>Ende: {{ formatDate(course.endDate) }}</div>
        </div> -->
      </Card>
    </div>

    <!-- Create/Edit Modal -->
    <Modal :show="showModal" @close="showModal = false">
      <template #header>
        <h2 class="text-xl font-semibold">
          {{ editingCourse ? 'Kurs bearbeiten' : 'Neuer Kurs' }}
        </h2>
      </template>

      <template #body>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Kursname *
            </label>
            <BaseInput
              v-model="formData.name"
              placeholder="z.B. Web-Programmierung"
              required
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Beschreibung
            </label>
            <textarea
              v-model="formData.description"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
              rows="3"
              placeholder="Kursbeschreibung..."
            ></textarea>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Startdatum
              </label>
              <input
                v-model="formData.startDate"
                type="date"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">
                Enddatum
              </label>
              <input
                v-model="formData.endDate"
                type="date"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-3">
          <BaseButton variant="red" @click="showModal = false">
            Abbrechen
          </BaseButton>
          <BaseButton
            @click="saveCourse"
            :disabled="!formData.name"
          >
            {{ editingCourse ? 'Speichern' : 'Erstellen' }}
          </BaseButton>
        </div>
      </template>
    </Modal>
  </div>
</template>
