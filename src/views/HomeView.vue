<script setup lang="ts">
import { Home } from 'lucide-vue-next'
</script>

<template>
  <div class="bg-white rounded-2xl p-10 border">
    <div class="flex items-center gap-4 mb-6 text-primary">
      <Home :size="28" />
      <h1 class="text-2xl font-bold">{{ $t('HomeView.title') }}</h1>
    </div>

    <p class="text-gray-500">
      {{ $t('HomeView.subtitle') }}
    </p>
  </div>
</template>
