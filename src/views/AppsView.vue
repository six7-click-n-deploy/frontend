<script setup lang="ts">
import { ref } from 'vue'
import { Layers, Copy } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'

const toast = useToast()

const templates = ref([
  {
    id: 1,
    name: 'Node.js Express',
    description: 'REST API mit Express und TypeScript',
    language: 'JavaScript',
    category: 'Backend',
    icon: '🟢'
  },
  {
    id: 2,
    name: 'Vue 3 + Vite',
    description: 'Modernes Frontend mit Vue 3 und TypeScript',
    language: 'JavaScript',
    category: 'Frontend',
    icon: '🟩'
  },
  {
    id: 3,
    name: 'Python FastAPI',
    description: 'Schnelle API mit Python und FastAPI',
    language: 'Python',
    category: 'Backend',
    icon: '🐍'
  },
  {
    id: 4,
    name: 'React + TypeScript',
    description: 'React App mit TypeScript und Vite',
    language: 'JavaScript',
    category: 'Frontend',
    icon: '⚛️'
  },
  {
    id: 5,
    name: 'PostgreSQL',
    description: 'PostgreSQL Datenbank mit Docker',
    language: 'SQL',
    category: 'Database',
    icon: '🐘'
  },
  {
    id: 6,
    name: 'Docker Compose',
    description: 'Multi-Container Setup mit Docker Compose',
    language: 'YAML',
    category: 'DevOps',
    icon: '🐳'
  }
])

const useTemplate = (template: any) => {
  toast.info(`Template "${template.name}" wird vorbereitet...`)
}
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
