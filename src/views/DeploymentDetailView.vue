<script lang="ts" setup>
import { CircleArrowRight, CircleArrowLeft, Loader2 } from 'lucide-vue-next'
import BaseButton from '@/components/ui/BaseButton.vue'
import BackCard from '@/components/ui/CardForBG.vue'
import FirstCard from '@/components/ui/Card.vue'
import Modal from '@/components/ui/Modal.vue'
import { useRoute, useRouter } from 'vue-router'
import { useDeploymentStore } from '@/stores/deployment.store'
import { useAppStore } from '@/stores/app.store'
import { useAuthStore } from '@/stores/auth.store'
import { useToastStore } from '@/stores/toast.store'
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const router = useRouter()
const deploymentStore = useDeploymentStore()
const appStore = useAppStore()
const authStore = useAuthStore()
const toastStore = useToastStore()
const { t } = useI18n()

const deploymentId = route.params.id as string

// NEU: Wir binden uns direkt an currentDeployment aus dem Store
const deployment = computed(() => deploymentStore.currentDeployment)

const canDelete = computed(() => authStore.isTeacherOrAdmin)
const showDeleteModal = ref(false)

onMounted(async () => {
    // GEÄNDERT: Wir laden das Deployment mit allen Relationen (User, App, Status)
    await deploymentStore.fetchDeploymentById(deploymentId)
})

// NEU: currentTask referenziert nun das Feld 'latest_task', das vom Backend kommt
const currentTask = computed(() => deployment.value?.latest_task)

// GEÄNDERT: Hilfsfunktion nutzt jetzt direkt die Felder vom Deployment-Objekt
const deploymentTimestamp = computed(() => {
    return deployment.value?.created_at ? formatDate(deployment.value.created_at) : '-'
})

const deploymentCreator = computed(() => {
    // Nutzt die geladene User-Relation
    return deployment.value?.user?.username || deployment.value?.userId || '-'
})

// Status-Styles (direkt basierend auf deployment.status)
const getStatusStyles = (status?: string) => {
    switch (status) {
        case 'success':
            return {
                label: 'DeploymentsView.deploymentSuccessful',
                dotClass: 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]',
                textClass: 'text-gray-900'
            }
        case 'running':
            return {
                label: 'DeploymentsView.deploymentRunning',
                dotClass: 'bg-green-500 animate-pulse shadow-[0_0_12px_rgba(34,197,94,0.6)]',
                textClass: 'text-gray-900'
            }
        case 'pending':
            return {
                label: 'DeploymentsView.deploymentPending',
                dotClass: 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.4)]',
                textClass: 'text-gray-900'
            }
        case 'failed':
            return {
                label: 'DeploymentsView.deploymentFailed',
                dotClass: 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]',
                textClass: 'text-gray-900'
            }
        default:
            return {
                label: 'DeploymentsView.noStatus',
                dotClass: 'bg-gray-300',
                textClass: 'text-gray-400'
            }
    }
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


const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString('de-DE', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    })
}
</script>


<template>


    <!-- Back / Title Bar -->
    <div v-if="deployment">
        <div class="flex items-center gap-4 bg-ultraLightGreen rounded-xl px-6 py-4 mb-5">
            <RouterLink :to="{ name: 'deployments.list' }" class="group">
                <div class="p-1 transition-transform duration-200 group-hover:scale-110 group-active:scale-95">
                    <CircleArrowLeft :size="42"
                        class="text-primary/70 group-hover:text-primary transition-colors filter group-hover:drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.4)]" />
                </div>
            </RouterLink>

            <h2 class="text-2xl font-semibold">
                {{ deployment.name }}
            </h2>

        </div>


        <!-- 🎨 NEUE ANORDNUNG: 3-Spalten-Layout -->
        <BackCard class="mb-8">
            <div class="grid grid-cols-[1fr_1fr_1.5fr] gap-8">

                <!-- LINKE SPALTE: Name, App, Status, Kurs -->
                <div class="space-y-6">
                    <div>
                        <div class="text-gray-500 text-sm mb-1">{{ $t('DeploymentsView.deploymentName') }}</div>
                        <div class="font-semibold text-lg">{{ deployment.name }}</div>
                    </div>

                    <div>
                        <div class="text-gray-500 text-sm mb-1">{{ $t('DeploymentsView.deploymentApp') }}</div>
                        <div class="font-semibold text-lg">{{ deployment.app?.name || '-' }}</div>
                    </div>

                    <div>
                        <div class="text-gray-500 text-sm mb-1">{{ $t('DeploymentsView.deploymentStatus') }}</div>
                        <div v-if="deployment.status" class="flex items-center gap-3">
                            <div
                                :class="['w-3 h-3 rounded-full transition-all duration-700', getStatusStyles(deployment.status).dotClass]">
                            </div>
                            <span :class="['font-semibold', getStatusStyles(deployment.status).textClass]">
                                {{ $t(getStatusStyles(deployment.status).label) }}
                            </span>
                        </div>
                        <div v-else class="flex items-center gap-3 text-gray-300 italic">
                            <Loader2 :size="20" class="animate-spin" />
                            {{ $t('DeploymentDetailView.checkingStatus') }}
                        </div>
                    </div>

                    <div>
                        <div class="text-gray-500 text-sm mb-1">{{ $t('DeploymentsView.deploymentCourse') }}</div>
                        <div class="font-semibold text-lg">-</div>
                    </div>
                </div>

                <!-- MITTLERE SPALTE: Erstellt von & Erstellt am (untereinander) -->
                <div class="space-y-6">
                    <div>
                        <div class="text-gray-500 text-sm mb-1">{{ $t('DeploymentDetailView.deploymentCreatedBy') }}
                        </div>
                        <div class="font-semibold text-lg flex items-center gap-2">
                            <div v-if="deploymentCreator !== '-'"
                                class="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] text-primary font-bold">
                                {{ deploymentCreator.substring(0, 2).toUpperCase() }}
                            </div>
                            <span>{{ deploymentCreator }}</span>
                        </div>
                    </div>

                    <div>
                        <div class="text-gray-500 text-sm mb-1">{{ $t('DeploymentDetailView.deploymentCreated') }}</div>
                        <div class="font-semibold text-lg">
                            {{ deploymentTimestamp }}
                        </div>
                    </div>
                </div>

                <!-- RECHTE SPALTE: VMs -->
                <div>
                    <div class="text-gray-500 text-sm mb-3">{{ $t('DeploymentsView.deploymentVM') }}</div>

                    <div class="space-y-2">
                        <div v-for="vm in 3" :key="vm" class="grid grid-cols-[32px_1fr_1fr_1fr] items-center gap-4
                                   bg-ultraLightGreen rounded-lg px-4 py-2">
                            <div class="w-7 h-7 rounded-full flex items-center justify-center">
                                <CircleArrowRight :size="40" class="text-primary" />
                            </div>
                            <div class="font-medium">VM{{ vm }}</div>
                            <div class="text-gray-600">Gruppe {{ vm }}</div>
                            <div class="text-gray-600">4vCPU / 8GB</div>
                        </div>
                    </div>
                </div>

            </div>
        </BackCard>

        <!-- Delete Button -->
        <div class="flex justify-end" v-if="canDelete">
            <BaseButton variant="red" class="px-6 py-2 rounded-full" @click="showDeleteModal = true">
                {{ $t('DeploymentDetailView.deploymentDelete') }}
            </BaseButton>
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

</template>
