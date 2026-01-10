<script setup lang="ts">
defineProps<{
  show: boolean
  title?: string
  message?: string
}>()

const emit = defineEmits<{
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
    >
      <div class="bg-white rounded-2xl shadow-xl w-[400px] p-6 animate-fade-in">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-semibold">{{ title || 'Bestätigung' }}</h3>
          <button @click="$emit('cancel')" class="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        <div class="mb-6">
          <p>{{ message || 'Sind Sie sicher?' }}</p>
        </div>

        <div class="flex justify-end gap-4">
          <button
            class="px-4 py-2 rounded-full bg-gray-200 hover:bg-gray-300"
            @click="$emit('cancel')"
          >
            Abbrechen
          </button>
          <button
            class="px-4 py-2 rounded-full bg-red-600 text-white hover:bg-red-700"
            @click="$emit('confirm')"
          >
            Löschen
          </button>
        </div>
      </div>
    </div>
  </Teleport>
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
