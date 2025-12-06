<script setup lang="ts">
import { Settings } from 'lucide-vue-next'
</script>

<template>
  <div class="bg-white rounded-2xl p-10 border">
    <div class="flex items-center gap-4 mb-6 text-primary">
      <Settings :size="28" />
      <h1 class="text-2xl font-bold">{{ $t('ConfigView.title') }}</h1>
    </div>

    <p class="text-gray-500">
      {{ $t('ConfigView.subtitle') }}
    </p>
  </div>
</template>
