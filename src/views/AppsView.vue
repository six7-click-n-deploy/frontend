<script setup lang="ts">
import { Layers } from 'lucide-vue-next'
</script>

<template>
  <div class="bg-white rounded-2xl p-10 border">
    <div class="flex items-center gap-4 mb-6 text-primary">
      <Layers :size="28" />
      <h1 class="text-2xl font-bold">{{ $t('AppsView.title') }}</h1>
    </div>

    <p class="text-gray-500 mb-10">
      {{ $t('AppsView.subtitle') }}
    </p>

    <div class="grid grid-cols-3 gap-6">
      <div class="bg-primaryLight rounded-xl p-6 h-32 border border-primary/20" />
      <div class="bg-primaryLight rounded-xl p-6 h-32 border border-primary/20" />
      <div class="bg-primaryLight rounded-xl p-6 h-32 border border-primary/20" />
    </div>
  </div>
</template>
