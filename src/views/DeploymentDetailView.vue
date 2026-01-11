<script lang="ts" setup>
import { CircleArrowRight, CircleArrowLeft } from 'lucide-vue-next'
import BaseButton from '@/components/ui/BaseButton.vue'
import Modal from '@/components/ui/Modal.vue'
import { useRoute, useRouter } from 'vue-router'
import { useDeploymentStore } from '@/stores/deployment.store'
import { useAppStore } from '@/stores/app.store'
import { useAuthStore } from '@/stores/auth.store'
import { useToastStore } from '@/stores/toast.store'
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'

const route = useRoute()
const router = useRouter()
const deploymentStore = useDeploymentStore()
const appStore = useAppStore()
const authStore = useAuthStore()
const toastStore = useToastStore()
const { t } = useI18n()

const deploymentId = route.params.id as string
const deployment = computed(() =>
    deploymentStore.deployments.find(d => d.deploymentId === deploymentId)
)

const canDelete = computed(() => authStore.isTeacherOrAdmin)
const showDeleteModal = ref(false) // Modal anzeigen

const getAppName = (appId: string) => {
    const app = appStore.apps.find(a => a.appId === appId)
    return app ? app.name : '-'
}

// Funktion zum Löschen
const confirmDelete = async () => {
    if (!deploymentId) return
    try {
        await deploymentStore.deleteDeployment(deploymentId)
        // Toast anzeigen
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

</script>


<template>

    <!-- Back / Title Bar -->
    <div v-if="deployment">
        <div class="flex items-center gap-4 bg-lightGreen rounded-xl px-6 py-4 mb-5">
            <RouterLink :to="{ name: 'deployments.list' }">
                <button class="w-12 h-12 rounded-full flex items-center justify-center hover:bg-primary/20 transition">
                    <CircleArrowLeft :size="80" class="text-primary" />
                </button>
            </RouterLink>

            <h2 class="text-2xl font-semibold">
                {{ deployment.name }}
            </h2>

        </div>

        <!-- Main Card -->
        <div class="bg-ultraLightGreen rounded-2xl p-8 mb-10">

            <div class="grid grid-cols-2 gap-12">

                <!-- Left Info -->
                <div class="space-y-6 text-base">

                    <div class="flex gap-12">
                        <div>
                            <div class="text-gray-500">{{ $t('DeploymentsView.deploymentName') }}</div>
                            <div class="font-semibold">{{ deployment.name }}</div>
                        </div>

                        <div>
                            <div class="text-gray-500">{{ $t('DeploymentDetailView.deploymentCreated') }}</div>
                            <div class="font-semibold">-</div>
                        </div>
                    </div>

                    <div>
                        <div class="text-gray-500">{{ $t('DeploymentsView.deploymentApp') }}</div>
                        <div class="font-semibold">{{ getAppName(deployment.appId) }}</div>
                    </div>

                    <div class="flex items-center gap-2">
                        <span class="text-gray-500">{{ $t('DeploymentsView.deploymentStatus') }}</span>
                        <span class="font-semibold"> {{ deployment.status }}</span>
                        <span :class="{
                            'w-2 h-2 rounded-full bg-yellow-500': deployment.status === 'pending',
                            'w-2 h-2 rounded-full bg-green-600': deployment.status === 'running' || deployment.status === 'success',
                            'w-2 h-2 rounded-full bg-red-500': deployment.status === 'failed'
                        }"></span>
                    </div>

                    <div>
                        <div class="text-gray-500">{{ $t('DeploymentsView.deploymentCourse') }}</div>
                        <div class="font-semibold">-</div>
                    </div>

                </div>

                <!-- Right Info -->
                <div class="space-y-4 text-base">

                    <div>
                        <div class="text-gray-500">{{ $t('DeploymentsView.deploymentVM') }}</div>
                        <div class="font-semibold">-</div>
                    </div>

                    <!-- VM List -->
                    <div class="space-y-2">
                        <div v-for="vm in 3" :key="vm" class="grid grid-cols-[32px_1fr_1fr_1fr]
                     items-center gap-4
                     bg-lightGreen rounded-lg px-4 py-2">
                            <div class="w-7 h-7 rounded-full 
                       flex items-center justify-center">
                                <CircleArrowRight :size="40" class="text-primary" />
                            </div>

                            <div>VM{{ vm }}</div>
                            <div>Gruppe {{ vm }}</div>
                            <div>4vCPU / 8GB</div>
                        </div>
                    </div>

                </div>
            </div>
        </div>

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