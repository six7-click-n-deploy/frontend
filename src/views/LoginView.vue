<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { User, Lock } from 'lucide-vue-next'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'

const { login, isLoading } = useAuth()
const { success, error: showError } = useToast()
const router = useRouter()

const username = ref('')
const password = ref('')
const error = ref('')

const submit = async () => {
  error.value = ''
  
  if (!username.value || !password.value) {
    error.value = 'Bitte Benutzername und Passwort eingeben'
    return
  }

  try {
    await login(username.value, password.value)
    success('Erfolgreich angemeldet!')
    router.push('/dashboard')
  } catch (err: any) {
    const errorMsg = err.response?.data?.detail || 'Login fehlgeschlagen'
    error.value = errorMsg
    showError(errorMsg)
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
      v-if="error"
      class="mb-4 bg-accentRed/10 text-accentRed text-sm p-3 rounded-lg"
    >
      {{ error }}
    </div>

    <!-- Username -->
    <div class="mb-4">
      <label class="block text-sm text-gray-600 mb-1">
        Benutzername
      </label>
      <div class="relative">
        <User class="absolute left-3 top-1/2 -translate-y-1/2 text-primary" :size="18" />
        <input
          v-model="username"
          type="text"
          class="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
          placeholder="dein.username"
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
      :disabled="isLoading"
      class="w-full bg-accentYellow text-white py-2 rounded-lg font-semibold
             hover:opacity-90 transition mb-4 disabled:opacity-50"
    >
      {{ isLoading ? 'Loading...' : $t('auth.login.submit') }}
    </button>

    <RouterLink
      to="/register"
      class="block text-center text-sm text-accentRed hover:underline"
    >
      {{ $t('auth.login.toRegister') }}
    </RouterLink>
  </div>
</template>
