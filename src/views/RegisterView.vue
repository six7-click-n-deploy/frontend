<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Mail, Lock, User } from 'lucide-vue-next'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'
import type { UserRole } from '@/types'

const { register, isLoading } = useAuth()
const { success, error: showError } = useToast()
const router = useRouter()

const username = ref('')
const email = ref('')
const password = ref('')
const passwordConfirm = ref('')
const role = ref<UserRole>('student')
const error = ref('')

const submit = async () => {
  error.value = ''

  // Validierung
  if (!username.value || !email.value || !password.value) {
    error.value = 'Bitte alle Felder ausfüllen'
    return
  }

  if (password.value !== passwordConfirm.value) {
    error.value = 'Passwörter stimmen nicht überein'
    return
  }

  if (password.value.length < 8) {
    error.value = 'Passwort muss mindestens 8 Zeichen lang sein'
    return
  }

  try {
    await register({
      email: email.value,
      password: password.value,
      username: username.value,
      role: role.value,
    })
    success('Registrierung erfolgreich! Bitte anmelden.')
    router.push('/login')
  } catch (err: any) {
    const errorMsg = err.response?.data?.detail || 'Registrierung fehlgeschlagen'
    error.value = errorMsg
    showError(errorMsg)
  }
}
</script>

<template>
  <div>
    <h2 class="text-2xl font-bold text-center mb-6 text-gray-800">
      {{ $t('auth.register.title') }}
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
      <label class="block text-sm text-gray-600 mb-1">Benutzername</label>
      <div class="relative">
        <User class="absolute left-3 top-1/2 -translate-y-1/2 text-primary" :size="18" />
        <input
          v-model="username"
          class="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
          placeholder="max.mustermann"
        />
      </div>
    </div>

    <!-- E-Mail -->
    <div class="mb-4">
      <label class="block text-sm text-gray-600 mb-1">
        {{ $t('auth.register.emailLabel') }}
      </label>
      <div class="relative">
        <Mail class="absolute left-3 top-1/2 -translate-y-1/2 text-primary" :size="18" />
        <input
          v-model="email"
          type="email"
          class="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
          :placeholder="$t('auth.register.emailPlaceholder')"
        />
      </div>
    </div>

    <!-- Passwort -->
    <div class="mb-4">
      <label class="block text-sm text-gray-600 mb-1">
        {{ $t('auth.register.passwordLabel') }}
      </label>
      <div class="relative">
        <Lock class="absolute left-3 top-1/2 -translate-y-1/2 text-primary" :size="18" />
        <input
          v-model="password"
          type="password"
          class="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
          :placeholder="$t('auth.register.passwordPlaceholder')"
        />
      </div>
    </div>

    <!-- Passwort bestätigen -->
    <div class="mb-4">
      <label class="block text-sm text-gray-600 mb-1">Passwort bestätigen</label>
      <div class="relative">
        <Lock class="absolute left-3 top-1/2 -translate-y-1/2 text-primary" :size="18" />
        <input
          v-model="passwordConfirm"
          type="password"
          class="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
          placeholder="Passwort wiederholen"
        />
      </div>
    </div>

    <!-- Rolle -->
    <div class="mb-6">
      <label class="block text-sm text-gray-600 mb-1">Rolle</label>
      <select
        v-model="role"
        class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
      >
        <option value="student">Student</option>
        <option value="teacher">Lehrer</option>
        <option value="admin">Administrator</option>
      </select>
    </div>

    <!-- Register Button -->
    <button
      @click="submit"
      :disabled="isLoading"
      class="w-full bg-primary text-white py-2 rounded-lg font-semibold
             hover:bg-primaryDark transition mb-4 disabled:opacity-50"
    >
      {{ isLoading ? 'Loading...' : $t('auth.register.submit') }}
    </button>

    <!-- Back to Login -->
    <RouterLink
      to="/login"
      class="block text-center text-sm text-accentYellow hover:underline"
    >
      {{ $t('auth.register.toLogin') }}
    </RouterLink>
  </div>
</template>
