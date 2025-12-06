<script setup lang="ts">
defineProps<{
  variant?: 'primary' | 'secondary' | 'danger'
}>()
</script>

<template>
  <button
    :class="[
      'px-5 py-2.5 rounded-xl font-medium transition duration-200 shadow-sm',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      variant === 'secondary'
        ? 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400'
        : variant === 'danger'
        ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
        : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
    ]"
  >
    <slot />
  </button>
</template>

<script lang="ts">
export default {
  props: {
    variant: {
      type: String,
      default: 'primary',
    },
  },
}
</script>
