<script setup lang="ts">
import {
  BarChart3,
  Layers,
  GraduationCap
} from 'lucide-vue-next'
</script>

<template>
  <div class="space-y-12">

    <!-- Header -->
    <div>
      <h1 class="text-3xl font-bold text-gray-900 mb-1">
        {{ $t('DashboardView.title') }}
      </h1>
      <p class="text-gray-500">
        {{ $t('DashboardView.subtitle') }}
      </p>
    </div>

    <!-- Minimal Stats -->
    <div class="grid grid-cols-3 gap-8">

      <!-- Deployments -->
      <div class="bg-white rounded-xl border p-6 flex items-center justify-between">
        <div>
          <div class="text-sm text-gray-500">{{ $t('DashboardView.deployments') }}</div>
          <div class="text-2xl font-semibold text-gray-900">12</div>
        </div>
        <BarChart3 :size="22" class="text-primary" />
      </div>

      <!-- Templates -->
      <div class="bg-white rounded-xl border p-6 flex items-center justify-between">
        <div>
          <div class="text-sm text-gray-500">{{ $t('DashboardView.templates') }}</div>
          <div class="text-2xl font-semibold text-gray-900">7</div>
        </div>
        <Layers :size="22" class="text-primary" />
      </div>

      <!-- Courses -->
      <div class="bg-white rounded-xl border p-6 flex items-center justify-between">
        <div>
          <div class="text-sm text-gray-500">{{ $t('DashboardView.courses') }}</div>
          <div class="text-2xl font-semibold text-gray-900">3</div>
        </div>
        <GraduationCap :size="22" class="text-primary" />
      </div>

    </div>

    <!-- Activity (Minimal) -->
    <div class="bg-white rounded-xl border p-6">
      <div class="text-sm font-semibold text-primary mb-4">
        {{ $t('DashboardView.activity') }}
      </div>

      <ul class="space-y-3 text-sm text-gray-700">
        <li class="flex justify-between border-b pb-2">
          <span>{{ $t('DashboardView.templateUpdated') }}</span>
          <span class="text-gray-400">2 min</span>
        </li>
        <li class="flex justify-between border-b pb-2">
          <span>{{ $t('DashboardView.deploymentCreated') }}</span>
          <span class="text-gray-400">{{ $t('DashboardView.today') }}</span>
        </li>
        <li class="flex justify-between">
          <span>{{ $t('DashboardView.courseEdited') }}</span>
          <span class="text-gray-400">{{ $t('DashboardView.yesterday') }}</span>
        </li>
      </ul>
    </div>

  </div>
</template>
