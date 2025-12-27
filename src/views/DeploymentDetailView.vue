<script lang="ts" setup>
import { CircleArrowRight, CircleArrowLeft } from 'lucide-vue-next'
import BaseButton from '@/components/ui/BaseButton.vue'
</script>

<template>
<!-- Just an Example -->
    <!-- Back / Title Bar -->
    <div class="flex items-center gap-4 bg-lightGreen rounded-xl px-6 py-4 mb-5">
        <RouterLink :to="{ name: 'deployments.list' }">
            <button class="w-12 h-12 rounded-full flex items-center justify-center hover:bg-primary/20 transition">
                <CircleArrowLeft :size="80" class="text-primary" />
            </button>
        </RouterLink>

        <h2 class="text-2xl font-semibold">
            NodeJS-WWI23SEB
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
                        <div class="font-semibold">NodeJS-WWI23SEB</div>
                    </div>

                    <div>
                        <div class="text-gray-500">{{ $t('DeploymentDetailView.deploymentCreated') }}</div>
                        <div class="font-semibold">07.11.2025</div>
                    </div>
                </div>

                <div>
                    <div class="text-gray-500">{{ $t('DeploymentsView.deploymentApp') }}</div>
                    <div class="font-semibold">NodeJS Template v1.2</div>
                </div>

                <div class="flex items-center gap-2">
                    <span class="text-gray-500">{{ $t('DeploymentsView.deploymentStatus') }}</span>
                    <span class="font-semibold">Läuft</span>
                    <span class="w-2 h-2 rounded-full bg-green-600"></span>
                </div>

                <div>
                    <div class="text-gray-500">{{ $t('DeploymentsView.deploymentCourse') }}</div>
                    <div class="font-semibold">WWI23SEB</div>
                </div>

            </div>

            <!-- Right Info -->
            <div class="space-y-4 text-base">

                <div>
                    <div class="text-gray-500">{{ $t('DeploymentsView.deploymentVM') }}</div>
                    <div class="font-semibold">3 VMs</div>
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

    <!-- Delete -->
    <div class="flex justify-end">
        <BaseButton variant="red" class="px-6 py-2 rounded-full">
            {{ $t('DeploymentDetailView.deploymentDelete') }}
        </BaseButton>
    </div>


</template>