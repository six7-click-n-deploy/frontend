<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Mail, Lock } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth.store'

const auth = useAuthStore()
const router = useRouter()

const email = ref('')
const password = ref('')

const submit = async () => {
  try {
    await auth.login(email.value, password.value)
    router.push('/dashboard')
  } catch {
    // Fehler kommt automatisch aus dem Store
  }
}
</script>

<template>
  <div>
    <h2 class="text-2xl font-bold text-center mb-6 text-gray-800">
      {{ $t('auth.login.title') }}
    </h2>

    <!-- Fehleranzeige -->
    <div
      v-if="auth.error"
      class="mb-4 bg-accentRed/10 text-accentRed text-sm p-3 rounded-lg"
    >
      {{ auth.error }}
    </div>

    <!-- E-Mail -->
    <div class="mb-4">
      <label class="block text-sm text-gray-600 mb-1">
        {{ $t('auth.login.emailLabel') }}
      </label>
      <div class="relative">
        <Mail class="absolute left-3 top-1/2 -translate-y-1/2 text-primary" :size="18" />
        <input
          v-model="email"
          type="email"
          class="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
          :placeholder="$t('auth.login.emailPlaceholder')"
        />
      </div>
    </div>

    <!-- Passwort -->
    <div class="mb-6">
      <label class="block text-sm text-gray-600 mb-1">
        {{ $t('auth.login.passwordLabel') }}
      </label>
      <div class="relative">
        <Lock class="absolute left-3 top-1/2 -translate-y-1/2 text-primary" :size="18" />
        <input
          v-model="password"
          type="password"
          class="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
          :placeholder="$t('auth.login.passwordPlaceholder')"
        />
      </div>
    </div>

    <!-- Login Button -->
    <button
      @click="submit"
      :disabled="auth.isLoading"
      class="w-full bg-accentYellow text-white py-2 rounded-lg font-semibold
             hover:opacity-90 transition mb-4 disabled:opacity-50"
    >
      {{ auth.isLoading ? 'Loading...' : $t('auth.login.submit') }}
    </button>

    <RouterLink
      to="/register"
      class="block text-center text-sm text-accentRed hover:underline"
    >
      {{ $t('auth.login.toRegister') }}
    </RouterLink>
  </div>
</template>
