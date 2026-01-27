<script setup lang="ts">
import { onMounted } from 'vue'
import {
  BarChart3,
  Layers,
  GraduationCap,
  Clock
} from 'lucide-vue-next'

import { useDashboard } from '@/composables/useDashboard'
import { useQuotas } from '@/composables/useQuotas'

// Composables
const { stats, fetchStats } = useDashboard()
const { formattedQuotas, loading: quotasLoading, fetchQuotas, getColorClass } = useQuotas()

onMounted(() => {
  fetchStats()
  fetchQuotas()
})
</script>

<template>
  <div class="relative z-10 space-y-8">
    <!-- Header -->
    <div class="space-y-2">
      <h1 class="text-5xl font-bold text-gray-900 mb-3">
        {{ $t('DashboardView.title') }}
      </h1>
      <p class="text-lg text-gray-500">
        {{ $t('DashboardView.subtitle') }}
      </p>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Deployments Card -->
      <div
        class="group relative bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
        <div
          class="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        </div>

        <div class="relative">
          <div class="flex items-start justify-between mb-4">
            <div class="space-y-1">
              <p class="text-2xl font-semibold text-primary">{{ $t('DashboardView.deployments') }}</p>
            </div>
            <div class="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors duration-300">
              <BarChart3 :size="28" class="text-primary" />
            </div>
          </div>

          <div class="flex items-center mb-2">
            <p class="text-4xl font-bold text-gray-900">{{ stats.deployments }}</p>
          </div>
          <p class="text-sm text-gray-600 mb-4">{{ $t('DashboardView.deploymentsRunning') }}</p>

          <div class="pt-4 border-t border-gray-100">
            <RouterLink :to="{ name: 'deployments.list' }"
              class="text-sm font-medium text-primary hover:text-primary/80 transition-colors inline-block">
              {{ $t('DashboardView.deploymentsAll') }} →
            </RouterLink>
          </div>
        </div>
      </div>

      <!-- Apps Card -->
      <div
        class="group relative bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
        <div
          class="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        </div>

        <div class="relative">
          <div class="flex items-start justify-between mb-4">
            <div class="space-y-1">
              <p class="text-2xl font-semibold text-primary">{{ $t('DashboardView.apps') }}</p>
            </div>
            <div class="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors duration-300">
              <Layers :size="28" class="text-primary" />
            </div>
          </div>

          <div class="flex items-center mb-2">
            <p class="text-4xl font-bold text-gray-900">{{ stats.apps }}</p>
          </div>
          <p class="text-sm text-gray-600 mb-4">{{ $t('DashboardView.appsActive') }}</p>

          <div class="pt-4 border-t border-gray-100">
            <RouterLink to="/apps"
              class="text-sm font-medium text-primary hover:text-primary/80 transition-colors inline-block">
              {{ $t('DashboardView.appsAll') }} →
            </RouterLink>
          </div>
        </div>
      </div>

      <!-- Courses Card -->
      <div
        class="group relative bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
        <div
          class="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        </div>

        <div class="relative">
          <div class="flex items-start justify-between mb-4">
            <div class="space-y-1">
              <p class="text-2xl font-semibold text-primary">{{ $t('DashboardView.courses') }}</p>
            </div>
            <div class="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors duration-300">
              <GraduationCap :size="28" class="text-primary" />
            </div>
          </div>

          <div class="flex items-center mb-2">
            <p class="text-4xl font-bold text-gray-900">{{ stats.courses }}</p>
          </div>
          <p class="text-sm text-gray-600 mb-4">{{ $t('DashboardView.coursesActive') }}</p>

          <div class="pt-4 border-t border-gray-100">
            <RouterLink to="/courses"
              class="text-sm font-medium text-primary hover:text-primary/80 transition-colors inline-block">
              {{ $t('DashboardView.coursesAll') }} →
            </RouterLink>
          </div>
        </div>
      </div>
    </div>

    <!-- Activity & Resources Section -->
    <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
      <!-- Activity Section -->
      <div class="lg:col-span-3 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-semibold text-gray-900">
            {{ $t('DashboardView.activity') }}
          </h2>
          <button class="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
            Alle anzeigen →
          </button>
        </div>

        <div class="space-y-4">
          <div class="group flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors duration-200">
            <div class="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
              <Layers :size="20" class="text-primary" />
            </div>
            <div class="flex-1">
              <p class="font-medium text-gray-900">{{ $t('DashboardView.appUpdated') }}</p>
              <p class="text-sm text-gray-500">NodeJS App v1.2 wurde aktualisiert</p>
            </div>
            <div class="flex items-center gap-2 text-sm text-gray-500">
              <Clock :size="16" />
              <span>2 min</span>
            </div>
          </div>

          <div class="group flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors duration-200">
            <div class="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
              <BarChart3 :size="20" class="text-primary" />
            </div>
            <div class="flex-1">
              <p class="font-medium text-gray-900">{{ $t('DashboardView.deploymentCreated') }}</p>
              <p class="text-sm text-gray-500">NodeJS-WWI23SEB wurde erstellt</p>
            </div>
            <div class="flex items-center gap-2 text-sm text-gray-500">
              <Clock :size="16" />
              <span>{{ $t('DashboardView.today') }}</span>
            </div>
          </div>

          <div class="group flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors duration-200">
            <div class="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
              <GraduationCap :size="20" class="text-primary" />
            </div>
            <div class="flex-1">
              <p class="font-medium text-gray-900">{{ $t('DashboardView.courseEdited') }}</p>
              <p class="text-sm text-gray-500">Kubernetes Grundlagen bearbeitet</p>
            </div>
            <div class="flex items-center gap-2 text-sm text-gray-500">
              <Clock :size="16" />
              <span>{{ $t('DashboardView.yesterday') }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- OpenStack Resources Section -->
      <div class="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        <div class="mb-6">
          <h2 class="text-xl font-semibold text-gray-900">
            OpenStack Ressourcen
          </h2>
        </div>

        <!-- Loading State -->
        <div v-if="quotasLoading" class="space-y-6">
          <div v-for="i in 3" :key="i" class="animate-pulse">
            <div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div class="h-4 bg-gray-200 rounded-full"></div>
          </div>
        </div>

        <!-- Quota Data -->
        <div v-else-if="formattedQuotas.length > 0" class="space-y-5">
          <div v-for="quota in formattedQuotas" :key="quota.label">
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <component :is="quota.icon" :size="18" class="text-gray-600" />
                <span class="text-base font-semibold text-gray-900">{{ quota.label }}</span>
              </div>
              <span class="text-base font-bold text-gray-900">
                {{ quota.used }}/{{ quota.limit }}{{ quota.unit }}
              </span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div 
                :class="getColorClass(quota.percentage)"
                class="h-3 rounded-full transition-all duration-500"
                :style="{ width: `${quota.percentage}%` }"
              ></div>
            </div>
            <p class="text-sm text-gray-500 mt-1">{{ quota.percentage }}% ausgelastet</p>
          </div>
        </div>

        <!-- Error State -->
        <div v-else class="text-center py-8">
          <p class="text-gray-500">Quota-Daten konnten nicht geladen werden</p>
        </div>
      </div>
    </div>
  </div>
</template>
