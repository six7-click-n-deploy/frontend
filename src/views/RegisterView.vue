<script setup lang="ts">
import { useRouter } from 'vue-router'
import { AlertCircle } from 'lucide-vue-next'

const router = useRouter()

// Redirect to login since registration is handled by Keycloak admin
const goToLogin = () => {
  router.push('/login')
}
</script>

<template>
  <div class="max-w-md mx-auto">
    <h2 class="text-2xl font-bold text-center mb-6 text-gray-800">
      {{ $t('auth.register.title') }}
    </h2>

    <!-- Info Box -->
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div class="flex items-start gap-3">
        <AlertCircle class="text-blue-600 flex-shrink-0 mt-0.5" :size="20" />
        <div>
          <p class="text-sm text-gray-700 mb-2">
            User registration is managed by your DHBW administrator through Keycloak.
          </p>
          <p class="text-sm text-gray-600">
            If you need an account, please contact your course administrator.
          </p>
        </div>
      </div>
    </div>

    <!-- Back to Login Button -->
    <button
      @click="goToLogin"
      class="w-full bg-primary hover:bg-primary/90 text-white py-3 rounded-lg font-medium transition"
    >
      {{ $t('auth.register.toLogin') }}
    </button>
  </div>
</template>
