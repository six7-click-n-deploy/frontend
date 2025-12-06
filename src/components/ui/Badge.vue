<script setup lang="ts">
defineProps<{
  color?: 'green' | 'red' | 'gray' | 'blue'
}>()
</script>

<template>
  <span
    :class="[
      'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium',
      color === 'green'
        ? 'bg-green-100 text-green-700'
        : color === 'red'
        ? 'bg-red-100 text-red-700'
        : color === 'blue'
        ? 'bg-blue-100 text-blue-700'
        : 'bg-gray-100 text-gray-700'
    ]"
  >
    <slot />
  </span>
</template>
