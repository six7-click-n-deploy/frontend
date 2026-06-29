<script setup lang="ts">
import { User, Mail, Shield, Calendar, Cloud, ChevronRight, BookOpen, Contact, Key } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth.store'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { roleLabelKey, roleBadgeVariant as roleBadgeVariantFor } from '@/i18n/role-labels'
import Badge from '@/components/ui/Badge.vue'
import Card from '@/components/ui/Card.vue'
import PageHeader from '@/components/ui/PageHeader.vue'

const authStore = useAuthStore()
const { t } = useI18n()

// WORKAROUND: Wir überschreiben hier lokal den strengen Typ von authStore.user mit "any".
// So hört TypeScript auf zu meckern, dass firstName, course, etc. nicht im alten Typen existieren.
const user = computed(() => authStore.user as any)

// Zentrale role-label helpers (i18n/role-labels.ts) ersetzen die alten
// Inline-Maps — eine Quelle für Variant + Übersetzung über alle Views.
const roleBadgeVariant = computed(() => roleBadgeVariantFor(user.value?.role))
const roleLabel = computed(() => t(roleLabelKey(user.value?.role)))

const createdDate = computed(() => {
  if (!user.value?.created_at) return 'N/A'
  return new Date(user.value.created_at).toLocaleDateString('de-DE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})

</script>

<template>
  <div class="p-6">

    <PageHeader title="Profil" subtitle="Deine Benutzerinformationen" />

    <div v-if="!user" class="text-center py-12">
      <p class="text-gray-500">Lade Benutzerdaten...</p>
    </div>

    <div v-else class="space-y-6">
      <Card class="flex items-center justify-between">
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
      </Card>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        <Card class="flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-500 mb-1">Vorname</div>
            <div class="font-medium" :class="user.firstName ? 'text-gray-900' : 'text-gray-400'">
              {{ user.firstName || 'N/A' }}
            </div>
          </div>
          <Contact :size="20" class="text-primary" />
        </Card>

        <Card class="flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-500 mb-1">Nachname</div>
            <div class="font-medium" :class="user.lastName ? 'text-gray-900' : 'text-gray-400'">
              {{ user.lastName || 'N/A' }}
            </div>
          </div>
          <Contact :size="20" class="text-primary" />
        </Card>

        <Card class="flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-500 mb-1">E-Mail</div>
            <div class="font-medium" :class="user.email ? 'text-gray-900' : 'text-gray-400'">
              {{ user.email || 'N/A' }}
            </div>
          </div>
          <Mail :size="20" class="text-primary" />
        </Card>

        <Card class="flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-500 mb-1">Kurs</div>
            <div class="font-medium" :class="user.course?.name ? 'text-gray-900' : 'text-gray-400'">
              {{ user.course?.name || 'N/A' }}
            </div>
          </div>
          <BookOpen :size="20" class="text-primary" />
        </Card>

        <Card class="flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-500 mb-1">Rolle</div>
            <div class="font-medium text-gray-900">{{ roleLabel }}</div>
          </div>
          <Shield :size="20" class="text-primary" />
        </Card>

        <Card class="flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-500 mb-1">Benutzer-ID</div>
            <div class="font-mono text-xs" :class="user.userId ? 'text-gray-600' : 'text-gray-400'">
              {{ user.userId || 'N/A' }}
            </div>
          </div>
          <User :size="20" class="text-primary" />
        </Card>

        <Card class="flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-500 mb-1">Registriert seit</div>
            <div class="font-medium text-gray-900">{{ createdDate }}</div>
          </div>
          <Calendar :size="20" class="text-primary" />
        </Card>

        <Card class="flex items-center justify-between">
          <div>
            <div class="text-sm text-gray-500 mb-1">Keycloak-ID</div>
            <div class="font-mono text-xs" :class="user.keycloak_id ? 'text-gray-600' : 'text-gray-400'">
              {{ user.keycloak_id || 'N/A' }}
            </div>
          </div>
          <Key :size="20" class="text-primary" />
        </Card>

      </div>

      <!-- Settings — eigenes Layout (Listen-Eintrag), nicht Karten-
           Grid. Bleibt weiß, gleicher Border/Padding-Stil wie die
           Cards drüber. -->
      <div class="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
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