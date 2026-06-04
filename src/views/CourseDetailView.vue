<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { GraduationCap, ArrowLeft, UserMinus, UserPlus, Search, X, Loader2 } from 'lucide-vue-next'
import { useCourseStore } from '@/stores/course.store'
import { userApi } from '@/api/user.api'
import { useToast } from '@/composables/useToast'
import { usePermissions } from '@/composables/usePermissions'
import Card from '@/components/ui/Card.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import Modal from '@/components/ui/Modal.vue'
import type { User } from '@/types'

// ----------------------------------------------------------------
// Setup
// ----------------------------------------------------------------
const route = useRoute()
const router = useRouter()
const courseStore = useCourseStore()
const toast = useToast()
const { can } = usePermissions()

const courseId = computed(() => String(route.params.id))

// Local UI state. The store carries ``currentCourse``/``currentMembers``;
// these refs only model the modal lifecycle and the picker's local
// selection state.
const showAddModal = ref(false)
const searchQuery = ref('')
const searchResults = ref<User[]>([])
const isSearching = ref(false)
// Map keyed by userId so toggling a search result twice is idempotent
// and we can reflect selection inline next to each row.
const selectedToAdd = ref<Map<string, User>>(new Map())
const isAddingMembers = ref(false)
const removingId = ref<string | null>(null)
// Remove-confirm modal state. Native ``window.confirm()`` is
// blocking and visually inconsistent with the rest of the app —
// we use the same Modal pattern as the other destructive flows.
const showRemoveModal = ref(false)
const memberToRemove = ref<User | null>(null)

// ----------------------------------------------------------------
// Loading
// ----------------------------------------------------------------
const loadCourse = async () => {
  try {
    await courseStore.fetchCourseById(courseId.value)
  } catch {
    toast.error('Kurs konnte nicht geladen werden.')
    router.push({ path: '/courses' })
  }
}

onMounted(loadCourse)

// If the route id changes (deep-link to another course), reload.
watch(courseId, loadCourse)

// ----------------------------------------------------------------
// User search (Keycloak-backed)
// ----------------------------------------------------------------
// Debounce so the user can type without firing a request per
// keystroke. 250 ms is the same setting the deployment-team picker
// uses elsewhere — keeps the feel consistent.
let searchTimer: number | null = null
watch(searchQuery, (q) => {
  if (searchTimer) window.clearTimeout(searchTimer)
  if (!q || q.trim().length < 2) {
    searchResults.value = []
    isSearching.value = false
    return
  }
  isSearching.value = true
  searchTimer = window.setTimeout(async () => {
    try {
      const { data } = await userApi.search(q.trim(), 10)
      searchResults.value = data
    } catch {
      // The search endpoint is best-effort — surface the error
      // discreetly and let the user retry by typing again.
      searchResults.value = []
      toast.error('Benutzersuche fehlgeschlagen.')
    } finally {
      isSearching.value = false
    }
  }, 250) as unknown as number
})

const isAlreadyMember = (userId: string) =>
  courseStore.currentMembers.some((m) => m.userId === userId)

const toggleSelection = (user: User) => {
  if (selectedToAdd.value.has(user.userId)) {
    selectedToAdd.value.delete(user.userId)
  } else {
    selectedToAdd.value.set(user.userId, user)
  }
  // Force reactivity on the Map.
  selectedToAdd.value = new Map(selectedToAdd.value)
}

const removeSelection = (userId: string) => {
  selectedToAdd.value.delete(userId)
  selectedToAdd.value = new Map(selectedToAdd.value)
}

const openAddModal = () => {
  searchQuery.value = ''
  searchResults.value = []
  selectedToAdd.value = new Map()
  showAddModal.value = true
}

const closeAddModal = () => {
  showAddModal.value = false
}

const submitAddMembers = async () => {
  if (selectedToAdd.value.size === 0) return
  isAddingMembers.value = true
  try {
    const ids = Array.from(selectedToAdd.value.keys())
    await courseStore.addMembers(courseId.value, ids)
    toast.success(`${ids.length} Mitglied(er) hinzugefügt.`)
    closeAddModal()
  } catch (err: any) {
    toast.error(err?.response?.data?.detail || 'Hinzufügen fehlgeschlagen.')
  } finally {
    isAddingMembers.value = false
  }
}

// ----------------------------------------------------------------
// Member removal
// ----------------------------------------------------------------
const requestRemoveMember = (user: User) => {
  memberToRemove.value = user
  showRemoveModal.value = true
}

const closeRemoveModal = () => {
  if (removingId.value) return
  showRemoveModal.value = false
  memberToRemove.value = null
}

const confirmRemoveMember = async () => {
  if (!memberToRemove.value) return
  const user = memberToRemove.value
  removingId.value = user.userId
  try {
    await courseStore.removeMember(courseId.value, user.userId)
    toast.success('Mitglied entfernt.')
    showRemoveModal.value = false
    memberToRemove.value = null
  } catch (err: any) {
    toast.error(err?.response?.data?.detail || 'Entfernen fehlgeschlagen.')
  } finally {
    removingId.value = null
  }
}

// ----------------------------------------------------------------
// Display helpers
// ----------------------------------------------------------------
const memberCount = computed(() => courseStore.currentMembers.length)

const roleLabel = (role: string | undefined) => {
  switch (role) {
    case 'admin':
      return 'Admin'
    case 'teacher':
      return 'Dozent'
    case 'student':
      return 'Student'
    default:
      return role ?? '–'
  }
}

const roleClass = (role: string | undefined) => {
  switch (role) {
    case 'admin':
      return 'bg-red-50 text-red-700'
    case 'teacher':
      return 'bg-purple-50 text-purple-700'
    default:
      return 'bg-blue-50 text-blue-700'
  }
}
</script>

<template>
  <div class="p-6 max-w-5xl mx-auto">
    <!-- Back link + header -->
    <button
      @click="router.push('/courses')"
      class="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-4 text-sm"
    >
      <ArrowLeft :size="16" />
      Zurück zur Kursübersicht
    </button>

    <div v-if="courseStore.isLoading && !courseStore.currentCourse" class="text-center py-16 text-gray-400">
      Lade Kurs...
    </div>

    <div v-else-if="courseStore.currentCourse" class="space-y-6">
      <!-- Header card -->
      <div class="flex items-start gap-5 border-b border-gray-100 pb-6">
        <div class="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <GraduationCap :size="28" class="text-blue-600" />
        </div>
        <div class="flex-grow">
          <h1 class="text-3xl font-bold text-gray-900">{{ courseStore.currentCourse.name }}</h1>
          <p class="text-gray-500 text-sm mt-1">
            {{ memberCount }} Mitglied{{ memberCount === 1 ? '' : 'er' }}
          </p>
        </div>
      </div>

      <!-- Members -->
      <Card>
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-gray-900">Mitglieder</h2>
          <BaseButton
            v-if="can.editCourse.value"
            @click="openAddModal"
            class="flex items-center gap-2"
          >
            <UserPlus :size="16" />
            Mitglied hinzufügen
          </BaseButton>
        </div>

        <div
          v-if="courseStore.currentMembers.length === 0"
          class="py-10 text-center text-gray-400 text-sm"
        >
          Dieser Kurs hat noch keine Mitglieder.
        </div>

        <ul v-else class="divide-y divide-gray-100">
          <li
            v-for="user in courseStore.currentMembers"
            :key="user.userId"
            class="flex items-center justify-between py-3"
          >
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-sm font-semibold">
                {{ (user.username || '?').charAt(0).toUpperCase() }}
              </div>
              <div>
                <div class="font-medium text-gray-900">{{ user.username }}</div>
                <div class="text-xs text-gray-500">{{ user.email }}</div>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <span
                class="text-xs px-2 py-0.5 rounded font-medium"
                :class="roleClass(user.role)"
              >
                {{ roleLabel(user.role) }}
              </span>
              <button
                v-if="can.editCourse.value"
                @click="requestRemoveMember(user)"
                :disabled="removingId === user.userId"
                class="p-2 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                title="Aus Kurs entfernen"
              >
                <Loader2 v-if="removingId === user.userId" :size="16" class="animate-spin text-red-500" />
                <UserMinus v-else :size="16" class="text-red-600" />
              </button>
            </div>
          </li>
        </ul>
      </Card>
    </div>

    <!-- Add-members modal -->
    <Modal :show="showAddModal" @close="closeAddModal">
      <template #header>
        <h2 class="text-xl font-semibold">Mitglieder hinzufügen</h2>
      </template>

      <template #body>
        <div class="space-y-4">
          <!-- Search box -->
          <div class="relative">
            <Search :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Nach Benutzername oder E-Mail suchen..."
              class="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <!-- Selected chips -->
          <div v-if="selectedToAdd.size > 0" class="flex flex-wrap gap-2">
            <span
              v-for="user in Array.from(selectedToAdd.values())"
              :key="user.userId"
              class="flex items-center gap-1 bg-emerald-50 text-emerald-700 text-sm px-2 py-1 rounded"
            >
              {{ user.username }}
              <button @click="removeSelection(user.userId)" class="hover:text-emerald-900">
                <X :size="14" />
              </button>
            </span>
          </div>

          <!-- Results -->
          <div class="max-h-72 overflow-y-auto border border-gray-100 rounded-lg">
            <div v-if="isSearching" class="p-4 text-center text-gray-400 text-sm">
              Suche...
            </div>
            <div
              v-else-if="searchQuery.trim().length < 2"
              class="p-4 text-center text-gray-400 text-sm"
            >
              Mindestens 2 Zeichen eingeben.
            </div>
            <div
              v-else-if="searchResults.length === 0"
              class="p-4 text-center text-gray-400 text-sm"
            >
              Keine Treffer.
            </div>
            <ul v-else class="divide-y divide-gray-100">
              <li
                v-for="user in searchResults"
                :key="user.userId"
                class="flex items-center justify-between p-3 hover:bg-gray-50"
              >
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 text-xs font-semibold">
                    {{ (user.username || '?').charAt(0).toUpperCase() }}
                  </div>
                  <div>
                    <div class="font-medium text-gray-900 text-sm">{{ user.username }}</div>
                    <div class="text-xs text-gray-500">{{ user.email }}</div>
                  </div>
                </div>
                <div>
                  <span
                    v-if="isAlreadyMember(user.userId)"
                    class="text-xs text-gray-400"
                  >
                    bereits Mitglied
                  </span>
                  <button
                    v-else
                    @click="toggleSelection(user)"
                    class="text-xs px-3 py-1 rounded-lg font-medium transition"
                    :class="
                      selectedToAdd.has(user.userId)
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    "
                  >
                    {{ selectedToAdd.has(user.userId) ? 'Ausgewählt' : 'Auswählen' }}
                  </button>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-end gap-3">
          <BaseButton variant="red" @click="closeAddModal" :disabled="isAddingMembers">
            Abbrechen
          </BaseButton>
          <BaseButton
            @click="submitAddMembers"
            :disabled="selectedToAdd.size === 0 || isAddingMembers"
          >
            {{ isAddingMembers ? 'Hinzufügen...' : `${selectedToAdd.size} hinzufügen` }}
          </BaseButton>
        </div>
      </template>
    </Modal>

    <!-- Remove-member confirm modal -->
    <Modal :show="showRemoveModal" @close="closeRemoveModal">
      <template #header>
        <h2 class="text-xl font-semibold text-red-700">Mitglied entfernen</h2>
      </template>

      <template #body>
        <p class="text-gray-700">
          Soll
          <strong>{{ memberToRemove?.username }}</strong>
          wirklich aus diesem Kurs entfernt werden?
        </p>
        <p class="text-sm text-gray-500 mt-2">
          Das Benutzer-Konto bleibt bestehen — nur die Kurszuordnung wird aufgehoben.
        </p>
      </template>

      <template #footer>
        <div class="flex justify-end gap-3">
          <BaseButton variant="yellow" @click="closeRemoveModal" :disabled="!!removingId">
            Abbrechen
          </BaseButton>
          <BaseButton variant="red" @click="confirmRemoveMember" :disabled="!!removingId">
            {{ removingId ? 'Entferne...' : 'Entfernen' }}
          </BaseButton>
        </div>
      </template>
    </Modal>
  </div>
</template>
