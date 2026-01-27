<!-- src/components/ui/Modal.vue -->
<script setup lang="ts">
defineProps<{ show: boolean }>()
defineEmits(['close'])
</script>

<template>
  <div
    v-if="show"
    class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
    @click.self="$emit('close')"
  >
    <div 
      class="bg-white rounded-2xl shadow-xl w-full max-w-[500px] mx-4 animate-fade-in"
      @click.stop
    >
      <!-- Header -->
      <div class="flex justify-between items-center p-6 border-b border-gray-100">
        <div class="text-xl font-semibold text-gray-900">
          <slot name="header">Modal</slot>
        </div>
        <button 
          @click="$emit('close')" 
          class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>

      <!-- Body -->
      <div class="p-6">
        <slot name="body">
          <slot></slot>
        </slot>
      </div>

      <!-- Footer -->
      <div class="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
        <slot name="footer"></slot>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes fade-in {
  from { 
    opacity: 0; 
    transform: scale(0.95); 
  }
  to { 
    opacity: 1; 
    transform: scale(1); 
  }
}

.animate-fade-in {
  animation: fade-in 0.2s ease-out;
}
</style>
