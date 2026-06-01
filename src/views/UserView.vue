<script setup lang="ts">
import { User, Mail, Shield, Calendar, Cloud, ChevronRight, BookOpen, Contact, UploadCloud, Key } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from '@/composables/useToast'
import { computed, ref } from 'vue'
import Badge from '@/components/ui/Badge.vue'

const authStore = useAuthStore()
const toast = useToast()

// WORKAROUND: Wir überschreiben hier lokal den strengen Typ von authStore.user mit "any".
// So hört TypeScript auf zu meckern, dass firstName, course, etc. nicht im alten Typen existieren.
const user = computed(() => authStore.user as any)

const roleBadgeVariant = computed(() => {
  switch (user.value?.role) {
    case 'admin': return 'purple'
    case 'teacher': return 'blue'
    case 'student': return 'green'
    default: return 'gray'
  }
})

const roleLabel = computed(() => {
  switch (user.value?.role) {
    case 'admin': return 'Administrator'
    case 'teacher': return 'Lehrer'
    case 'student': return 'Student'
    default: return 'Unbekannt'
  }
})

const createdDate = computed(() => {
  if (!user.value?.created_at) return 'N/A'
  return new Date(user.value.created_at).toLocaleDateString('de-DE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})

// --- Upload Logik für cloud.yml ---
const selectedFile = ref<File | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)

const triggerFileInput = () => {
  fileInputRef.value?.click()
}

const processFile = (file: File) => {
  if (!file.name.toLowerCase().endsWith('.yml') && !file.name.toLowerCase().endsWith('.yaml')) {
    toast.error('Bitte lade nur gültige .yml oder .yaml Dateien hoch.')
    return
  }
  selectedFile.value = file
}

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    // FIX: Explizite Zuweisung und Prüfung löst den "File | undefined" Fehler
    const file = target.files[0]
    if (file) {
      processFile(file)
    }
  }
  if (target) target.value = ''
}

const handleDrop = (event: DragEvent) => {
  isDragging.value = false
  if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
    // FIX: Explizite Zuweisung und Prüfung löst den "File | undefined" Fehler
    const file = event.dataTransfer.files[0]
    if (file) {
      processFile(file)
    }
  }
}
</script>

<template>
  <div class="p-6">

    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-1">
        Profil
      </h1>
      <p class="text-gray-500">
        Deine Benutzerinformationen
      </p>
    </div>

    <div v-if="!user" class="text-center py-12">
      <p class="text-gray-500">Lade Benutzerdaten...</p>
    </div>

    <div v-else class="space-y-6">
      <div class="bg-white rounded-xl border p-6 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div
              class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center"
          >
            <User :size="32" class="text-primary" />
          </div>

          <div>
            <div class="font-semibold text-gray-900 text-lg">
              {{ user.username || 'N/A' }}
            </div>
            <Badge :variant="roleBadgeVariant">{{ roleLabel }}</Badge>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

        <div class="bg-white rounded-xl border p-6 flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-500 mb-1">Vorname</div>
            <div class="font-medium" :class="user.firstName ? 'text-gray-900' : 'text-gray-400'">
              {{ user.firstName || 'N/A' }}
            </div>
          </div>
          <Contact :size="20" class="text-primary" />
        </div>

        <div class="bg-white rounded-xl border p-6 flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-500 mb-1">Nachname</div>
            <div class="font-medium" :class="user.lastName ? 'text-gray-900' : 'text-gray-400'">
              {{ user.lastName || 'N/A' }}
            </div>
          </div>
          <Contact :size="20" class="text-primary" />
        </div>

        <div class="bg-white rounded-xl border p-6 flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-500 mb-1">E-Mail</div>
            <div class="font-medium" :class="user.email ? 'text-gray-900' : 'text-gray-400'">
              {{ user.email || 'N/A' }}
            </div>
          </div>
          <Mail :size="20" class="text-primary" />
        </div>

        <div class="bg-white rounded-xl border p-6 flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-500 mb-1">Kurs</div>
            <div class="font-medium" :class="user.course?.name ? 'text-gray-900' : 'text-gray-400'">
              {{ user.course?.name || 'N/A' }}
            </div>
          </div>
          <BookOpen :size="20" class="text-primary" />
        </div>

        <div class="bg-white rounded-xl border p-6 flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-500 mb-1">Rolle</div>
            <div class="font-medium text-gray-900">{{ roleLabel }}</div>
          </div>
          <Shield :size="20" class="text-primary" />
        </div>

        <div class="bg-white rounded-xl border p-6 flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-500 mb-1">Benutzer-ID</div>
            <div class="font-mono text-xs" :class="user.userId ? 'text-gray-600' : 'text-gray-400'">
              {{ user.userId || 'N/A' }}
            </div>
          </div>
          <User :size="20" class="text-primary" />
        </div>

        <div class="bg-white rounded-xl border p-6 flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-500 mb-1">Registriert seit</div>
            <div class="font-medium text-gray-900">{{ createdDate }}</div>
          </div>
          <Calendar :size="20" class="text-primary" />
        </div>

        <div class="bg-white rounded-xl border p-6 flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-500 mb-1">Keycloak-ID</div>
            <div class="font-mono text-xs" :class="user.keycloak_id ? 'text-gray-600' : 'text-gray-400'">
              {{ user.keycloak_id || 'N/A' }}
            </div>
          </div>
          <Key :size="20" class="text-primary" />
        </div>

        <div
            class="col-span-1 md:col-span-2 bg-white rounded-xl border-2 border-dashed p-6 flex items-center justify-between cursor-pointer transition-colors"
            :class="isDragging ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary/50 hover:bg-gray-50'"
            @dragover.prevent="isDragging = true"
            @dragleave.prevent="isDragging = false"
            @drop.prevent="handleDrop"
            @click="triggerFileInput"
        >
          <input
              ref="fileInputRef"
              type="file"
              accept=".yml,.yaml"
              class="hidden"
              @change="handleFileChange"
          />
          <div>
            <div class="text-sm text-gray-500 mb-1">Cloud Konfiguration</div>
            <div v-if="!selectedFile" class="font-medium text-gray-900">
              Klicke hier oder ziehe eine <span class="font-mono bg-gray-100 px-1 rounded text-sm">cloud.yml</span> Datei in diesen Bereich
            </div>
            <div v-else class="font-medium text-primary flex items-center gap-2">
              {{ selectedFile.name }} ausgewählt
              <span class="text-xs text-gray-400 hover:text-red-500 ml-2 cursor-pointer" @click.stop="selectedFile = null">Entfernen</span>
            </div>
          </div>
          <UploadCloud :size="28" :class="selectedFile ? 'text-primary' : 'text-gray-400'" />
        </div>

      </div>

      <!-- Settings -->
      <div class="bg-white rounded-xl border overflow-hidden">
        <div class="px-6 py-4 border-b">
          <h2 class="text-lg font-semibold text-gray-900">Einstellungen</h2>
        </div>
        <router-link
          to="/user/openstack"
          class="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
        >
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Cloud :size="20" class="text-primary" />
            </div>
            <div>
              <div class="font-medium text-gray-900">OpenStack-Credentials</div>
              <div class="text-sm text-gray-500">
                Eigene Zugangsdaten für Deployments hinterlegen
              </div>
            </div>
          </div>
          <ChevronRight :size="18" class="text-gray-400" />
        </router-link>
      </div>
    </div>
  </div>
</template>