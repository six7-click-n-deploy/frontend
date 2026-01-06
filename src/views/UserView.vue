<script setup lang="ts">
import { User, Mail, Shield, Calendar } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth.store'
import { computed } from 'vue'
import Badge from '@/components/ui/Badge.vue'

const authStore = useAuthStore()

const user = computed(() => authStore.user)
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
  if (!user.value?.created_at) return 'Unbekannt'
  return new Date(user.value.created_at).toLocaleDateString('de-DE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})
</script>

<template>
  <div class="p-6">

    <!-- Header -->
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
      <!-- Profile Card -->
      <div class="bg-white rounded-xl border p-6 flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div
            class="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center"
          >
            <User :size="32" class="text-primary" />
          </div>

          <div>
            <div class="font-semibold text-gray-900 text-lg">
              {{ user.username }}
            </div>
            <Badge :variant="roleBadgeVariant">{{ roleLabel }}</Badge>
          </div>
        </div>
      </div>

      <!-- Information -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

        <!-- E-Mail -->
        <div class="bg-white rounded-xl border p-6 flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-500 mb-1">E-Mail</div>
            <div class="font-medium text-gray-900">{{ user.email }}</div>
          </div>
          <Mail :size="20" class="text-primary" />
        </div>

        <!-- Role -->
        <div class="bg-white rounded-xl border p-6 flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-500 mb-1">Rolle</div>
            <div class="font-medium text-gray-900">{{ roleLabel }}</div>
          </div>
          <Shield :size="20" class="text-primary" />
        </div>

        <!-- User ID -->
        <div class="bg-white rounded-xl border p-6 flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-500 mb-1">Benutzer-ID</div>
            <div class="font-mono text-xs text-gray-600">{{ user.userId }}</div>
          </div>
          <User :size="20" class="text-primary" />
        </div>

        <!-- Created At -->
        <div class="bg-white rounded-xl border p-6 flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-500 mb-1">Registriert seit</div>
            <div class="font-medium text-gray-900">{{ createdDate }}</div>
          </div>
          <Calendar :size="20" class="text-primary" />
        </div>
      </div>
    </div>
  </div>
</template>

