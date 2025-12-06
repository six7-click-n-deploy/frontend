<script setup lang="ts">
defineProps<{ show: boolean }>()
defineEmits(['close'])
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
  >
    <div class="bg-white rounded-2xl shadow-xl w-[400px] p-6 animate-fade-in">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold">
          <slot name="title" />
        </h3>
        <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600">
          ✕
        </button>
      </div>

      <div>
        <slot />
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes fade-in {
  from { opacity: 0; transform: scale(0.97); }
  to { opacity: 1; transform: scale(1); }
}
.animate-fade-in {
  animation: fade-in 0.15s ease-out;
}
</style>
