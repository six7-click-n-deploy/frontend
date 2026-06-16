<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  ShieldCheck, ChevronDown, ChevronRight,
  Check, X, RotateCcw, Inbox, ExternalLink,
} from 'lucide-vue-next'
import BackCard from '@/components/ui/CardForBG.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import Modal from '@/components/ui/Modal.vue'
import AppVersionStatusBadge from '@/components/ui/AppVersionStatusBadge.vue'
import { appApi } from '@/api/app.api'
import { useToast } from '@/composables/useToast'
import { useRouter } from 'vue-router'
import type { App, AppVersionApproval } from '@/types'

const { t } = useI18n()
const toast = useToast()
const router = useRouter()

// ----------------------------------------------------------------
// State
// ----------------------------------------------------------------
const isLoading = ref(true)
const apps = ref<App[]>([])
// appId → pending count (from initial pending queue load)
const pendingCountMap = ref<Record<string, number>>({})
// appId → total submission count (any status)
const submissionCountMap = ref<Record<string, number>>({})
// appId → loaded approvals (lazy)
const approvalsMap = ref<Record<string, AppVersionApproval[]>>({})
// appId → currently loading
const loadingMap = ref<Record<string, boolean>>({})
// which app is expanded
const expandedAppId = ref<string | null>(null)
// filter: true = only apps with submissions
const onlyWithSubmissions = ref(true)

// Reject modal (single version only)
const showRejectModal = ref(false)
const rejectTarget = ref<{ appId: string; appName: string; versionTag: string } | null>(null)
const rejectionReason = ref('')
const isRejecting = ref(false)

// Per-version action loading
const actingOn = ref<string | null>(null) // `${appId}:${versionTag}`

// ----------------------------------------------------------------
// Computed
// ----------------------------------------------------------------
const sortedApps = computed(() => {
  const filtered = onlyWithSubmissions.value
    ? apps.value.filter(a => (submissionCountMap.value[a.appId] ?? 0) > 0)
    : apps.value
  return [...filtered].sort((a, b) => {
    const pa = pendingCountMap.value[a.appId] ?? 0
    const pb = pendingCountMap.value[b.appId] ?? 0
    return pb - pa
  })
})

// ----------------------------------------------------------------
// Load
// ----------------------------------------------------------------
const loadAll = async () => {
  isLoading.value = true
  try {
    const [appsRes, pendingRes] = await Promise.all([
      appApi.list(),
      appApi.admin.listPendingApprovals(),
    ])
    apps.value = appsRes.data

    // Build pending + submission count maps from the pending queue
    const pending: Record<string, number> = {}
    const submissions: Record<string, number> = {}
    for (const item of pendingRes.data) {
      pending[item.appId] = (pending[item.appId] ?? 0) + 1
      submissions[item.appId] = (submissions[item.appId] ?? 0) + 1
    }
    pendingCountMap.value = pending
    submissionCountMap.value = submissions
  } catch {
    toast.error(t('AdminAppsView.loadError'))
  } finally {
    isLoading.value = false
  }
}

const loadApprovals = async (appId: string) => {
  if (approvalsMap.value[appId] !== undefined) return
  loadingMap.value[appId] = true
  try {
    const res = await appApi.listVersionApprovals(appId)
    approvalsMap.value[appId] = res.data
    // Update submission count now that we have the full picture
    submissionCountMap.value[appId] = res.data.length
    pendingCountMap.value[appId] = res.data.filter(a => a.status === 'pending').length
  } catch {
    approvalsMap.value[appId] = []
  } finally {
    loadingMap.value[appId] = false
  }
}

const toggleApp = async (appId: string) => {
  if (expandedAppId.value === appId) {
    expandedAppId.value = null
    return
  }
  expandedAppId.value = appId
  await loadApprovals(appId)
}

// ----------------------------------------------------------------
// Actions
// ----------------------------------------------------------------
const handleApprove = async (appId: string, appName: string, versionTag: string) => {
  actingOn.value = `${appId}:${versionTag}`
  try {
    await appApi.admin.approveVersion(appId, versionTag)
    toast.success(t('AdminAppsView.approveSuccess'))
    // Update local state
    const list = approvalsMap.value[appId]
    if (list) {
      const entry = list.find(a => a.version_tag === versionTag)
      if (entry) entry.status = 'approved'
    }
    if (pendingCountMap.value[appId]) {
      pendingCountMap.value[appId] = Math.max(0, pendingCountMap.value[appId] - 1)
    }
  } catch {
    toast.error(t('AdminAppsView.approveError'))
  } finally {
    actingOn.value = null
  }
}

const openRejectModal = (appId: string, appName: string, versionTag: string) => {
  rejectTarget.value = { appId, appName, versionTag }
  rejectionReason.value = ''
  showRejectModal.value = true
}

const handleReject = async () => {
  if (!rejectTarget.value || !rejectionReason.value.trim()) return
  const { appId, versionTag } = rejectTarget.value
  isRejecting.value = true
  try {
    await appApi.admin.rejectVersion(appId, versionTag, rejectionReason.value.trim())
    toast.success(t('AdminAppsView.rejectSuccess'))
    const list = approvalsMap.value[appId]
    if (list) {
      const entry = list.find(a => a.version_tag === versionTag)
      if (entry) {
        entry.status = 'rejected'
        entry.rejection_reason = rejectionReason.value.trim()
      }
    }
    if (pendingCountMap.value[appId]) {
      pendingCountMap.value[appId] = Math.max(0, pendingCountMap.value[appId] - 1)
    }
    showRejectModal.value = false
  } catch {
    toast.error(t('AdminAppsView.rejectError'))
  } finally {
    isRejecting.value = false
  }
}

const handleRevoke = async (appId: string, versionTag: string) => {
  actingOn.value = `${appId}:${versionTag}`
  try {
    await appApi.admin.revokeVersion(appId, versionTag)
    toast.success(t('AdminAppsView.revokeSuccess'))
    const list = approvalsMap.value[appId]
    if (list) {
      const entry = list.find(a => a.version_tag === versionTag)
      if (entry) entry.status = 'rejected'
    }
  } catch {
    toast.error(t('AdminAppsView.revokeError'))
  } finally {
    actingOn.value = null
  }
}

const formatDate = (val: string) => {
  const d = new Date(val)
  return isNaN(d.getTime()) ? val : d.toLocaleDateString('de-DE')
}

onMounted(loadAll)
</script>

<template>
  <BackCard class="min-h-[600px]">

    <!-- Header -->
    <div class="flex justify-between items-center mb-3">
      <div class="flex items-center gap-4 text-primary">
        <ShieldCheck :size="28" />
        <h1 class="text-3xl font-bold text-gray-900">{{ $t('AdminAppsView.title') }}</h1>
      </div>
      <!-- Filter toggle -->
      <div class="flex items-center gap-2 text-sm">
        <span class="text-gray-500">{{ $t('AdminAppsView.filterLabel') }}</span>
        <button
          @click="onlyWithSubmissions = !onlyWithSubmissions"
          class="relative inline-flex h-5 w-10 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none"
          :class="onlyWithSubmissions ? 'bg-green-600' : 'bg-gray-300'"
        >
          <span
            class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200"
            :class="onlyWithSubmissions ? 'translate-x-5' : 'translate-x-0'"
          />
        </button>
        <span class="text-gray-700 font-medium">{{ $t('AdminAppsView.filterOnlySubmissions') }}</span>
      </div>
    </div>
    <p class="text-gray-500 text-lg mb-8 max-w-3xl">{{ $t('AdminAppsView.subtitle') }}</p>

    <!-- Loading -->
    <div v-if="isLoading" class="flex justify-center py-20">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>

    <!-- Empty -->
    <div
      v-else-if="apps.length === 0"
      class="flex flex-col items-center justify-center py-20 border-2 border-dashed border-gray-100 rounded-2xl"
    >
      <Inbox :size="64" class="text-gray-200 mb-4" />
      <h2 class="text-xl font-semibold text-gray-900 mb-2">{{ $t('AdminAppsView.emptyAppsTitle') }}</h2>
    </div>

    <!-- Accordion list -->
    <div v-else class="space-y-2">
      <div
        v-for="app in sortedApps"
        :key="app.appId"
        class="border border-gray-200 rounded-xl overflow-hidden"
      >
        <!-- App row (header) -->
        <button
          class="w-full flex items-center gap-4 px-5 py-4 bg-white hover:bg-gray-50 transition-colors text-left"
          @click="toggleApp(app.appId)"
        >
          <component
            :is="expandedAppId === app.appId ? ChevronDown : ChevronRight"
            :size="18"
            class="text-gray-400 flex-shrink-0"
          />

          <!-- App name -->
          <span class="font-semibold text-gray-900 flex-grow">{{ app.name }}</span>

          <!-- Link to app detail -->
          <RouterLink
            :to="{ name: 'apps.detail', params: { id: app.appId } }"
            class="text-gray-400 hover:text-primary transition-colors p-1 rounded"
            :title="$t('AdminAppsView.goToApp')"
            @click.stop
          >
            <ExternalLink :size="15" />
          </RouterLink>

          <!-- Pending badge -->
          <span
            v-if="pendingCountMap[app.appId]"
            class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700"
          >
            {{ pendingCountMap[app.appId] }} {{ $t('AdminAppsView.pendingLabel') }}
          </span>
          <span
            v-else
            class="text-xs text-gray-400"
          >
            {{ $t('AdminAppsView.noPendingLabel') }}
          </span>
        </button>

        <!-- Expanded: versions -->
        <div v-if="expandedAppId === app.appId" class="border-t border-gray-100 bg-gray-50">

          <!-- Loading approvals -->
          <div v-if="loadingMap[app.appId]" class="flex justify-center py-6">
            <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
          </div>

          <!-- No entries -->
          <div
            v-else-if="!approvalsMap[app.appId] || approvalsMap[app.appId].length === 0"
            class="px-6 py-4 text-sm text-gray-400 italic"
          >
            {{ $t('AdminAppsView.noVersionsSubmitted') }}
          </div>

          <!-- Version table -->
          <div v-else class="px-4 pb-3">
          <table class="w-full text-sm">
            <thead class="border-b border-gray-200">
              <tr>
                <th class="text-left py-2 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">{{ $t('AdminAppsView.colVersion') }}</th>
                <th class="text-left py-2 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">{{ $t('AdminAppsView.colStatus') }}</th>
                <th class="text-left py-2 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">{{ $t('AdminAppsView.colDate') }}</th>
                <th class="text-right py-2 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">{{ $t('AdminAppsView.colActions') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr
                v-for="approval in approvalsMap[app.appId]"
                :key="approval.approvalId"
                class="bg-white hover:bg-gray-50 transition-colors"
              >
                <td class="py-3 px-2">
                  <span class="font-mono text-gray-800 bg-gray-100 px-2 py-0.5 rounded text-xs">
                    {{ approval.version_tag }}
                  </span>
                </td>
                <td class="py-3 px-4">
                  <div class="space-y-1">
                    <AppVersionStatusBadge :status="approval.status" />
                    <p v-if="approval.rejection_reason" class="text-xs text-red-500 italic max-w-xs truncate" :title="approval.rejection_reason">
                      {{ approval.rejection_reason }}
                    </p>
                  </div>
                </td>
                <td class="py-3 px-4 text-gray-500 text-xs">
                  {{ formatDate(approval.created_at) }}
                </td>
                <td class="py-3 px-2">
                  <div class="flex justify-end gap-2">

                    <!-- Pending: Approve + Reject -->
                    <template v-if="approval.status === 'pending'">
                      <button
                        @click="handleApprove(app.appId, app.name, approval.version_tag)"
                        :disabled="actingOn === `${app.appId}:${approval.version_tag}`"
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-200 text-xs font-medium hover:bg-green-100 transition-colors disabled:opacity-50"
                      >
                        <Check :size="13" />
                        {{ $t('AdminAppsView.approveBtn') }}
                      </button>
                      <button
                        @click="openRejectModal(app.appId, app.name, approval.version_tag)"
                        :disabled="actingOn === `${app.appId}:${approval.version_tag}`"
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200 text-xs font-medium hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        <X :size="13" />
                        {{ $t('AdminAppsView.rejectBtn') }}
                      </button>
                    </template>

                    <!-- Approved: Revoke -->
                    <template v-else-if="approval.status === 'approved'">
                      <button
                        @click="handleRevoke(app.appId, approval.version_tag)"
                        :disabled="actingOn === `${app.appId}:${approval.version_tag}`"
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 border border-gray-200 text-xs font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                      >
                        <RotateCcw :size="13" />
                        {{ $t('AdminAppsView.revokeBtn') }}
                      </button>
                    </template>

                    <!-- Rejected: Approve again -->
                    <template v-else-if="approval.status === 'rejected'">
                      <button
                        @click="handleApprove(app.appId, app.name, approval.version_tag)"
                        :disabled="actingOn === `${app.appId}:${approval.version_tag}`"
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 text-green-700 border border-green-200 text-xs font-medium hover:bg-green-100 transition-colors disabled:opacity-50"
                      >
                        <Check :size="13" />
                        {{ $t('AdminAppsView.approveBtn') }}
                      </button>
                    </template>

                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          </div>

        </div>
      </div>
    </div>

    <!-- Reject Modal -->
    <Modal :show="showRejectModal" @close="showRejectModal = false">
      <template #title>{{ $t('AdminAppsView.rejectModal.title') }}</template>
      <div class="space-y-4">
        <p class="text-sm text-gray-600">
          <span class="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-xs">{{ rejectTarget?.versionTag }}</span>
          &nbsp;—&nbsp;{{ rejectTarget?.appName }}
        </p>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">
            {{ $t('AdminAppsView.rejectModal.reasonLabel') }}
          </label>
          <textarea
            v-model="rejectionReason"
            :placeholder="$t('AdminAppsView.rejectModal.reasonPlaceholder')"
            rows="3"
            class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-red-400 focus:border-red-400 outline-none resize-none"
          />
        </div>
        <div class="flex justify-end gap-3">
          <BaseButton variant="yellow" @click="showRejectModal = false" :disabled="isRejecting">
            {{ $t('AdminAppsView.rejectModal.cancel') }}
          </BaseButton>
          <BaseButton
            variant="red"
            @click="handleReject"
            :disabled="!rejectionReason.trim() || isRejecting"
          >
            {{ isRejecting ? '...' : $t('AdminAppsView.rejectModal.submit') }}
          </BaseButton>
        </div>
      </div>
    </Modal>

  </BackCard>
</template>
