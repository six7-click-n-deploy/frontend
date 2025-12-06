<script setup lang="ts">
import { HelpCircle } from 'lucide-vue-next'
</script>

<template>
  <div class="bg-white rounded-2xl p-10 border">
    <div class="flex items-center gap-4 mb-6 text-primary">
      <HelpCircle :size="28" />
      <h1 class="text-2xl font-bold">{{ $t('HelpView.title') }}</h1>
    </div>

    <p class="text-gray-500 mb-6">
      {{ $t('HelpView.subtitle') }}
    </p>

    <ul class="space-y-4">
      <li class="bg-primaryLight p-4 rounded-lg border border-primary/20" />
      <li class="bg-primaryLight p-4 rounded-lg border border-primary/20" />
      <li class="bg-primaryLight p-4 rounded-lg border border-primary/20" />
    </ul>
  </div>
</template>
