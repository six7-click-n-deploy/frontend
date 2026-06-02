<script lang="ts" setup>
import { CircleArrowLeft, Loader2, Users, Settings, Terminal, Activity, ChevronDown, Trash2, GitBranch, User, Calendar, Clock, Package, AlertCircle, CheckCircle, XCircle, StopCircle, Flame, Copy, Check, Mail, Send } from 'lucide-vue-next'
import BaseButton from '@/components/ui/BaseButton.vue'
import Modal from '@/components/ui/Modal.vue'
import { useRoute, useRouter } from 'vue-router'
import { useDeploymentStore } from '@/stores/deployment.store'
import { useAuthStore } from '@/stores/auth.store'
import { useToastStore } from '@/stores/toast.store'
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { taskApi } from '@/api/task.api'
import { deploymentApi } from '@/api/deployment.api'
import type { Task } from '@/types'
import { useDeploymentStream } from '@/composables/useDeploymentStream'

const route = useRoute()
const router = useRouter()
const deploymentStore = useDeploymentStore()
const authStore = useAuthStore()
const toastStore = useToastStore()
const { t } = useI18n()
const tasks = ref<Task[]>([])
const loadingTasks = ref(false)
const selectedTask = ref<Task | null>(null)
const loadingTaskDetail = ref(false)

const deploymentId = route.params.id as string

const deployment = computed(() => deploymentStore.currentDeployment)

// Owner-view vs member-view — mirrors backend/app/utils/permissions.py
// ``is_deployment_owner_view``. Drives every gated UI element on
// this page: tasks/logs sections, terraform-state/outputs blocks,
// the Delete button, the SSE live-stream connection, and the
// resend-credentials buttons of *other* members in the same team.
//
// We trust the backend on the source-of-truth side (it returns 403
// or filters data when the caller isn't owner-view); this computed
// just hides the affordances so the user doesn't see buttons that
// would 403 on click.
const isOwnerView = computed(() => {
    if (authStore.isTeacherOrAdmin) return true
    const ownerId = deployment.value?.userId
    return !!ownerId && String(ownerId) === String(authStore.userId)
})

// Lifecycle action gating — a single ``Delete`` button. The backend
// picks the right behaviour (terraform destroy + soft-delete vs.
// straight soft-delete) based on status, so the frontend just
// surfaces availability. Mirrors backend/app/routers/deployments.py
// DELETE handler:
//   * success / failed   → backend dispatches Destroy task
//   * cancelled          → backend soft-deletes immediately
//   * pending / running / destroying → 409, button disabled
//
// Members can never delete; the action-bar hides the button entirely
// for them rather than rendering a permanently-disabled control.
const DELETE_STATUSES = ['success', 'failed', 'cancelled']

const canDelete = computed(() => {
    if (!isOwnerView.value) return false
    return DELETE_STATUSES.includes(deployment.value?.status ?? '')
})

const deleteDisabledReason = computed(() => {
    if (canDelete.value) return ''
    return `Delete available when status is ${DELETE_STATUSES.join(', ')}`
})

const showDeleteModal = ref(false)

onMounted(async () => {
    await deploymentStore.fetchDeploymentById(deploymentId)
    await loadTasks()
})

const loadTasks = async () => {
    // Members can't read tasks (backend returns 403 for the
    // owner-only endpoint). Skip the call entirely so the network
    // tab stays clean and the UI doesn't briefly flicker a loader
    // for data we'll never receive.
    if (!isOwnerView.value) {
        tasks.value = []
        return
    }
    loadingTasks.value = true
    try {
        const { data } = await taskApi.listByDeployment(deploymentId)
        tasks.value = data
    } catch (err) {
        console.error('Error loading tasks:', err)
    } finally {
        loadingTasks.value = false
    }
}

// ----------------------------------------------------------------
// LIVE STREAM (progress bar + log tail)
// ----------------------------------------------------------------
//
// We attach the SSE stream once we know the deployment ID and keep it
// open until the task reaches a terminal state. The composable
// auto-reconnects on transient errors and exposes ``connectionState``
// for a small status badge.
//
// Refs are destructured out of the composable so Vue's template
// auto-unwrap recognises them as top-level setup bindings — without
// destructuring, ``stream.currentPhase`` in the template would be the
// ref *object*, not the string, and downstream calls like
// ``phase.split(...)`` would crash.
const deploymentIdRef = computed(() => deploymentId)
const {
    progress: streamProgress,
    currentPhase: streamCurrentPhase,
    currentPhaseIndex: streamCurrentPhaseIndex,
    totalPhases: streamTotalPhases,
    liveLogs: streamLiveLogs,
    totalLogCount: streamTotalLogCount,
    connectionState: streamConnectionState,
    start: startStream,
    stop: stopStream,
} = useDeploymentStream(deploymentIdRef)

const activeTask = computed<Task | null>(() => {
    if (!tasks.value.length) return null
    // The "active" task is the one we still expect events from.
    // Fall back to the latest task by created_at if all are terminal —
    // its progress columns may still be useful for context.
    const sorted = [...tasks.value].sort((a, b) => b.created_at.localeCompare(a.created_at))
    return sorted.find((t) => t.status === 'pending' || t.status === 'running') ?? sorted[0]
})

const isStreamRelevant = computed(() => {
    // Members never get the live stream — backend would 403 the SSE
    // endpoint anyway, the gate here just keeps the UI from poking
    // at it. Owners see the stream while there's an active task.
    if (!isOwnerView.value) return false
    return activeTask.value?.status === 'pending' || activeTask.value?.status === 'running'
})

// Tasks that aren't the currently running one. Shown as the history
// list below the active-task card so the running task isn't rendered
// twice (once in the live block, once in the static list).
const historyTasks = computed<Task[]>(() => {
    const active = activeTask.value
    const list = [...tasks.value].sort((a, b) => b.created_at.localeCompare(a.created_at))
    if (!active || !isStreamRelevant.value) return list
    return list.filter((t) => t.taskId !== active.taskId)
})

// Phase stepper — N dots based on the live ``totalPhases`` reported by
// the worker. Phase names live in the worker (different sets for
// deploy/destroy), so the frontend stays task-type-agnostic for the
// dot count. We do keep label tables for the deploy/destroy presets
// here so the stepper renders meaningful labels under each dot when
// the worker's totals match a known shape; an unknown count falls
// back to numbered labels (``1``..``N``) instead of empty space.
//
// Default to a conservative 11-dot view before the first event arrives
// so the layout doesn't jump when the worker first reports its real
// phase count (which could be 8 for deploy-without-packer or 7 for
// destroy).
const DEFAULT_PHASE_COUNT = 11

const PHASE_LABELS_DEPLOY_FULL = [
    'STARTING',
    'OPENSTACK_SETUP',
    'GIT_CLONE',
    'CREDS_MATERIALISE',
    'PACKER_INIT',
    'PACKER_VALIDATE',
    'PACKER_BUILD',
    'TERRAFORM_INIT',
    'TERRAFORM_PLAN',
    'TERRAFORM_APPLY',
    'OUTPUTS_AND_CLEANUP',
] as const

const PHASE_LABELS_DEPLOY_NO_PACKER = [
    'STARTING',
    'OPENSTACK_SETUP',
    'GIT_CLONE',
    'CREDS_MATERIALISE',
    'TERRAFORM_INIT',
    'TERRAFORM_PLAN',
    'TERRAFORM_APPLY',
    'OUTPUTS_AND_CLEANUP',
] as const

const PHASE_LABELS_DESTROY = [
    'STARTING',
    'OPENSTACK_SETUP',
    'GIT_CLONE',
    'CREDS_MATERIALISE',
    'TERRAFORM_INIT',
    'TERRAFORM_DESTROY',
    'CLEANUP',
] as const

const phaseStepCount = computed<number>(() => {
    return streamTotalPhases.value > 0 ? streamTotalPhases.value : DEFAULT_PHASE_COUNT
})

// Return the label for a given 0-based index, picking the right
// table by the live total. Returns the worker phase name if we have
// one; otherwise a numeric fallback so the slot isn't empty (which
// was collapsing the stepper height and clipping the active halo).
const phaseStepLabel = (idx: number): string => {
    const total = phaseStepCount.value
    let table: readonly string[] | null = null
    if (total === PHASE_LABELS_DEPLOY_FULL.length) table = PHASE_LABELS_DEPLOY_FULL
    else if (total === PHASE_LABELS_DEPLOY_NO_PACKER.length) table = PHASE_LABELS_DEPLOY_NO_PACKER
    else if (total === PHASE_LABELS_DESTROY.length) table = PHASE_LABELS_DESTROY
    if (table && idx >= 0 && idx < table.length) {
        return phaseLabel(table[idx])
    }
    return String(idx + 1)
}

// 0-based index of the active dot. Prefer the worker's authoritative
// ``phase_index`` (1-based) from the SSE payload — only fall back to
// rounding ``progress_pct`` if no progress event has arrived yet.
const currentPhaseIndex = computed<number>(() => {
    if (streamCurrentPhaseIndex.value !== null && streamCurrentPhaseIndex.value > 0) {
        return streamCurrentPhaseIndex.value - 1
    }
    if (streamProgress.value === null) return -1
    const total = phaseStepCount.value
    const pct = Math.max(0, Math.min(100, streamProgress.value))
    return Math.max(0, Math.min(total - 1, Math.round((pct / 100) * total) - 1))
})

// Initialise progress bar + stepper from whatever the DB has on the
// latest task — covers the gap between page load and the first SSE
// event. Important when the user opens the detail view *mid-deploy*:
// without a seed they'd see the loader card until the next worker
// progress event, which can be 30s+ during long phases like
// ``terraform apply``.
//
// Only seed from a *live* task. The persisted progress columns of a
// finished deploy would otherwise paint the stepper at 100% / phase
// "OUTPUTS_AND_CLEANUP" right after the user clicks delete, before
// the new destroy task's first progress event arrives.
watch(
    activeTask,
    (task) => {
        if (!task) return
        const live = task.status === 'pending' || task.status === 'running'
        if (!live) return
        if (task.progress_pct != null && streamProgress.value === null) {
            streamProgress.value = task.progress_pct
        }
        if (task.current_phase && streamCurrentPhase.value === null) {
            streamCurrentPhase.value = task.current_phase
            // Approximate the phase index from the persisted percent so
            // the stepper renders meaningfully *before* the first SSE
            // progress event lands. The worker emits the authoritative
            // 1-based ``phase_index`` shortly after; until then this is
            // the same math the worker used to derive the percent in
            // the first place (round(idx/total*100)). Default total is
            // 11 (``streamTotalPhases`` ref); good enough for visual.
            if (task.progress_pct != null && streamCurrentPhaseIndex.value === null) {
                const total = streamTotalPhases.value || DEFAULT_PHASE_COUNT
                streamCurrentPhaseIndex.value = Math.max(
                    1,
                    Math.min(total, Math.round((task.progress_pct / 100) * total)),
                )
            }
        }
    },
    { immediate: true },
)

watch(
    isStreamRelevant,
    (relevant, wasRelevant) => {
        if (relevant && !wasRelevant) {
            startStream()
        } else if (!relevant && wasRelevant) {
            stopStream()
            // Refresh the task list once on completion so the final
            // logs/outputs land in the static rendering below.
            loadTasks()
        }
    },
    { immediate: true },
)

// When the SSE stream signals it has ended (terminal lifecycle event
// from the backend), reload the deployment + tasks so the detail view
// switches from the live progress bar to the static log/output render.
//
// Special case: a successful destroy auto-soft-deletes the deployment
// on the backend, so the detail row disappears. Two ways we detect
// it: (1) the active task we last saw was a DESTROY that just hit a
// terminal status, or (2) the refetch comes back without a current
// deployment (the store's fetchDeploymentById swallows the 404 into
// ``state.error`` instead of throwing, so we can't try/catch — we
// check ``deploymentStore.currentDeployment`` directly after).
watch(streamConnectionState, async (state) => {
    if (state !== 'ended') return

    const wasDestroy = activeTask.value?.type === 'destroy'

    await deploymentStore.fetchDeploymentById(deploymentId)
    await loadTasks()

    // Either the destroy auto-removed the row, or the refetch couldn't
    // find it for some other reason — both mean we should leave.
    const gone = !deploymentStore.currentDeployment
        || deploymentStore.currentDeployment.deploymentId !== deploymentId

    if (wasDestroy || gone) {
        toastStore.addToast({
            type: 'success',
            message: t('DeploymentDetailView.deleteSuccessToast'),
        })
        router.push({ name: 'deployments.list' })
    }
})

onBeforeUnmount(() => {
    stopStream()
})

// Pretty phase label for the progress bar header. Keeps the enum
// naming convention from the worker (UPPER_SNAKE_CASE) but renders
// it human-friendly. Defensive: anything that isn't a non-empty
// string falls back to an empty label so the template never sees a
// non-string slip through (e.g. the brief moment an unwrapped ref
// produced the original ``phase.split is not a function`` crash).
// Pretty-print arbitrary JSON-ish values for the terraform state /
// outputs / raw-logs blocks. The backend persists these as TEXT
// columns, so they arrive as either:
//
//  * a JSON string (terraform state pulled from the pg backend, or the
//    JSON-stringified outputs map),
//  * a real object/array (when the API layer has already parsed it),
//  * a plain non-JSON string (a stack trace, a single error line),
//  * null / undefined when the worker had nothing to record.
//
// The helper unifies those into a 2-space-indented JSON dump when the
// payload parses, and falls back to the raw text otherwise so we never
// clobber a non-JSON string by trying to parse it.
const prettyJson = (value: unknown): string => {
    if (value === null || value === undefined) return ''
    if (typeof value === 'object') {
        try {
            return JSON.stringify(value, null, 2)
        } catch {
            return String(value)
        }
    }
    if (typeof value === 'string') {
        const trimmed = value.trim()
        // Cheap pre-check: only attempt JSON.parse on strings that look
        // like JSON. Saves a try/catch round-trip for ordinary log
        // text and avoids accidentally parsing a bare number or "null"
        // string into something the consumer didn't expect.
        if (
            (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
            (trimmed.startsWith('[') && trimmed.endsWith(']'))
        ) {
            try {
                return JSON.stringify(JSON.parse(trimmed), null, 2)
            } catch {
                return value
            }
        }
        return value
    }
    return String(value)
}

// Copy-to-clipboard state. Each "card" (logs/state/outputs) tags its
// copy button with a unique key; the key of whichever was last
// successfully copied is stored here for ~1.5s so we can flip its
// icon to ✓ as feedback. Multiple cards can share the same state
// because only one can be the "just copied" target at a time.
const copiedKey = ref<string | null>(null)
let copyResetTimer: number | null = null

const copyToClipboard = async (text: string, key: string) => {
    if (!text) return
    try {
        // Modern ``navigator.clipboard`` requires a secure context
        // (https or localhost). Falls back to the legacy
        // ``execCommand('copy')`` so the button still works behind
        // plain http on the dev box.
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text)
        } else {
            const ta = document.createElement('textarea')
            ta.value = text
            ta.style.position = 'fixed'
            ta.style.opacity = '0'
            document.body.appendChild(ta)
            ta.select()
            document.execCommand('copy')
            document.body.removeChild(ta)
        }
        copiedKey.value = key
        if (copyResetTimer !== null) window.clearTimeout(copyResetTimer)
        copyResetTimer = window.setTimeout(() => {
            copiedKey.value = null
            copyResetTimer = null
        }, 1500)
    } catch (err) {
        console.error('Copy failed:', err)
    }
}

const phaseLabel = (phase: unknown): string => {
    if (typeof phase !== 'string' || !phase) return ''
    return phase
        .split('_')
        .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
        .join(' ')
}

// Count of log entries inside ``selectedTask.logs`` for the badge in
// the Logs card header. Logs arrive in three flavours:
//
//  * an object ``{logs: [...], error?: ...}`` — the Failure payload
//    serialised by the worker on a failed deploy
//  * a plain array on the success path (the success result is just
//    ``logs: list[dict]``)
//  * a JSON string when the API serialises one of the above as text
//
// The computed handles all three so the "N entries" pill stays
// accurate regardless of the wire shape; returns null when the count
// can't be determined (e.g. logs is a non-JSON string), in which case
// the badge is hidden.
const logEntryCount = computed<number | null>(() => {
    const raw = selectedTask.value?.logs
    if (raw == null) return null
    let value: unknown = raw
    if (typeof value === 'string') {
        const trimmed = value.trim()
        if (
            (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
            (trimmed.startsWith('[') && trimmed.endsWith(']'))
        ) {
            try {
                value = JSON.parse(trimmed)
            } catch {
                return null
            }
        } else {
            return null
        }
    }
    if (Array.isArray(value)) return value.length
    if (value && typeof value === 'object') {
        const inner = (value as Record<string, unknown>).logs
        if (Array.isArray(inner)) return inner.length
    }
    return null
})


const deploymentTimestamp = computed(() => {
    return deployment.value?.created_at ? formatDate(deployment.value.created_at) : '-'
})

const getStatusStyles = (status?: string) => {
    switch (status) {
        case 'success':
            return {
                label: 'DeploymentsView.deploymentSuccessful',
                dotClass: 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]',
                textClass: 'text-gray-900',
                badgeClass: 'bg-green-100 text-green-800 border-green-300',
                icon: CheckCircle
            }
        case 'running':
            return {
                label: 'DeploymentsView.deploymentRunning',
                dotClass: 'bg-blue-500 animate-pulse shadow-[0_0_12px_rgba(59,130,246,0.6)]',
                textClass: 'text-gray-900',
                badgeClass: 'bg-blue-100 text-blue-800 border-blue-300',
                icon: Loader2
            }
        case 'pending':
            return {
                label: 'DeploymentsView.deploymentPending',
                dotClass: 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.4)]',
                textClass: 'text-gray-900',
                badgeClass: 'bg-yellow-100 text-yellow-800 border-yellow-300',
                icon: Clock
            }
        case 'failed':
            return {
                label: 'DeploymentsView.deploymentFailed',
                dotClass: 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]',
                textClass: 'text-gray-900',
                badgeClass: 'bg-red-100 text-red-800 border-red-300',
                icon: XCircle
            }
        case 'destroying':
            return {
                label: 'DeploymentsView.deploymentDestroying',
                dotClass: 'bg-orange-500 animate-pulse shadow-[0_0_12px_rgba(249,115,22,0.6)]',
                textClass: 'text-gray-900',
                badgeClass: 'bg-orange-100 text-orange-700 border-orange-300',
                icon: Loader2
            }
        case 'cancelled':
            return {
                label: 'DeploymentsView.deploymentCancelled',
                dotClass: 'bg-gray-400',
                textClass: 'text-gray-900',
                badgeClass: 'bg-gray-100 text-gray-700 border-gray-300',
                icon: StopCircle
            }
        case 'destroyed':
            return {
                label: 'DeploymentsView.deploymentDestroyed',
                dotClass: 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.4)]',
                textClass: 'text-gray-900',
                badgeClass: 'bg-orange-100 text-orange-800 border-orange-300',
                icon: Flame
            }
        default:
            return {
                label: 'DeploymentsView.noStatus',
                dotClass: 'bg-gray-300',
                textClass: 'text-gray-400',
                badgeClass: 'bg-gray-100 text-gray-800 border-gray-300',
                icon: AlertCircle
            }
    }
}

const selectedGroup = ref<number | null>(null)

const selectGroup = (groupIndex: number) => {
    selectedGroup.value = groupIndex
}

const deselectGroup = () => {
    selectedGroup.value = null
}

const groups = computed(() => {
    if (!deployment.value?.userInputVar) return []

    try {
        const data = typeof deployment.value.userInputVar === 'string'
            ? JSON.parse(deployment.value.userInputVar)
            : deployment.value.userInputVar
        const groupNames = data.groupNames || []
        const assignments = data.assignments || {}

        return Object.keys(assignments).map((groupIndex, idx) => ({
            index: parseInt(groupIndex),
            name: groupNames[idx] || `Gruppe ${parseInt(groupIndex) + 1}`,
            students: assignments[groupIndex] || []
        }))
    } catch (e) {
        console.error('Error parsing userInputVar:', e)
        return []
    }
})

const currentGroup = computed(() => {
    if (selectedGroup.value === null) return null
    return groups.value[selectedGroup.value] ?? null
})

const deploymentVariables = computed(() => {
    if (!deployment.value?.userInputVar) return {}

    try {
        const data = typeof deployment.value.userInputVar === 'string'
            ? JSON.parse(deployment.value.userInputVar)
            : deployment.value.userInputVar
        return data.variables || {}
    } catch (e) {
        console.error('Error parsing userInputVar:', e)
        return {}
    }
})

const cleanVariableValue = (value?: string) => {
    const str = String(value ?? '')
    let cleaned = str.split('#')[0]?.trim() ?? ''
    cleaned = cleaned.replace(/["']/g, '')
    return cleaned.trim() || '-'
}

// Unified delete handler. The backend's DELETE endpoint returns 202
// when it dispatched a destroy task (live progress to follow) or 204
// when it soft-deleted directly (no resources to clean up). Branch
// on response.status so the UX matches what's actually happening:
//   * 202 → stay on the page, refresh tasks so the live stream
//     attaches to the new DESTROY task; the streamConnectionState
//     watcher routes back to the list when the task completes.
//   * 204 → leave immediately with a success toast.
const confirmDelete = async () => {
    if (!deploymentId) return
    try {
        const response = await deploymentStore.deleteDeployment(deploymentId)
        if (response?.status === 202) {
            // Destroy task dispatched. Reload deployment + tasks so
            // ``activeTask`` flips to the new DESTROY row and the
            // live-progress card swaps in.
            toastStore.addToast({
                type: 'info',
                message: t('DeploymentDetailView.deleteStartedToast'),
            })
            await deploymentStore.fetchDeploymentById(deploymentId)
            await loadTasks()
        } else {
            // 204: nothing to destroy, soft-delete completed
            // synchronously. Row is gone — back to the list.
            toastStore.addToast({
                type: 'success',
                message: t('DeploymentDetailView.deleteSuccessToast'),
            })
            router.push({ name: 'deployments.list' })
        }
    } catch (err: any) {
        toastStore.addToast({
            type: 'error',
            message: `${t('DeploymentDetailView.deleteErrorToast')}: ` + (err.response?.data?.detail || err.message || 'Unknown error')
        })
    } finally {
        showDeleteModal.value = false
    }
}

// Per-user resend-access state. Map ``userId → 'sending' | 'sent' | 'error'``
// so the button can show inline feedback on the row that was clicked
// without forcing a re-render of the whole list. The 'sent' state
// auto-clears after 2s so the user can resend again.
const resendState = ref<Record<string, 'sending' | 'sent' | 'error'>>({})

const resendAccess = async (teamId: string, userId: string) => {
    resendState.value = { ...resendState.value, [userId]: 'sending' }
    try {
        await deploymentApi.resendAccess(deploymentId, teamId, userId)
        resendState.value = { ...resendState.value, [userId]: 'sent' }
        toastStore.addToast({
            type: 'success',
            message: t('DeploymentDetailView.resendAccessSuccess'),
        })
        window.setTimeout(() => {
            const next = { ...resendState.value }
            delete next[userId]
            resendState.value = next
        }, 2000)
    } catch (err: any) {
        resendState.value = { ...resendState.value, [userId]: 'error' }
        // Backend returns ``{detail: {reason: '...'}}``; surface the
        // reason verbatim — the UI doesn't need to localise every
        // possible code, the toast is for the operator.
        const reason = err?.response?.data?.detail?.reason || err?.message || 'unknown'
        toastStore.addToast({
            type: 'error',
            message: `${t('DeploymentDetailView.resendAccessError')}: ${reason}`,
        })
        window.setTimeout(() => {
            const next = { ...resendState.value }
            delete next[userId]
            resendState.value = next
        }, 3000)
    }
}

const formatDate = (dateString?: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString('de-DE', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    })
}

const selectTask = async (task: Task) => {
    loadingTaskDetail.value = true
    try {
        const { data } = await taskApi.getById(task.taskId)
        selectedTask.value = data
    } catch (err) {
        console.error('Error loading task details:', err)
        toastStore.addToast({
            type: 'error',
            message: 'Failed to load task details'
        })
    } finally {
        loadingTaskDetail.value = false
    }
}

const deselectTask = () => {
    selectedTask.value = null
}
</script>


<template>
    <div v-if="deployment" class="space-y-6">
      
        <!-- Header mit Back Button und Status Badge -->
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
                <RouterLink :to="{ name: 'deployments.list' }">
                    <button class="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 transition">
                        <CircleArrowLeft :size="24" class="text-gray-700" />
                    </button>
                </RouterLink>
                
                <div>
                    <h1 class="text-3xl font-bold text-gray-900">{{ deployment.name }}</h1>
                    <p class="text-sm text-gray-500 mt-1">Deployment Details</p>
                </div>
            </div>

            <div class="flex items-center gap-4">
                <div class="flex items-center gap-3">
                    <component 
                        :is="getStatusStyles(deployment.status).icon" 
                        :size="20" 
                        :class="deployment.status === 'success' ? 'text-green-600' : 
                                deployment.status === 'failed' ? 'text-red-600' :
                                deployment.status === 'running' ? 'text-blue-600' : 'text-yellow-600'"
                    />
                    <span 
                        class="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold border capitalize"
                        :class="getStatusStyles(deployment.status).badgeClass">
                        {{ $t(getStatusStyles(deployment.status).label) }}
                    </span>
                </div>

                <!-- Single Delete button. The backend decides whether
                     this triggers a destroy task (live progress to
                     follow) or a straight soft-delete based on status.
                     Hidden entirely for members — they can read the
                     deployment but never tear it down. -->
                <BaseButton
                    v-if="isOwnerView"
                    @click="canDelete && (showDeleteModal = true)"
                    :disabled="!canDelete"
                    :title="deleteDisabledReason"
                    class="flex items-center gap-2 px-4 py-2"
                    variant="red">
                    <Trash2 :size="18" />
                    <span class="font-medium">{{ $t('DeploymentDetailView.deploymentDelete') }}</span>
                </BaseButton>
            </div>
        </div>

        <!-- Main Info Grid mit 3 Cards -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <!-- Deployment Info Card -->
            <div class="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Package :size="20" class="text-primary" />
                    Deployment Info
                </h2>
                <div class="space-y-4">
                    <div>
                        <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">
                            {{ $t('DeploymentsView.deploymentName') }}
                        </div>
                        <div class="text-sm font-medium text-gray-900">{{ deployment.name }}</div>
                    </div>
                    <div>
                        <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Release Tag</div>
                        <div class="text-sm">
                            <span class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-300">
                                <GitBranch :size="12" class="mr-1" />
                                {{ deployment.releaseTag }}
                            </span>
                        </div>
                    </div>
                    <div>
                        <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">
                            {{ $t('DeploymentDetailView.deploymentCreated') }}
                        </div>
                        <div class="text-sm font-medium text-gray-700 flex items-center gap-1">
                            <Calendar :size="14" />
                            {{ deploymentTimestamp }}
                        </div>
                    </div>
                </div>
            </div>

            <!-- App Info Card -->
            <div class="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Package :size="20" class="text-emerald-600" />
                    {{ $t('DeploymentsView.deploymentApp') }}
                </h2>
                <div class="space-y-4" v-if="deployment.app">
                    <div>
                        <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">App Name</div>
                        <div class="text-sm font-medium text-gray-900">{{ deployment.app.name }}</div>
                    </div>
                    <div>
                        <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Description</div>
                        <div class="text-sm text-gray-700">{{ deployment.app.description || 'No description' }}</div>
                    </div>
                    <div>
                        <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Git Repository</div>
                        <a :href="deployment.app.git_link ?? undefined" target="_blank" 
                           class="text-sm text-blue-600 hover:text-blue-800 underline break-all">
                            {{ deployment.app.git_link }}
                        </a>
                    </div>
                </div>
                <div v-else class="text-sm text-gray-500">No app information available</div>
            </div>

            <!-- User Info Card -->
            <div class="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <User :size="20" class="text-blue-600" />
                    Owner
                </h2>
                <div class="space-y-4" v-if="deployment.user">
                    <div>
                        <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Username</div>
                        <div class="text-sm font-medium text-gray-900 flex items-center gap-2">
                            <div class="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] text-primary font-bold">
                                {{ deployment.user.username.substring(0, 2).toUpperCase() }}
                            </div>
                            {{ deployment.user.username }}
                        </div>
                    </div>
                    <div>
                        <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Email</div>
                        <div class="text-sm text-gray-700">{{ deployment.user.email }}</div>
                    </div>
                    <div>
                        <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Role</div>
                        <div class="text-sm">
                            <span class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300 capitalize">
                                {{ deployment.user.role }}
                            </span>
                        </div>
                    </div>
                </div>
                <div v-else class="text-sm text-gray-500">No user information available</div>
            </div>
        </div>

        <!-- Gruppen Section -->
        <div class="bg-white rounded-xl border border-gray-200 p-6 shadow-sm" v-if="groups.length > 0">
            <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users :size="20" class="text-primary" />
                {{ $t('DeploymentDetailView.deploymentGroups') }}
            </h2>
            
            <Transition
                mode="out-in"
                enter-active-class="transition-all duration-200 ease-out"
                enter-from-class="opacity-0 translate-x-2"
                enter-to-class="opacity-100 translate-x-0"
                leave-active-class="transition-all duration-200 ease-out absolute top-0 left-0 right-0"
                leave-from-class="opacity-100 translate-x-0"
                leave-to-class="opacity-0 -translate-x-2"
            >
                <div v-if="currentGroup" 
                     key="detail"
                     class="bg-gray-50 rounded-lg p-4">
                    
                    <button @click="deselectGroup" 
                            class="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors mb-3 group">
                        <CircleArrowLeft :size="20" class="group-hover:-translate-x-1 transition-transform" />
                        <span class="text-sm font-medium">{{ $t('DeploymentDetailView.deploymentGroupsBack') }}</span>
                    </button>

                    <div class="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200">
                        <div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                            <span class="text-primary font-bold text-sm">{{ currentGroup.index + 1 }}</span>
                        </div>
                        <div class="font-semibold text-lg">{{ currentGroup.name }}</div>
                    </div>

                    <div class="space-y-2">
                        <div class="text-xs text-gray-500 uppercase tracking-wide mb-2">
                            {{ $t('DeploymentDetailView.deploymentStudentCount', { n: currentGroup?.students?.length || 0 }, currentGroup?.students?.length || 0) }}
                        </div>
                        <div v-for="(student, idx) in currentGroup.students" 
                             :key="student"
                             class="flex items-center gap-3 bg-white rounded-lg px-3 py-2 border border-gray-200">
                            <div class="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs text-primary font-bold">
                                {{ Number(idx) + 1 }}
                            </div>
                            <span class="font-mono text-sm text-gray-700">{{ student }}</span>
                        </div>
                    </div>
                </div>

                <div v-else 
                     key="overview"
                     class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div v-for="group in groups" :key="group.index" 
                        @click="selectGroup(group.index)"
                        class="bg-gray-50 rounded-lg p-4 cursor-pointer hover:bg-gray-100 transition-colors border border-gray-200 hover:border-primary/30">
                        <div class="flex items-center gap-3 mb-2">
                            <div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                <span class="text-primary font-bold text-sm">{{ group.index + 1 }}</span>
                            </div>
                            <div class="font-semibold">{{ group.name }}</div>
                        </div>
                        <div class="text-sm text-gray-600 ml-11">
                            {{ $t('DeploymentDetailView.deploymentStudentCount', { n: group.students.length }, group.students.length) }}
                        </div>
                    </div>
                </div>
            </Transition>
        </div>

        <!-- Deployment Variables -->
        <div class="bg-white rounded-xl border border-gray-200 p-6 shadow-sm" v-if="Object.keys(deploymentVariables).length > 0">
            <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Settings :size="20" class="text-orange-600" />
                {{ $t('DeploymentDetailView.deploymentConfig') }}
            </h2>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div v-for="(value, key) in deploymentVariables" :key="key" 
                     class="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div class="text-xs text-gray-500 uppercase tracking-wide mb-1 font-mono">{{ key }}</div>
                    <div class="font-medium text-gray-800 break-all text-sm">
                        {{ cleanVariableValue(value) }}
                    </div>
                </div>
            </div>
        </div>

        <!-- Latest task info is shown inline in the Active Task card
             below while the deployment is running, and inline in the
             Tasks & Logs history once it has finished. The previous
             standalone "Latest Task" row was redundant with both. -->

        <!-- Active Task — live progress + log tail for the currently
             running task. Replaces the previous mix of "Latest Task"
             info card + duplicate entry in the Tasks & Logs list. -->
        <div
            v-if="isStreamRelevant && activeTask"
            class="bg-white rounded-xl border border-blue-300 shadow-sm overflow-hidden"
        >
            <!-- Header strip: gradient + live indicator + task type/status -->
            <div class="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-blue-200">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="relative">
                            <div class="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
                            <div class="absolute inset-0 w-2.5 h-2.5 bg-green-500 rounded-full animate-ping"></div>
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <span class="text-sm font-semibold text-gray-900 capitalize">{{ activeTask.type }}</span>
                                <span class="text-xs font-medium text-gray-500">·</span>
                                <span class="text-xs text-gray-600">running since {{ formatDate(activeTask.started_at || activeTask.created_at) }}</span>
                            </div>
                            <div class="text-xs text-gray-500 font-mono mt-0.5">{{ activeTask.taskId }}</div>
                        </div>
                    </div>
                    <span
                        class="text-xs px-2 py-1 rounded-md font-medium"
                        :class="streamConnectionState === 'live'
                            ? 'bg-green-100 text-green-700 border border-green-200'
                            : streamConnectionState === 'reconnecting'
                                ? 'bg-yellow-100 text-yellow-700 border border-yellow-200'
                                : 'bg-gray-100 text-gray-600 border border-gray-200'">
                        {{ streamConnectionState === 'live' ? 'Stream live' : streamConnectionState }}
                    </span>
                </div>
            </div>

            <!-- Body: progress bar + phase stepper + live tail -->
            <div class="p-6 space-y-5">
                <!-- The "Worker is starting up" loader covers the very
                     first seconds of a fresh task, before any phase
                     info is available — neither the SSE stream nor
                     the DB-seeded ``current_phase`` is set yet.
                     ``streamCurrentPhaseIndex`` carries either the
                     authoritative live value or the percent-derived
                     guess from the DB seed, so checking it alone is
                     enough to decide whether to render the stepper. -->
                <template v-if="streamCurrentPhaseIndex === null && !streamCurrentPhase">
                    <div class="flex items-center gap-3 py-6 justify-center text-gray-500">
                        <Loader2 class="animate-spin" :size="20" />
                        <span class="text-sm">Worker is starting up…</span>
                    </div>
                </template>
                <template v-else>
                    <!-- Progress headline -->
                    <div>
                        <div class="flex items-baseline justify-between mb-2">
                            <span class="text-base font-semibold text-gray-900">
                                {{ phaseLabel(streamCurrentPhase) || 'Starting…' }}
                            </span>
                            <span class="text-2xl font-bold text-gray-900 tabular-nums">
                                {{ streamProgress ?? 0 }}<span class="text-sm text-gray-500 font-medium">%</span>
                            </span>
                        </div>
                        <div class="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div
                                class="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-500 ease-out"
                                :style="{ width: (streamProgress ?? 0) + '%' }"
                            ></div>
                        </div>
                    </div>

                    <!-- Phase stepper. Renders ``phaseStepCount`` dots based
                         on the live ``totalPhases``, with labels picked by
                         the live total (matches deploy/destroy presets).
                         Generous ``py-3`` padding prevents the active
                         dot's ``ring-4`` + ``scale-125`` halo from clipping
                         against the parent's bottom edge. -->
                    <div class="flex items-start gap-1.5 overflow-x-auto py-3">
                        <template v-for="idx in phaseStepCount" :key="idx - 1">
                            <div class="flex-shrink-0 flex flex-col items-center gap-2 min-w-[60px]">
                                <div
                                    class="w-2.5 h-2.5 rounded-full transition-all"
                                    :class="(idx - 1) < currentPhaseIndex
                                        ? 'bg-blue-500'
                                        : (idx - 1) === currentPhaseIndex
                                            ? 'bg-blue-500 ring-4 ring-blue-200 scale-125'
                                            : 'bg-gray-200'"
                                ></div>
                                <span
                                    class="text-[10px] uppercase tracking-wide font-medium whitespace-nowrap text-center"
                                    :class="(idx - 1) <= currentPhaseIndex ? 'text-blue-700' : 'text-gray-400'"
                                >
                                    {{ phaseStepLabel(idx - 1) }}
                                </span>
                            </div>
                            <div
                                v-if="(idx - 1) < phaseStepCount - 1"
                                class="flex-1 h-px min-w-[8px] mt-[5px]"
                                :class="(idx - 1) < currentPhaseIndex ? 'bg-blue-300' : 'bg-gray-200'"
                            ></div>
                        </template>
                    </div>
                </template>

                <!-- Live log tail. ``streamTotalLogCount`` keeps
                     growing past the visible buffer (capped at 100
                     lines via the ring buffer in the composable),
                     so the user sees that the worker is still
                     producing output even after the box is full. -->
                <div v-if="streamLiveLogs.length > 0" class="space-y-2">
                    <div class="flex items-center justify-between">
                        <span class="text-xs uppercase tracking-wide font-semibold text-gray-600">Live output</span>
                        <span class="text-xs text-gray-500">
                            {{ streamTotalLogCount.toLocaleString() }} {{ streamTotalLogCount === 1 ? 'line' : 'lines' }}
                            <span v-if="streamLiveLogs.length < streamTotalLogCount" class="text-gray-400">
                                · last {{ streamLiveLogs.length }} shown
                            </span>
                        </span>
                    </div>
                    <div class="bg-gray-900 rounded-md p-3 max-h-72 overflow-y-auto font-mono text-xs">
                        <div
                            v-for="(log, idx) in streamLiveLogs"
                            :key="`${log.timestamp}-${idx}`"
                            class="text-gray-200 whitespace-pre-wrap break-words"
                            :class="{
                                'text-red-400': log.level === 'ERROR',
                                'text-yellow-300': log.level === 'WARNING',
                                'text-green-400': log.level === 'SUCCESS',
                                'text-gray-400': log.streaming,
                            }"
                        >
                            <span class="text-gray-500 mr-2">{{ log.timestamp.split('T')[1]?.slice(0, 8) || '' }}</span>
                            <span v-if="log.tool" class="text-blue-400 mr-1">[{{ log.tool }}]</span>{{ log.message }}
                        </div>
                    </div>
                </div>
                <div v-else class="bg-gray-50 border border-gray-200 rounded-md p-4 text-center text-xs text-gray-500">
                    Waiting for first log line…
                </div>
            </div>
        </div>

        <!-- Teams & Members — list every team configured for this
             deployment with a "Resend access" button per member.
             Renders even when ``deployment.teams`` is empty (just
             shows an empty-state) so the section is consistently
             present and the operator can find it. -->
        <div v-if="deployment.teams && deployment.teams.length > 0"
             class="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div class="flex items-center gap-3 mb-5">
                <div class="p-2 bg-gray-100 rounded-lg">
                    <Users :size="20" class="text-gray-600" />
                </div>
                <span class="text-lg font-semibold text-gray-900">{{ $t('DeploymentDetailView.teamsAndMembers') }}</span>
                <span class="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-bold rounded">
                    {{ deployment.teams.length }}
                </span>
            </div>

            <div class="space-y-4">
                <div v-for="team in deployment.teams" :key="team.teamId"
                     class="border border-gray-200 rounded-lg overflow-hidden">
                    <div class="bg-gray-50 px-4 py-3 flex items-center justify-between border-b border-gray-200">
                        <div class="flex items-center gap-2">
                            <span class="font-semibold text-gray-900">{{ team.name }}</span>
                            <span class="text-xs text-gray-500">·</span>
                            <span class="text-xs text-gray-600">
                                {{ team.members.length }}
                                {{ team.members.length === 1 ? 'member' : 'members' }}
                            </span>
                        </div>
                    </div>
                    <div v-if="team.members.length === 0"
                         class="px-4 py-6 text-center text-sm text-gray-500">
                        No members assigned to this team.
                    </div>
                    <div v-else>
                        <div v-for="member in team.members" :key="member.userId"
                             class="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors">
                            <div class="flex items-center gap-3 min-w-0">
                                <div class="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                                    <User :size="16" />
                                </div>
                                <div class="min-w-0">
                                    <div class="font-medium text-gray-900 truncate">{{ member.username }}</div>
                                    <div class="text-xs text-gray-500 truncate">{{ member.email }}</div>
                                </div>
                            </div>
                            <button
                                v-if="isOwnerView || String(member.userId) === String(authStore.userId)"
                                @click="resendAccess(team.teamId, member.userId)"
                                :disabled="resendState[member.userId] === 'sending'"
                                :title="$t('DeploymentDetailView.resendAccessTooltip')"
                                class="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors"
                                :class="resendState[member.userId] === 'sent'
                                    ? 'bg-green-600 text-white border-green-600'
                                    : resendState[member.userId] === 'error'
                                        ? 'bg-red-50 text-red-700 border-red-300'
                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 disabled:opacity-50'">
                                <Loader2 v-if="resendState[member.userId] === 'sending'" :size="14" class="animate-spin" />
                                <Check v-else-if="resendState[member.userId] === 'sent'" :size="14" />
                                <AlertCircle v-else-if="resendState[member.userId] === 'error'" :size="14" />
                                <Send v-else :size="14" />
                                <span>
                                    {{ resendState[member.userId] === 'sending'
                                        ? $t('DeploymentDetailView.resendAccessSending')
                                        : resendState[member.userId] === 'sent'
                                            ? $t('DeploymentDetailView.resendAccessSent')
                                            : resendState[member.userId] === 'error'
                                                ? $t('DeploymentDetailView.resendAccessRetry')
                                                : $t('DeploymentDetailView.resendAccessButton') }}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Tasks / Logs Section — history of finished tasks. The active
             task (if any) is rendered above in its own card, so the
             list filters it out to avoid double-rendering.
             Only the deployment owner / staff sees the actual task
             contents — members get a placeholder card instead so the
             page layout stays consistent across roles. -->
        <div v-if="!isOwnerView" class="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div class="flex items-center gap-3 mb-3">
                <div class="p-2 bg-gray-100 rounded-lg">
                    <Terminal :size="20" class="text-gray-400" />
                </div>
                <span class="text-lg font-semibold text-gray-700">{{ $t('DeploymentDetailView.tasksAndLogs') }}</span>
            </div>
            <div class="text-sm text-gray-500 flex items-start gap-2 px-2">
                <AlertCircle :size="16" class="text-gray-400 mt-0.5 flex-shrink-0" />
                <span>{{ $t('DeploymentDetailView.tasksOwnerOnly') }}</span>
            </div>
        </div>
        <div v-else class="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-3">
                    <div class="p-2 bg-gray-100 rounded-lg">
                        <Terminal :size="20" class="text-gray-600" />
                    </div>
                    <span class="text-lg font-semibold text-gray-900">
                        {{ isStreamRelevant ? 'Task History' : 'Tasks & Logs' }}
                    </span>
                    <span v-if="historyTasks.length > 0" class="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-bold rounded">
                        {{ historyTasks.length }}
                    </span>
                </div>
                <button
                    v-if="selectedTask"
                    @click="deselectTask"
                    class="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors text-sm">
                    <CircleArrowLeft :size="16" />
                    <span>Back to list</span>
                </button>
            </div>

            <!-- Task List View -->
            <div v-if="!selectedTask">
                <div v-if="loadingTasks" class="flex justify-center py-10">
                    <Loader2 class="animate-spin text-primary" :size="32" />
                </div>

                <div v-else-if="historyTasks.length === 0" class="text-center py-10 text-gray-500">
                    {{ isStreamRelevant ? 'No previous tasks for this deployment.' : 'No tasks found' }}
                </div>

                <div v-else class="space-y-2">
                    <div
                        v-for="task in historyTasks"
                        :key="task.taskId"
                        @click="selectTask(task)"
                        class="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer border border-gray-200 hover:border-primary/30"
                    >
                        <div class="flex items-center gap-4 flex-1">
                            <component 
                                :is="getStatusStyles(task.status).icon" 
                                :size="18" 
                                :class="task.status === 'success' ? 'text-green-600' : 
                                        task.status === 'failed' ? 'text-red-600' :
                                        task.status === 'running' ? 'text-blue-600' : 'text-yellow-600'"
                            />
                            <div class="flex-1">
                                <div class="flex items-center gap-3 mb-1">
                                    <span class="font-medium text-gray-900 capitalize">{{ task.type }}</span>
                                    <span 
                                        class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border capitalize"
                                        :class="getStatusStyles(task.status).badgeClass">
                                        {{ task.status }}
                                    </span>
                                </div>
                                <div class="text-xs text-gray-500">
                                    Created: {{ formatDate(task.created_at) }}
                                </div>
                            </div>
                        </div>
                        <ChevronDown :size="20" class="text-gray-400 transform -rotate-90" />
                    </div>
                </div>
            </div>

            <!-- Task Detail View -->
            <div v-else class="space-y-4">
                <div v-if="loadingTaskDetail" class="flex justify-center py-10">
                    <Loader2 class="animate-spin text-primary" :size="32" />
                </div>

                <div v-else>
                    <div class="bg-gray-50 rounded-lg p-4 border border-gray-200 mb-4">
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div>
                                <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Type</div>
                                <div class="text-sm font-medium text-gray-900 capitalize">{{ selectedTask.type }}</div>
                            </div>
                            <div>
                                <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Status</div>
                                <span 
                                    class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border capitalize"
                                    :class="getStatusStyles(selectedTask.status).badgeClass">
                                    {{ selectedTask.status }}
                                </span>
                            </div>
                            <div>
                                <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Started</div>
                                <div class="text-sm text-gray-700">{{ formatDate(selectedTask.started_at) }}</div>
                            </div>
                            <div>
                                <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Finished</div>
                                <div class="text-sm text-gray-700">{{ formatDate(selectedTask.finished_at) }}</div>
                            </div>
                        </div>
                        
                        <div class="grid grid-cols-1 gap-3">
                            <div>
                                <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Task ID</div>
                                <div class="text-xs font-mono text-gray-700 bg-white px-2 py-1 rounded">{{ selectedTask.taskId }}</div>
                            </div>
                            <div>
                                <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Celery Task ID</div>
                                <div class="text-xs font-mono text-gray-700 bg-white px-2 py-1 rounded">{{ selectedTask.celeryTaskId }}</div>
                            </div>
                            <div>
                                <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Created At</div>
                                <div class="text-sm text-gray-700">{{ formatDate(selectedTask.created_at) }}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Logs — same simple ``<pre>`` rendering as the
                         Terraform State and Outputs blocks below. The
                         previous formatted/raw toggle plus numbered
                         entry cards added a lot of UI surface for
                         little extra information; pretty-printed JSON
                         is uniform and lets the browser handle search
                         (Cmd+F) consistently across all three blocks. -->
                    <div v-if="selectedTask.logs" class="mb-4">
                        <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <div class="bg-gradient-to-r from-emerald-50 to-green-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                                <div class="flex items-center gap-2">
                                    <div class="p-1.5 bg-white rounded-md border border-emerald-200">
                                        <Terminal :size="16" class="text-emerald-600" />
                                    </div>
                                    <span class="font-semibold text-gray-900">Logs</span>
                                    <span v-if="logEntryCount !== null"
                                          class="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded border border-emerald-200">
                                        {{ logEntryCount }} entries
                                    </span>
                                </div>
                                <button
                                    @click="copyToClipboard(prettyJson(selectedTask.logs), 'logs')"
                                    :title="copiedKey === 'logs' ? 'Copied!' : 'Copy to clipboard'"
                                    class="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors"
                                    :class="copiedKey === 'logs'
                                        ? 'bg-emerald-600 text-white border-emerald-600'
                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'">
                                    <component :is="copiedKey === 'logs' ? Check : Copy" :size="13" />
                                    {{ copiedKey === 'logs' ? 'Copied' : 'Copy' }}
                                </button>
                            </div>
                            <div class="bg-gray-50 p-4 overflow-y-auto max-h-[500px]">
                                <div class="bg-white rounded-lg border border-gray-200 p-4">
                                    <pre class="text-gray-700 font-mono text-xs leading-relaxed whitespace-pre-wrap">{{ prettyJson(selectedTask.logs) }}</pre>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div v-else class="mb-4">
                        <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <div class="bg-gray-50 px-4 py-3 border-b border-gray-200">
                                <div class="flex items-center gap-2">
                                    <Terminal :size="16" class="text-gray-400" />
                                    <span class="font-semibold text-gray-700">Logs</span>
                                </div>
                            </div>
                            <div class="text-center py-8 text-gray-500">
                                <Terminal :size="32" class="mx-auto mb-2 text-gray-300" />
                                <p class="text-sm">No logs available for this task</p>
                            </div>
                        </div>
                    </div>

                    <!-- Terraform State -->
                    <div v-if="selectedTask.tf_state" class="mb-4">
                        <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <div class="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                                <div class="flex items-center gap-2">
                                    <div class="p-1.5 bg-white rounded-md border border-blue-200">
                                        <Settings :size="16" class="text-blue-600" />
                                    </div>
                                    <span class="font-semibold text-gray-900">Terraform State</span>
                                </div>
                                <button
                                    @click="copyToClipboard(prettyJson(selectedTask.tf_state), 'tf_state')"
                                    :title="copiedKey === 'tf_state' ? 'Copied!' : 'Copy to clipboard'"
                                    class="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors"
                                    :class="copiedKey === 'tf_state'
                                        ? 'bg-blue-600 text-white border-blue-600'
                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'">
                                    <component :is="copiedKey === 'tf_state' ? Check : Copy" :size="13" />
                                    {{ copiedKey === 'tf_state' ? 'Copied' : 'Copy' }}
                                </button>
                            </div>
                            <div class="bg-gray-50 p-4 overflow-y-auto max-h-[400px]">
                                <div class="bg-white rounded-lg border border-gray-200 p-4">
                                    <pre class="text-gray-700 font-mono text-xs leading-relaxed whitespace-pre-wrap">{{ prettyJson(selectedTask.tf_state) }}</pre>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Outputs -->
                    <div v-if="selectedTask.outputs">
                        <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <div class="bg-gradient-to-r from-amber-50 to-yellow-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                                <div class="flex items-center gap-2">
                                    <div class="p-1.5 bg-white rounded-md border border-amber-200">
                                        <Package :size="16" class="text-amber-600" />
                                    </div>
                                    <span class="font-semibold text-gray-900">Outputs</span>
                                </div>
                                <button
                                    @click="copyToClipboard(prettyJson(selectedTask.outputs), 'outputs')"
                                    :title="copiedKey === 'outputs' ? 'Copied!' : 'Copy to clipboard'"
                                    class="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border transition-colors"
                                    :class="copiedKey === 'outputs'
                                        ? 'bg-amber-600 text-white border-amber-600'
                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'">
                                    <component :is="copiedKey === 'outputs' ? Check : Copy" :size="13" />
                                    {{ copiedKey === 'outputs' ? 'Copied' : 'Copy' }}
                                </button>
                            </div>
                            <div class="bg-gray-50 p-4 overflow-y-auto max-h-[400px]">
                                <div class="bg-white rounded-lg border border-gray-200 p-4">
                                    <pre class="text-gray-700 font-mono text-xs leading-relaxed whitespace-pre-wrap">{{ prettyJson(selectedTask.outputs) }}</pre>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Delete Confirmation Modal -->
        <Modal :show="showDeleteModal" @close="showDeleteModal = false">
            <template #title>
                {{ $t('DeploymentDetailView.confirmDeleteTitle') }}
            </template>
            <div class="space-y-4">
                <p v-html="$t('DeploymentDetailView.confirmDeleteMessage', { name: deployment.name })"></p>
                <div class="flex justify-end gap-4">
                    <BaseButton variant="yellow" @click="showDeleteModal = false">
                        {{ $t('DeploymentDetailView.cancelButton') }}
                    </BaseButton>
                    <BaseButton variant="red" @click="confirmDelete">
                        {{ $t('DeploymentDetailView.confirmButton') }}
                    </BaseButton>
                </div>
            </div>
        </Modal>
    </div>

    <!-- Loading State -->
    <div v-else class="flex items-center justify-center py-20">
        <Loader2 class="animate-spin text-primary" :size="40" />
    </div>
</template>