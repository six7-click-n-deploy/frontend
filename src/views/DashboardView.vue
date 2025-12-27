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
      <h1 class="text-5xl font-bold text-gray-900 mb-3">
        {{ $t('DashboardView.title') }}
      </h1>
      <p class="text-xl text-gray-500">
        {{ $t('DashboardView.subtitle') }}
      </p>
    </div>

    <!-- Minimal Stats -->
    <div class="grid grid-cols-3 gap-8">

      <!-- Deployments -->
      <div class="bg-white rounded-xl border p-6 flex items-center justify-between">
        <div>
          <div class="text-3xl text-gray-500 font-semibold mb-4">{{ $t('DashboardView.deployments') }}</div>
          <div class="text-4xl font-semibold text-primary">12</div>
           <div class="text-xl text-gray-500 mb-8">{{ $t('DashboardView.deploymentsRunning') }}</div>
          <div class="text-xl text-primary">{{ $t('DashboardView.deploymentsAll') }}</div>
        </div>
        <BarChart3 :size="40" class="text-primary self-start" />
      </div>

      <!-- Apps -->
      <div class="bg-white rounded-xl border p-6 flex items-center justify-between">
        <div>
          <div class="text-3xl text-gray-500 font-semibold mb-4">{{ $t('DashboardView.apps') }}</div>
          <div class="text-4xl font-semibold text-primary">7</div>
           <div class="text-xl text-gray-500 mb-8">{{ $t('DashboardView.appsActive') }}</div>
          <div class="text-xl text-primary">{{ $t('DashboardView.appsAll') }}</div>
        </div>
        <Layers :size="40" class="text-primary self-start" />
      </div>

      <!-- Courses -->
      <div class="bg-white rounded-xl border p-6 flex items-center justify-between">
        <div>
          <div class="text-3xl text-gray-500 font-semibold mb-4">{{ $t('DashboardView.courses') }}</div>
          <div class="text-4xl font-semibold text-primary">3</div>
           <div class="text-xl text-gray-500 mb-8">{{ $t('DashboardView.coursesActive') }}</div>
          <div class="text-xl text-primary">{{ $t('DashboardView.coursesAll') }}</div>
        </div>
        <GraduationCap :size="45" class="text-primary self-start" />
      </div>

    </div>

    <!-- Activity (Minimal) -->
    <div class="bg-white rounded-xl border p-6">
      <div class="text-3xl font-semibold text-primary mb-4">
        {{ $t('DashboardView.activity') }}
      </div>

      <ul class="space-y-3 text-xl text-gray-700">
        <li class="flex justify-between border-b pb-2">
          <span>{{ $t('DashboardView.appUpdated') }}</span>
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
