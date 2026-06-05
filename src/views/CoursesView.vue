<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { GraduationCap, Trash2, Plus, Users } from 'lucide-vue-next'
import { useCourseStore } from '@/stores/course.store'
import { useToast } from '@/composables/useToast'
import { usePermissions } from '@/composables/usePermissions'
import { courseApi } from '@/api/course.api'
import Card from '@/components/ui/Card.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import Modal from '@/components/ui/Modal.vue'

const courseStore = useCourseStore()
const toast = useToast()
const { can } = usePermissions()
const router = useRouter()

const showModal = ref(false)
const formData = ref({ name: '' })

const showDeleteModal = ref(false)
const courseToDelete = ref<{ courseId: string; name: string } | null>(null)
const isDeleting = ref(false)
const memberCounts = ref<Record<string, number>>({})

const fetchMemberCounts = async () => {
  const entries = await Promise.all(
      courseStore.courses.map(async (c) => {
        try {
          const { data } = await courseApi.listMembers(c.courseId)
          return [c.courseId, data.length] as const
        } catch {
          return [c.courseId, 0] as const
        }
      })
  )
  memberCounts.value = Object.fromEntries(entries)
}

onMounted(async () => {
  try {
    await courseStore.fetchCourses()
    if (can.editCourse.value) {
      await fetchMemberCounts()
    }
  } catch (error) {
    toast.error('Fehler beim Laden der Kurse')
  }
})

const openCreateModal = () => {
  formData.value = { name: '' }
  showModal.value = true
}

const saveCourse = async () => {
  try {
    const created = await courseStore.createCourse({ name: formData.value.name })
    toast.success('Kurs erstellt!')
    showModal.value = false

    // Nach dem Erstellen direkt zur Detailseite navigieren
    if (created?.courseId) {
      router.push(`/courses/${created.courseId}`)
    }
  } catch (error: any) {
    toast.error(error.response?.data?.detail || 'Fehler beim Erstellen')
  }
}

const requestDelete = (course: { courseId: string; name: string }) => {
  courseToDelete.value = course
  showDeleteModal.value = true
}

const closeDeleteModal = () => {
  if (isDeleting.value) return
  showDeleteModal.value = false
  courseToDelete.value = null
}

const confirmDelete = async () => {
  if (!courseToDelete.value) return
  const { courseId } = courseToDelete.value
  isDeleting.value = true
  try {
    await courseStore.deleteCourse(courseId)
    delete memberCounts.value[courseId]
    toast.success('Kurs gelöscht!')
    showDeleteModal.value = false
    courseToDelete.value = null
  } catch (error: any) {
    toast.error(error.response?.data?.detail || 'Fehler beim Löschen')
  } finally {
    isDeleting.value = false
  }
}

const goToDetail = (courseId: string) => {
  router.push({ path: `/courses/${courseId}` })
}
</script>

<template>
  <div class="p-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 mb-1">Kurse</h1>
        <p class="text-gray-500">Verwalte deine Kurse und Teilnehmer</p>
      </div>
      <BaseButton
          v-if="can.createCourse.value"
          @click="openCreateModal"
          class="flex items-center gap-2"
      >
        <Plus :size="16" />
        Neuer Kurs
      </BaseButton>
    </div>

    <!-- Loading -->
    <div v-if="courseStore.isLoading && courseStore.courses.length === 0" class="text-center py-12">
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
          class="transition flex flex-col hover:shadow-lg cursor-pointer hover:border-emerald-200"
          @click="goToDetail(course.courseId)"
      >
        <div class="flex items-start justify-between mb-4">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <GraduationCap :size="24" class="text-blue-600" />
            </div>
            <div>
              <h3 class="font-semibold text-gray-900">{{ course.name }}</h3>
              <div
                  v-if="can.editCourse.value"
                  class="flex items-center gap-1 text-xs text-gray-500 mt-1"
              >
                <Users :size="12" />
                {{ memberCounts[course.courseId] ?? 0 }} Mitglied{{ (memberCounts[course.courseId] ?? 0) === 1 ? '' : 'er' }}
              </div>
            </div>
          </div>
          <div v-if="can.editCourse.value" class="flex gap-2">
            <!-- Edit-Button wurde entfernt, da der Klick auf die Karte bereits zur Detailseite führt -->
            <button
                v-if="can.deleteCourse.value"
                @click.stop="requestDelete(course)"
                class="p-2 hover:bg-red-50 rounded-lg transition"
                title="Löschen"
            >
              <Trash2 :size="16" class="text-red-600" />
            </button>
          </div>
        </div>
      </Card>
    </div>

    <!-- Create Modal -->
    <Modal :show="showModal" @close="showModal = false">
      <template #header>
        <h2 class="text-xl font-semibold">Neuer Kurs</h2>
      </template>

      <template #body>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Kursname *
            </label>
            <BaseInput v-model="formData.name" placeholder="z.B. WWI23SEB" required @keyup.enter="saveCourse" />
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-3">
          <BaseButton variant="red" @click="showModal = false">
            Abbrechen
          </BaseButton>
          <BaseButton @click="saveCourse" :disabled="!formData.name">
            Erstellen
          </BaseButton>
        </div>
      </template>
    </Modal>

    <!-- Delete-Confirm Modal -->
    <Modal :show="showDeleteModal" @close="closeDeleteModal">
      <template #header>
        <h2 class="text-xl font-semibold text-red-700">Kurs löschen</h2>
      </template>

      <template #body>
        <p class="text-gray-700">
          Soll der Kurs
          <strong>{{ courseToDelete?.name }}</strong>
          wirklich gelöscht werden?
        </p>
        <p class="text-sm text-gray-500 mt-2">
          Mitgliedschaften werden entfernt, die Benutzer-Konten bleiben bestehen.
        </p>
      </template>

      <template #footer>
        <div class="flex justify-end gap-3">
          <BaseButton variant="yellow" @click="closeDeleteModal" :disabled="isDeleting">
            Abbrechen
          </BaseButton>
          <BaseButton variant="red" @click="confirmDelete" :disabled="isDeleting">
            {{ isDeleting ? 'Lösche...' : 'Löschen' }}
          </BaseButton>
        </div>
      </template>
    </Modal>
  </div>
</template>