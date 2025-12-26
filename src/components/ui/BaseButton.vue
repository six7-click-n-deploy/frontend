<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'yellow' | 'green' | 'red'
}>(), {
  variant: 'yellow' //Default value
})
</script>

<template>
  <button
    :class="[
      'px-5 py-2.5 rounded-xl font-medium transition duration-200 shadow-sm',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      variant === 'green'
        ? 'bg-lightGreen text-gray-800 hover:bg-primary hover:text-white focus:ring-primary/60'
        : variant === 'red'
        ? 'bg-lightRed text-accentRed hover:bg-accentRed hover:text-white focus:ring-accentRed/60'
        : 'bg-lightYellow text-accentYellow hover:bg-accentYellow hover:text-white focus:ring-accentYellow/60'
    ]"
  >
    <slot />
  </button>
</template>


