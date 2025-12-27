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
  <div class="p-6">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900 mb-1">Templates</h1>
      <p class="text-gray-500">Wähle ein Template für deine App</p>
    </div>

    <!-- Templates Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <Card
        v-for="template in templates"
        :key="template.id"
        class="hover:shadow-lg transition cursor-pointer"
        @click="useTemplate(template)"
      >
        <div class="flex items-start justify-between mb-3">
          <div class="text-4xl">{{ template.icon }}</div>
          <Badge variant="blue">{{ template.category }}</Badge>
        </div>

        <h3 class="font-semibold text-gray-900 mb-2">{{ template.name }}</h3>
        <p class="text-sm text-gray-600 mb-4">{{ template.description }}</p>

        <div class="flex items-center justify-between">
          <span class="text-xs text-gray-500">{{ template.language }}</span>
          <button
            class="flex items-center gap-1 text-sm text-primary hover:underline"
            @click.stop="useTemplate(template)"
          >
            <Copy :size="14" />
            Verwenden
          </button>
        </div>
      </Card>
    </div>
  </div>
</template>
