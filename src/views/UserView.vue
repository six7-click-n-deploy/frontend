<script setup lang="ts">
import { User, Mail, Shield } from 'lucide-vue-next'
</script>

<template>
  <div class="space-y-12">

    <!-- Header -->
    <div>
      <h1 class="text-3xl font-bold text-gray-900 mb-1">
        {{ $t('user.title') }}
      </h1>
      <p class="text-gray-500">
        {{ $t('user.subtitle') }}
      </p>
    </div>

    <!-- Profile Card -->
    <div class="bg-white rounded-xl border p-6 flex items-center justify-between">
      <div class="flex items-center gap-4">
        <div
          class="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center"
        >
          <User :size="26" class="text-primary" />
        </div>

        <div>
          <div class="font-semibold text-gray-900">
            {{ $t('user.name') }}
          </div>
          <div class="text-sm text-gray-500">
            {{ $t('user.roleAdmin') }}
          </div>
        </div>
      </div>

      <button
        class="border border-accentYellow text-accentYellow
               px-5 py-2 rounded-lg text-sm font-medium
               hover:bg-accentYellow hover:text-white transition"
      >
        {{ $t('user.edit') }}
      </button>
    </div>

    <!-- Information -->
    <div class="grid grid-cols-2 gap-8">

      <!-- E-Mail -->
      <div class="bg-white rounded-xl border p-6 flex items-center justify-between">
        <div>
          <div class="text-sm text-gray-500 mb-1">
            {{ $t('user.emailLabel') }}
          </div>
          <div class="font-medium text-gray-900">
            {{ $t('user.emailValue') }}
          </div>
        </div>
        <Mail :size="20" class="text-primary" />
      </div>

      <!-- Role -->
      <div class="bg-white rounded-xl border p-6 flex items-center justify-between">
        <div>
          <div class="text-sm text-gray-500 mb-1">
            {{ $t('user.roleLabel') }}
          </div>
          <div class="font-medium text-gray-900">
            {{ $t('user.roleAdmin') }}
          </div>
        </div>
        <Shield :size="20" class="text-primary" />
      </div>

    </div>

    <!-- Security -->
    <div class="bg-white rounded-xl border p-6 flex items-center justify-between">
      <div>
        <div class="text-sm text-gray-500 mb-1">
          {{ $t('user.passwordLabel') }}
        </div>
        <div class="font-medium text-gray-900">
          ••••••••
        </div>
      </div>

      <button
        class="border border-accentRed text-accentRed
               px-5 py-2 rounded-lg text-sm font-medium
               hover:bg-accentRed hover:text-white transition"
      >
        {{ $t('user.changePassword') }}
      </button>
    </div>

  </div>
</template>
