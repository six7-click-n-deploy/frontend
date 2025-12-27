<script setup lang="ts">
import { BarChart3 } from 'lucide-vue-next'

import BaseButton from '@/components/ui/BaseButton.vue'

import { CircleArrowRight } from 'lucide-vue-next'

</script>

<template>
<!-- Just an example -->
  <!-- Header Row -->
  <div class="flex items-start justify-between mb-12">

    <div>
      <div class="flex items-center gap-6 text-primary mb-3">
        <h1 class="text-5xl font-bold text-gray-900">
          {{ $t('DeploymentsView.title') }}
        </h1>
        <BarChart3 :size="45" />
      </div>

      <p class="text-gray-500 text-xl">
        {{ $t('DeploymentsView.subtitle') }}
      </p>
    </div>

    <!-- Right: Button -->
    <RouterLink :to="{ name: 'deployments.create' }">
      <BaseButton variant="yellow" class="text-2xl h-fit">
        <Plus :size="20" />
        {{ $t('DeploymentsView.newDeployment') }}
      </BaseButton>
    </RouterLink>
  </div>



  <div class="space-y-3">
    <!-- Header -->
    <div class="grid grid-cols-[40px_2fr_2fr_1.5fr_1fr_1.5fr_1.5fr]
           px-6 py-3 text-xl font-semibold text-gray-700
           bg-lightGreen rounded-lg">
      <div></div>
      <div> {{ $t('DeploymentsView.deploymentName') }}</div>
      <div>{{ $t('DeploymentsView.deploymentApp') }}</div>
      <div>{{ $t('DeploymentsView.deploymentStatus') }}</div>
      <div>{{ $t('DeploymentsView.deploymentVM') }}</div>
      <div>{{ $t('DeploymentsView.deploymentCourse') }}</div>
      <div>{{ $t('DeploymentsView.deploymentActivity') }}</div>
    </div>
    <div class="grid grid-cols-[40px_2fr_2fr_1.5fr_1fr_1.5fr_1.5fr]
         items-center px-6 py-4
         bg-ultraLightGreen rounded-lg
         text-lg text-gray-800">
      <!-- Icon -->
      <div>
        <RouterLink :to="{ name: 'deployments.detail' }">
          <button class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-primary/20 transition">
            <CircleArrowRight :size="40" class="text-primary" />
          </button>
        </RouterLink>
      </div>

      <!-- Name -->
      <div class="font-semibold">
        NodeJS-WWI23SEB
      </div>

      <!-- App -->
      <div>
        NodeJS Template v1.2
      </div>

      <!-- Status -->
      <div>
        In Erstellung
      </div>

      <!-- VMs -->
      <div>
        3
      </div>

      <!-- Course -->
      <div>
        WWI23SEB
      </div>

      <!-- Activity -->
      <div class="text-gray-500">
        07.12.2025 09:17
      </div>
    </div>
  </div>
</template>