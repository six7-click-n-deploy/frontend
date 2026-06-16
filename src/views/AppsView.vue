<script setup lang="ts">
import { ref, onMounted } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BackCard from '@/components/ui/CardForBG.vue'
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
  <BackCard class="min-h-[600px]">
    <div class="flex justify-between items-center mb-3">
      <div class="flex items-center gap-4 text-primary">
        <Layers :size="28" />
        <h1 class="text-3xl font-bold text-gray-900">
          {{ $t('AppsView.title') }}
        </h1>
      </div>

      <RouterLink :to="{ name: 'apps.create' }">
        <BaseButton variant="yellow" class="text-2xl h-fit flex gap-2 items-center">
          <Plus :size="20" />
          {{ $t('AppsView.addApp') }}
        </BaseButton>
      </RouterLink>
    </div>

    <div class="mb-10 max-w-3xl">
      <p class="text-gray-500 text-lg">
        {{ $t('AppsView.subtitle') }}
      </p>
    </div>

    <div v-if="isLoading" class="flex justify-center py-20">
      <div class="flex flex-col items-center gap-3">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <div class="text-gray-400">{{ $t('AppsView.loading') }}</div>
      </div>
    </div>

    <div v-else-if="apps.length === 0" class="flex flex-col items-center justify-center py-20 border-2 border-dashed border-gray-100 rounded-2xl">
      <Inbox :size="64" class="text-gray-200 mb-4" />
      <h2 class="text-xl font-semibold text-gray-900 mb-2">{{ $t('AppsView.noAppsTitle') }}</h2>
      <p class="text-gray-500">{{ $t('AppsView.noAppsDesc') }}</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
          v-for="app in apps"
          :key="app.appId || app.id"
          class="bg-[#EFF5F2] border border-gray-200 rounded-xl p-6 flex flex-col hover:shadow-lg transition-all duration-200 group h-full relative"
      >
        <!-- Status Badge (own apps only) -->
        <div v-if="badgeStatusForApp(app)" class="absolute top-3 right-3">
          <AppVersionStatusBadge :status="badgeStatusForApp(app)!" />
        </div>

        <div class="flex items-center gap-4 mb-4">
          <div class="bg-white p-3 rounded-lg shadow-sm text-gray-700 group-hover:text-primary transition-colors flex items-center justify-center w-[56px] h-[56px] flex-shrink-0">
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
          <button
              @click="handleDeploy(app)"
              class="w-full bg-white border-2 border-[#2E5C46] text-[#2E5C46] px-4 py-2.5 rounded-lg font-medium hover:bg-[#2E5C46] hover:text-white transition-colors shadow-sm flex items-center justify-center gap-2"
          >
            {{ $t('AppsView.detailsDeploy') }}
          </button>
        </div>
      </div>
    </div>
  </BackCard>
</template>
