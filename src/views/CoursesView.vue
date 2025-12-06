<script setup lang="ts">
import { GraduationCap } from 'lucide-vue-next'
</script>

<template>
  <div class="bg-white rounded-2xl p-10 border">
    <div class="flex items-center gap-4 mb-6 text-primary">
      <GraduationCap :size="28" />
      <h1 class="text-2xl font-bold">{{ $t('CoursesView.title') }}</h1>
    </div>

    <p class="text-gray-500 mb-8">
      {{ $t('CoursesView.subtitle') }}
    </p>

    <div class="bg-primaryLight p-6 rounded-xl border border-primary/20">
      <p class="text-sm text-gray-700">
        🚧 {{ $t('CoursesView.placeholder') }}
      </p>
    </div>
  </div>
</template>
