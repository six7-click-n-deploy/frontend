<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { appApi } from '@/api/app.api'
import { useToast } from '@/composables/useToast'
import { useI18n } from 'vue-i18n'
import {
  Layers, Server, Box, Database, Terminal,
  Globe, LayoutTemplate, Shield, ArrowLeft, GitBranch,
  Trash2,
} from 'lucide-vue-next'
import { useDeploymentStore } from '@/stores/deployment.store'
import { useOpenStackCredentialsStore } from '@/stores/openstack-credentials.store'
import { useAuthStore } from '@/stores/auth.store'
import BaseButton from '@/components/ui/BaseButton.vue'
import Modal from '@/components/ui/Modal.vue'

const deploymentStore = useDeploymentStore()
const credStore = useOpenStackCredentialsStore()
const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const toast = useToast()
const { t } = useI18n()

const isLoading = ref(false)
const isRefreshing = ref(false)
const app = ref<any>(null)
const selectedVersion = ref('')

const showDeleteModal = ref(false)
const isDeleting = ref(false)

const canDelete = computed(() => {
  if (!app.value) return false
  if (authStore.isTeacherOrAdmin) return true
  return String(app.value.userId) === String(authStore.userId)
})

const versionOptions = computed(() => {
  const raw = app.value?.versions || []
  return raw
      .map((v: any) => (typeof v === 'string' ? v : v?.version || v?.releaseTag || ''))
      .filter((v: string) => Boolean(v))
})

const selectedVersionDetails = computed(() => {
  if (!app.value?.versions || !selectedVersion.value) return null
  const match = app.value.versions.find((v: any) => {
    if (typeof v === 'string') return v === selectedVersion.value
    return (
        v?.version === selectedVersion.value ||
        v?.releaseTag === selectedVersion.value ||
        v?.tag === selectedVersion.value
    )
  })
  if (!match) return null
  return typeof match === 'string' ? { version: match } : match
})

const formatDate = (val: any) => {
  if (val instanceof Date) {
    return val.toLocaleDateString('en-US')
  }
  if (typeof val === 'string') {
    const d = new Date(val)
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-US')
    }
  }
  return val
}

const versionInfo = computed(() => {
  const d: any = selectedVersionDetails.value
  if (!d || typeof d !== 'object') return null
  return {
    name: d.name ?? '',
    type: d.type ?? '',
    commit: d.commit ?? d.commit_sha ?? '',
    description: d.description ?? '',
    author: d.author ?? d.commit_author ?? '',
    published_at: d.published_at ?? d.commit_date ?? '',
    prerelease: d.prerelease ?? '',
    html_url: d.html_url ?? d.url ?? ''
  }
})

const hasVersionInfo = computed(() => {
  const d: any = selectedVersionDetails.value
  if (!d || typeof d !== 'object') return false
  return [
    'name', 'type', 'commit', 'description', 'author', 'published_at', 'prerelease', 'html_url',
    'commit_sha', 'commit_author', 'commit_date', 'url'
  ].some((k) => Boolean(d[k]))
})

const appId = computed(() => route.params.id as string)

const getIconForApp = (appName: string) => {
  const name = (appName || '').toLowerCase()
  if (name.includes('node')) return Server
  if (name.includes('vue') || name.includes('front')) return LayoutTemplate
  if (name.includes('react')) return Globe
  if (name.includes('python') || name.includes('jupyter') || name.includes('fastapi')) return Box
  if (name.includes('postgres') || name.includes('sql') || name.includes('data')) return Database
  if (name.includes('docker') || name.includes('container')) return Terminal
  if (name.includes('security') || name.includes('pen')) return Shield
  return Layers
}

const fetchAppDetails = async (forceRefresh = false) => {
  if (!appId.value) return

  if (forceRefresh) {
    isRefreshing.value = true
  } else {
    isLoading.value = true
  }

  try {
    const response = await appApi.getById(appId.value, forceRefresh)
    app.value = response.data

    if (versionOptions.value.length > 0 && !selectedVersion.value) {
      selectedVersion.value = versionOptions.value[0]
    }
  } catch (error) {
    console.error('Fehler beim Laden der App-Details:', error)
    toast.error(t('AppsDetailView.toasts.loadError'))

    if (!app.value) {
      router.push({ name: 'apps.index' })
    }
  } finally {
    isLoading.value = false
    isRefreshing.value = false
  }
}

const handleDeploy = () => {
  if (!selectedVersion.value) {
    toast.warning(t('AppsDetailView.toasts.selectVersionFirst'))
    return
  }

  deploymentStore.resetDraft()
  deploymentStore.draft.appId = app.value.appId || app.value.id
  deploymentStore.draft.releaseTag = selectedVersion.value

  toast.success(t('AppsDetailView.toasts.preparingConfig', { name: app.value.name }))
  router.push({ name: 'deployment.config' })
}

const confirmDelete = async () => {
  if (!app.value) return

  const safeId = app.value.appId || app.value.id || app.value._id
  if (!safeId) {
    toast.error(t('AppsDetailView.deleteErrorToast'))
    return
  }

  isDeleting.value = true
  try {
    await appApi.delete(safeId)
    toast.success(t('AppsDetailView.deleteSuccessToast'))
    showDeleteModal.value = false
    router.push({ name: 'apps' })
  } catch (error: any) {
    const detail = error?.response?.data?.detail
    const reason = typeof detail === 'object' ? detail?.message || detail?.reason : detail
    console.error('Delete app failed:', error)
    toast.error(`${t('AppsDetailView.deleteErrorToast')}${reason ? ': ' + reason : ''}`)
  } finally {
    isDeleting.value = false
  }
}

onMounted(() => {
  fetchAppDetails()
})
</script>

<template>
  <div class="bg-white rounded-2xl p-10 border min-h-[600px]">

    <div class="mb-8">
      <button
          @click="router.back()"
          class="flex items-center text-gray-500 hover:text-gray-900 transition-colors mb-4"
      >
        <ArrowLeft :size="20" class="mr-2" /> {{ $t('AppsDetailView.backToOverview') }}
      </button>
    </div>

    <div v-if="isLoading" class="flex justify-center py-20">
      <div class="flex flex-col items-center gap-3">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <div class="text-gray-400">{{ $t('AppsDetailView.loading') }}</div>
      </div>
    </div>

    <div v-else-if="app" class="max-w-4xl mx-auto">

      <div class="flex items-start gap-6 mb-8 border-b border-gray-100 pb-8">
        <div class="bg-[#EFF5F2] p-4 rounded-xl shadow-sm text-primary flex items-center justify-center w-[88px] h-[88px] flex-shrink-0">
          <img
              v-if="app.image"
              :src="app.image"
              :alt="app.name"
              class="w-full h-full object-contain"
          />
          <component v-else :is="getIconForApp(app.name)" :size="48" />
        </div>
        <div class="flex-grow">
          <div class="flex justify-between items-start">
            <div>
              <h1 class="text-3xl font-bold text-gray-900 mb-2">{{ app.name }}</h1>
              <div class="flex items-center gap-3 text-sm text-gray-500">
                <span class="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                  <GitBranch :size="14" /> {{ app.versions?.length || 0 }} {{ $t('AppsDetailView.versionsAvailable') }}
                </span>
                <span v-if="app.git_link" class="text-blue-600 hover:underline cursor-pointer">
                  {{ app.git_link }}
                </span>
              </div>
            </div>

            <BaseButton
                v-if="canDelete"
                @click="showDeleteModal = true"
                class="flex items-center gap-2 px-4 py-2"
                variant="red">
              <Trash2 :size="18" />
              <span class="font-medium">{{ $t('AppsDetailView.deleteApp') }}</span>
            </BaseButton>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-12">

        <div class="lg:col-span-2 space-y-6">
          <div>
            <h2 class="text-xl font-semibold text-gray-900 mb-3">{{ $t('AppsDetailView.descriptionTitle') }}</h2>
            <p class="text-gray-600 leading-relaxed text-lg">
              {{ app.description || $t('AppsDetailView.noDescription') }}
            </p>
          </div>

          <div class="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">{{ $t('AppsDetailView.appInfoTitle') }}</h3>
            <ul class="space-y-2 text-sm text-gray-600">
              <li class="flex justify-between">
                <span>{{ $t('AppsDetailView.createdAt') }}</span>
                <span class="font-medium">
                  {{ app.created_at ? formatDate(app.created_at) : '-' }}
                </span>
              </li>
              <li class="flex justify-between">
                <span>{{ $t('AppsDetailView.createdBy') }}</span>
                <span class="font-medium">{{ app.user?.username || $t('AppsDetailView.unknownUser') }}</span>
              </li>
            </ul>
          </div>
          <div class="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">{{ $t('AppsDetailView.versionDetailsTitle') }}</h3>
            <div class="space-y-6">
              <div v-if="hasVersionInfo && versionInfo" class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-600">{{ $t('AppsDetailView.versionName') }}</span>
                  <span class="font-medium text-right">{{ versionInfo.name || '-' }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">{{ $t('AppsDetailView.versionType') }}</span>
                  <span class="font-medium text-right">{{ versionInfo.type || '-' }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">{{ $t('AppsDetailView.versionCommit') }}</span>
                  <span class="font-medium text-right">{{ versionInfo.commit || '-' }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">{{ $t('AppsDetailView.versionAuthor') }}</span>
                  <span class="font-medium text-right">{{ versionInfo.author || '-' }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">{{ $t('AppsDetailView.versionPublishedAt') }}</span>
                  <span class="font-medium text-right">{{ versionInfo.published_at ? formatDate(versionInfo.published_at) : '-' }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-600">{{ $t('AppsDetailView.versionPreRelease') }}</span>
                  <span class="font-medium text-right">
                    {{ String(versionInfo.prerelease ?? '').toLowerCase() === 'true' ? $t('AppsDetailView.yes') : (versionInfo.prerelease === '' ? '-' : $t('AppsDetailView.no')) }}
                  </span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-gray-600">{{ $t('AppsDetailView.versionLink') }}</span>
                  <template v-if="versionInfo.html_url">
                    <a :href="versionInfo.html_url" target="_blank" rel="noopener" class="font-medium text-blue-600 hover:underline break-all">{{ versionInfo.html_url }}</a>
                  </template>
                  <span v-else class="font-medium text-right">-</span>
                </div>
              </div>

              <p v-if="!hasVersionInfo" class="text-xs text-gray-400">{{ $t('AppsDetailView.noVersionInfo') }}</p>
            </div>
          </div>

          <div v-if="versionInfo && versionInfo.description" class="bg-gray-50 rounded-lg p-4 border border-gray-100">
            <h3 class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">{{ $t('AppsDetailView.versionDescTitle') }}</h3>
            <p class="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{{ versionInfo.description }}</p>
          </div>
        </div>

        <div class="bg-[#FAFAFA] border border-gray-200 rounded-xl p-6 h-fit sticky top-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-6">{{ $t('AppsDetailView.startDeploymentTitle') }}</h2>

          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-2">{{ $t('AppsDetailView.selectVersionLabel') }}</label>
            <select
                v-model="selectedVersion"
                class="w-full rounded-lg border border-gray-300 bg-white py-2 px-3 text-sm text-gray-900 focus:ring-2 focus:ring-primary focus:border-primary shadow-sm cursor-pointer transition-all hover:border-gray-400"
                :disabled="versionOptions.length === 0"
            >
              <option v-for="ver in versionOptions" :key="ver" :value="ver">
                {{ ver }}
              </option>
            </select>
          </div>

          <button
              @click="handleDeploy"
              :disabled="!selectedVersion || (credStore.isResolved && !credStore.hasCredential)"
              :title="credStore.isResolved && !credStore.hasCredential ? $t('AppsDetailView.missingCredsTitle') : ''"
              class="w-full bg-gradient-to-r from-[#2E5C46] to-[#234a36] text-white px-4 py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
          >
            <Layers :size="18" />
            {{ $t('AppsDetailView.deployButton') }}
          </button>
          <p v-if="credStore.isResolved && !credStore.hasCredential" class="mt-2 text-sm text-amber-700">
            <router-link to="/user/openstack" class="underline font-medium">
              {{ $t('AppsDetailView.missingCredsLink') }}
            </router-link>
            {{ $t('AppsDetailView.missingCredsText') }}
          </p>
        </div>

      </div>

    </div>

    <Modal v-if="app" :show="showDeleteModal" @close="showDeleteModal = false">
      <template #title>
        {{ $t('AppsDetailView.confirmDeleteTitle') }}
      </template>
      <div class="space-y-4">
        <p v-html="$t('AppsDetailView.confirmDeleteMessage', { name: app.name })"></p>
        <div class="flex justify-end gap-4">
          <BaseButton variant="yellow" @click="showDeleteModal = false" :disabled="isDeleting">
            {{ $t('AppsDetailView.cancelButton') }}
          </BaseButton>
          <BaseButton variant="red" @click="confirmDelete" :disabled="isDeleting">
            {{ isDeleting ? $t('AppsDetailView.deletingButton') : $t('AppsDetailView.confirmButton') }}
          </BaseButton>
        </div>
      </div>
    </Modal>
  </div>
</template>