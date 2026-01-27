<script lang="ts" setup>
import { CircleArrowLeft, Loader2, Users, Settings, Terminal, Activity, ChevronDown, Trash2, GitBranch, User, Calendar, Clock, Package, AlertCircle, CheckCircle, XCircle } from 'lucide-vue-next'
import BaseButton from '@/components/ui/BaseButton.vue'
import Modal from '@/components/ui/Modal.vue'
import { useRoute, useRouter } from 'vue-router'
import { useDeploymentStore } from '@/stores/deployment.store'
import { useAuthStore } from '@/stores/auth.store'
import { useToastStore } from '@/stores/toast.store'
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { taskApi } from '@/api/task.api'
import type { Task } from '@/types'

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
const showRawLogs = ref(false)

const deploymentId = route.params.id as string

const deployment = computed(() => deploymentStore.currentDeployment)

const canDelete = computed(() => authStore.isTeacherOrAdmin)
const showDeleteModal = ref(false)

onMounted(async () => {
    await deploymentStore.fetchDeploymentById(deploymentId)
    await loadTasks()
})

const loadTasks = async () => {
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

const confirmDelete = async () => {
    if (!deploymentId) return
    try {
        await deploymentStore.deleteDeployment(deploymentId)
        toastStore.addToast({
            type: 'success',
            message: `${t('DeploymentDetailView.deploymentSuccessToast')}`
        })
        router.push({ name: 'deployments.list' })
    } catch (err: any) {
        toastStore.addToast({
            type: 'error',
            message: `${t('DeploymentDetailView.deploymentErrorToast')}: ` + (err.message || 'Unknown error')
        })
    } finally {
        showDeleteModal.value = false
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

                <BaseButton 
                    v-if="canDelete"
                    @click="showDeleteModal = true"
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

        <!-- Latest Task Info -->
        <div class="bg-white rounded-xl border border-gray-200 p-6 shadow-sm" v-if="deployment.latest_task">
            <h2 class="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Activity :size="20" class="text-emerald-600" />
                {{ $t('DeploymentDetailView.deploymentLatestTask') }}
            </h2>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                    <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Type</div>
                    <div class="text-sm font-medium text-gray-900 capitalize">{{ deployment.latest_task.type }}</div>
                </div>
                <div>
                    <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Status</div>
                    <span 
                        class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold border capitalize"
                        :class="getStatusStyles(deployment.latest_task.status).badgeClass">
                        {{ $t(getStatusStyles(deployment.latest_task.status).label) }}
                    </span>
                </div>
                <div>
                    <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Started At</div>
                    <div class="text-sm text-gray-700">{{ formatDate(deployment.latest_task.started_at) }}</div>
                </div>
                <div>
                    <div class="text-xs text-gray-500 uppercase tracking-wide mb-1">Finished At</div>
                    <div class="text-sm text-gray-700">{{ formatDate(deployment.latest_task.finished_at) }}</div>
                </div>
            </div>
        </div>

        <!-- Tasks / Logs Section -->
        <div class="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-3">
                    <div class="p-2 bg-gray-100 rounded-lg">
                        <Terminal :size="20" class="text-gray-600" />
                    </div>
                    <span class="text-lg font-semibold text-gray-900">Tasks & Logs</span>
                    <span v-if="tasks.length > 0" class="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-bold rounded">
                        {{ tasks.length }}
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

                <div v-else-if="tasks.length === 0" class="text-center py-10 text-gray-500">
                    No tasks found
                </div>

                <div v-else class="space-y-2">
                    <div 
                        v-for="task in tasks" 
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

                    <!-- Logs -->
                    <div v-if="selectedTask.logs" class="mb-4">
                        <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <div class="bg-gradient-to-r from-emerald-50 to-green-50 px-4 py-3 border-b border-gray-200">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-2">
                                        <div class="p-1.5 bg-white rounded-md border border-emerald-200">
                                            <Terminal :size="16" class="text-emerald-600" />
                                        </div>
                                        <span class="font-semibold text-gray-900">Logs</span>
                                        <span v-if="typeof selectedTask.logs === 'object' && selectedTask.logs.logs" 
                                              class="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded border border-emerald-200">
                                            {{ selectedTask.logs.logs.length }} entries
                                        </span>
                                    </div>
                                    <button 
                                        @click="showRawLogs = !showRawLogs"
                                        class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors"
                                        :class="showRawLogs 
                                            ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'">
                                        <component :is="showRawLogs ? CheckCircle : Terminal" :size="14" />
                                        {{ showRawLogs ? 'Formatted' : 'Raw JSON' }}
                                    </button>
                                </div>
                            </div>
                            <div class="bg-gray-50 p-4 overflow-y-auto max-h-[500px]">
                                <!-- Raw JSON View -->
                                <div v-if="showRawLogs" class="bg-gray-900 rounded-lg border border-gray-700 p-4">
                                    <pre class="text-green-400 font-mono text-xs leading-relaxed whitespace-pre-wrap">{{ typeof selectedTask.logs === 'object' ? JSON.stringify(selectedTask.logs, null, 2) : selectedTask.logs }}</pre>
                                </div>

                                <!-- Formatted View -->
                                <div v-else>
                                    <!-- Show error if present -->
                                    <div v-if="typeof selectedTask.logs === 'object' && selectedTask.logs.error" 
                                         class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                        <div class="flex items-start gap-2">
                                            <XCircle :size="16" class="text-red-600 mt-0.5 flex-shrink-0" />
                                            <div>
                                                <div class="text-xs font-semibold text-red-800 uppercase tracking-wide mb-1">Error</div>
                                                <div class="text-sm text-red-700 font-medium">{{ selectedTask.logs.error }}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Show log entries -->
                                    <div v-if="typeof selectedTask.logs === 'object' && selectedTask.logs.logs" class="space-y-2">
                                        <div v-for="(log, idx) in selectedTask.logs.logs" :key="idx"
                                             class="bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 hover:shadow-sm transition-all">
                                            <div class="flex items-start gap-3">
                                                <div class="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shadow-sm"
                                                     :class="{
                                                         'bg-blue-100 text-blue-700 ring-2 ring-blue-200': log.level === 'INFO',
                                                         'bg-green-100 text-green-700 ring-2 ring-green-200': log.level === 'SUCCESS',
                                                         'bg-yellow-100 text-yellow-700 ring-2 ring-yellow-200': log.level === 'WARNING',
                                                         'bg-red-100 text-red-700 ring-2 ring-red-200': log.level === 'ERROR',
                                                         'bg-gray-100 text-gray-700 ring-2 ring-gray-200': log.level === 'DEBUG'
                                                     }">
                                                    {{ idx + 1 }}
                                                </div>
                                                <div class="flex-1 min-w-0">
                                                    <!-- Header with Level, Category, Timestamp -->
                                                    <div class="flex items-center gap-2 mb-2 flex-wrap">
                                                        <span class="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide shadow-sm"
                                                              :class="{
                                                                  'bg-blue-100 text-blue-700 border border-blue-200': log.level === 'INFO',
                                                                  'bg-green-100 text-green-700 border border-green-200': log.level === 'SUCCESS',
                                                                  'bg-yellow-100 text-yellow-700 border border-yellow-200': log.level === 'WARNING',
                                                                  'bg-red-100 text-red-700 border border-red-200': log.level === 'ERROR',
                                                                  'bg-gray-100 text-gray-700 border border-gray-200': log.level === 'DEBUG'
                                                              }">
                                                            {{ log.level }}
                                                        </span>
                                                        <span v-if="log.category" 
                                                              class="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                            {{ log.category }}
                                                        </span>
                                                        <span class="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-mono bg-gray-100 text-gray-600 border border-gray-200">
                                                            <Clock :size="12" class="mr-1" />
                                                            {{ log.timestamp }}
                                                        </span>
                                                    </div>
                                                    
                                                    <!-- Message -->
                                                    <div class="text-sm text-gray-800 leading-relaxed mb-3 font-medium">
                                                        {{ log.message }}
                                                    </div>
                                                    
                                                    <!-- Additional Fields Grid -->
                                                    <div v-if="Object.keys(log).length > 4" class="grid grid-cols-1 md:grid-cols-2 gap-2 pt-3 border-t border-gray-100">
                                                        <template v-for="(value, key) in log" :key="key">
                                                            <div v-if="!['timestamp', 'level', 'category', 'message'].includes(key)" 
                                                                 class="bg-gray-50 rounded px-2 py-1.5 border border-gray-200">
                                                                <div class="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mb-0.5">{{ key }}</div>
                                                                <div class="text-xs text-gray-700 font-mono break-all">
                                                                    {{ typeof value === 'object' ? JSON.stringify(value) : value }}
                                                                </div>
                                                            </div>
                                                        </template>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Fallback for string logs -->
                                    <div v-if="typeof selectedTask.logs === 'string'" class="bg-white rounded-lg border border-gray-200 p-4">
                                        <pre class="text-gray-700 font-mono text-xs leading-relaxed whitespace-pre-wrap">{{ selectedTask.logs }}</pre>
                                    </div>
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
                            <div class="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 border-b border-gray-200">
                                <div class="flex items-center gap-2">
                                    <div class="p-1.5 bg-white rounded-md border border-blue-200">
                                        <Settings :size="16" class="text-blue-600" />
                                    </div>
                                    <span class="font-semibold text-gray-900">Terraform State</span>
                                </div>
                            </div>
                            <div class="bg-gray-50 p-4 overflow-y-auto max-h-[400px]">
                                <div class="bg-white rounded-lg border border-gray-200 p-4">
                                    <pre class="text-gray-700 font-mono text-xs leading-relaxed whitespace-pre-wrap">{{ typeof selectedTask.tf_state === 'object' ? JSON.stringify(selectedTask.tf_state, null, 2) : selectedTask.tf_state }}</pre>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Outputs -->
                    <div v-if="selectedTask.outputs">
                        <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
                            <div class="bg-gradient-to-r from-amber-50 to-yellow-50 px-4 py-3 border-b border-gray-200">
                                <div class="flex items-center gap-2">
                                    <div class="p-1.5 bg-white rounded-md border border-amber-200">
                                        <Package :size="16" class="text-amber-600" />
                                    </div>
                                    <span class="font-semibold text-gray-900">Outputs</span>
                                </div>
                            </div>
                            <div class="bg-gray-50 p-4 overflow-y-auto max-h-[400px]">
                                <div class="bg-white rounded-lg border border-gray-200 p-4">
                                    <pre class="text-gray-700 font-mono text-xs leading-relaxed whitespace-pre-wrap">{{ typeof selectedTask.outputs === 'object' ? JSON.stringify(selectedTask.outputs, null, 2) : selectedTask.outputs }}</pre>
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