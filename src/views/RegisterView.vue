<script setup lang="ts">
import { Mail, Lock, User } from 'lucide-vue-next'
</script>

<template>
  <div>
    <h2 class="text-2xl font-bold text-center mb-6 text-gray-800">
      {{ $t('auth.register.title') }}
    </h2>

    <!-- Name -->
    <div class="mb-4">
      <label class="block text-sm text-gray-600 mb-1">
        {{ $t('auth.register.nameLabel') }}
      </label>
      <div class="relative">
        <User class="absolute left-3 top-1/2 -translate-y-1/2 text-primary" :size="18" />
        <input
          class="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
          :placeholder="$t('auth.register.namePlaceholder')"
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
          type="email"
          class="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
          :placeholder="$t('auth.register.emailPlaceholder')"
        />
      </div>
    </div>

    <!-- Passwort -->
    <div class="mb-6">
      <label class="block text-sm text-gray-600 mb-1">
        {{ $t('auth.register.passwordLabel') }}
      </label>
      <div class="relative">
        <Lock class="absolute left-3 top-1/2 -translate-y-1/2 text-primary" :size="18" />
        <input
          type="password"
          class="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
          :placeholder="$t('auth.register.passwordPlaceholder')"
        />
      </div>
    </div>

    <!-- Register Button -->
    <button
      class="w-full bg-primary text-white py-2 rounded-lg font-semibold
             hover:bg-primaryDark transition mb-4"
    >
      {{ $t('auth.register.submit') }}
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
