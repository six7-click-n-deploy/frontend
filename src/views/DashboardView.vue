<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth.store'
import { useCourseStore } from '@/stores/course.store'
import { useAppStore } from '@/stores/app.store'
import { useDeploymentStore } from '@/stores/deployment.store'
import { UserRole } from '@/types'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'

const authStore = useAuthStore()
const courseStore = useCourseStore()
const appStore = useAppStore()
const deploymentStore = useDeploymentStore()

const isStudent = computed(() => authStore.hasRole(UserRole.STUDENT))
const isTeacher = computed(() => authStore.hasRole(UserRole.TEACHER))
const isAdmin = computed(() => authStore.hasRole(UserRole.ADMIN))

const stats = computed(() => {
  if (isAdmin.value) {
    return [
      { label: 'Kurse', value: courseStore.courses.length, color: 'blue' },
      { label: 'Apps', value: appStore.apps.length, color: 'green' },
      { label: 'Deployments', value: deploymentStore.deployments.length, color: 'purple' },
    ]
  } else if (isTeacher.value) {
    return [
      { label: 'Meine Kurse', value: courseStore.courses.length, color: 'blue' },
      { label: 'Apps', value: appStore.apps.length, color: 'green' },
    ]
  } else {
    return [
      { label: 'Meine Apps', value: appStore.apps.length, color: 'green' },
      { label: 'Deployments', value: deploymentStore.deployments.length, color: 'purple' },
    ]
  }
})

const recentDeployments = computed(() => {
  return deploymentStore.deployments
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
})

onMounted(async () => {
  try {
    if (isAdmin.value || isTeacher.value) {
      await courseStore.fetchCourses()
    }
    await appStore.fetchApps()
    await deploymentStore.fetchDeployments()
  } catch (error) {
    console.error('Failed to load dashboard data:', error)
  }
})
</script>

<template>
  <div class="p-6">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">
        Willkommen, {{ authStore.user?.username }}!
      </h1>
      <p class="text-gray-600">
        <Badge v-if="isAdmin" variant="purple">Administrator</Badge>
        <Badge v-else-if="isTeacher" variant="blue">Lehrer</Badge>
        <Badge v-else variant="green">Student</Badge>
      </p>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <Card v-for="stat in stats" :key="stat.label">
        <div class="text-center">
          <p class="text-sm text-gray-600 mb-1">{{ stat.label }}</p>
          <p :class="[
            'text-4xl font-bold',
            stat.color === 'blue' && 'text-blue-600',
            stat.color === 'green' && 'text-green-600',
            stat.color === 'purple' && 'text-purple-600',
          ]">
            {{ stat.value }}
          </p>
        </div>
      </Card>
    </div>

    <!-- Recent Deployments -->
    <Card>
      <h2 class="text-xl font-semibold text-gray-900 mb-4">
        Neueste Deployments
      </h2>
      
      <div v-if="deploymentStore.isLoading" class="text-center py-8">
        <p class="text-gray-500">Lädt...</p>
      </div>

      <div v-else-if="recentDeployments.length === 0" class="text-center py-8">
        <p class="text-gray-500">Noch keine Deployments vorhanden</p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="deployment in recentDeployments"
          :key="deployment.deploymentId"
          class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
        >
          <div>
            <p class="font-medium text-gray-900">{{ deployment.appId }}</p>
            <p class="text-sm text-gray-500">
              {{ new Date(deployment.createdAt).toLocaleDateString('de-DE') }}
            </p>
          </div>
          <Badge 
            :variant="deployment.status === 'RUNNING' ? 'green' : 
                     deployment.status === 'STOPPED' ? 'gray' : 
                     deployment.status === 'FAILED' ? 'red' : 'yellow'"
          >
            {{ deployment.status }}
          </Badge>
        </div>
      </div>
    </Card>
  </div>
</template>
