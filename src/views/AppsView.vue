<script setup lang="ts">
import { ref, onMounted } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import Card from '@/components/ui/Card.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import EntityListState from '@/components/ui/EntityListState.vue'
import AppVersionStatusBadge from '@/components/ui/AppVersionStatusBadge.vue'
import { useRouter } from 'vue-router'
import { appApi } from '@/api/app.api'
import { useI18n } from 'vue-i18n'
import {
  Layers, Server, Box, Database, Terminal,
  Globe, LayoutTemplate, Shield, Inbox, Plus
} from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth.store'
import type { AppVersionApproval } from '@/types'

const { t } = useI18n()
const toast = useToast()
const router = useRouter()
const authStore = useAuthStore()

const isLoading = ref(false)
const apps = ref<any[]>([])
// Map: appId → list of approvals (only loaded for own apps)
const approvalsMap = ref<Record<string, AppVersionApproval[]>>({})

const getIconForApp = (app: any) => {
  const name = (app.name || '').toLowerCase()
  if (name.includes('node')) return Server
  if (name.includes('vue') || name.includes('front')) return LayoutTemplate
  if (name.includes('react')) return Globe
  if (name.includes('python') || name.includes('jupyter') || name.includes('fastapi')) return Box
  if (name.includes('postgres') || name.includes('sql') || name.includes('data')) return Database
  if (name.includes('docker') || name.includes('container')) return Terminal
  if (name.includes('security') || name.includes('pen')) return Shield
  return Layers
}

const isOwnApp = (app: any) => {
  return String(app.userId) === String(authStore.userId)
}

const badgeStatusForApp = (app: any) => {
  if (!isOwnApp(app)) return null
  if (app.is_private) return 'private'

  const approvals = approvalsMap.value[app.appId] ?? []
  if (approvals.some(a => a.status === 'approved')) return 'published'
  if (approvals.some(a => a.status === 'pending')) return 'pending'
  return 'new'
}

const fetchApps = async () => {
  isLoading.value = true
  try {
    const response = await appApi.list()
    apps.value = (response.data && Array.isArray(response.data)) ? response.data : []

    // Load approvals for own apps in parallel (best-effort, errors are swallowed)
    const ownApps = apps.value.filter(isOwnApp)
    await Promise.allSettled(
      ownApps.map(async (app) => {
        try {
          const res = await appApi.listVersionApprovals(app.appId)
          approvalsMap.value[app.appId] = res.data
        } catch {
          approvalsMap.value[app.appId] = []
        }
      })
    )
  } catch (error) {
    console.error('Fehler beim Laden der Apps:', error)
    toast.error(t('AppsView.loadError'))
    apps.value = []
  } finally {
    isLoading.value = false
  }
}

const handleDeploy = (app: any) => {
  const safeId = app.id || app._id || app.appId
  router.push({
    name: 'apps.detail',
    params: { id: safeId }
  })
}

onMounted(() => {
  fetchApps()
})
</script>

<template>
  <div class="p-6">
    <PageHeader :title="$t('AppsView.title')" :subtitle="$t('AppsView.subtitle')">
      <template #actions>
        <RouterLink :to="{ name: 'apps.create' }">
          <BaseButton class="flex items-center gap-2">
            <Plus :size="16" />
            {{ $t('AppsView.addApp') }}
          </BaseButton>
        </RouterLink>
      </template>
    </PageHeader>

    <EntityListState
      :is-loading="isLoading && apps.length === 0"
      :is-empty="!isLoading && apps.length === 0"
      :icon="Inbox"
      :empty-message="$t('AppsView.noAppsDesc')"
      :loading-message="$t('AppsView.loading')"
    >
      <template #empty-action>
        <RouterLink :to="{ name: 'apps.create' }">
          <BaseButton class="flex items-center gap-2">
            <Plus :size="16" />
            {{ $t('AppsView.addApp') }}
          </BaseButton>
        </RouterLink>
      </template>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card
            v-for="app in apps"
            :key="app.appId || app.id"
            class="flex flex-col group h-full relative cursor-pointer hover:border-emerald-200"
            @click="handleDeploy(app)"
        >
          <!-- Status Badge (own apps only) -->
          <div v-if="badgeStatusForApp(app)" class="absolute top-3 right-3">
            <AppVersionStatusBadge :status="badgeStatusForApp(app)!" />
          </div>

          <div class="flex items-center gap-4 mb-4">
            <div class="bg-gray-50 p-3 rounded-lg text-gray-700 group-hover:text-primary transition-colors flex items-center justify-center w-[56px] h-[56px] flex-shrink-0 border border-gray-100">
              <img
                  v-if="app.image"
                  :src="app.image"
                  :alt="app.name"
                  class="w-full h-full object-contain"
              />
              <component v-else :is="getIconForApp(app)" :size="32" />
            </div>
            <h3 class="font-bold text-xl text-gray-900 leading-tight pr-16">
              {{ app.name }}
            </h3>
          </div>

          <p class="text-gray-600 text-sm mb-6 flex-grow leading-relaxed text-left">
            {{ app.description || $t('AppsView.noDescription') }}
          </p>

          <div class="mt-auto">
            <BaseButton
                variant="green"
                class="w-full flex items-center justify-center gap-2"
                @click.stop="handleDeploy(app)"
            >
              {{ $t('AppsView.detailsDeploy') }}
            </BaseButton>
          </div>
        </Card>
      </div>
    </EntityListState>
  </div>
</template>
