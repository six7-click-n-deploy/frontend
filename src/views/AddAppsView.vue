<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { appApi } from '@/api/app.api' // Deine API Verbindung

// Icons für das Formular und die Vorschau
import {
  IdCard,
  MessageSquare,
  Circle,
  Link as LinkIcon,
  Server,
  Layers,
  Shield,
  Box
} from 'lucide-vue-next'

const router = useRouter()
const toast = useToast()
const isLoading = ref(false)

// Formulardaten
const form = ref({
  name: '',
  description: '',
  logo: 'kali.jpg', // Standardwert aus Screenshot
  repoUrl: ''
})

// Der SSH Key Text aus dem Screenshot
const sshKey = "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIKqV19a3... IhrName@IhrComputer"

// Logik für das Icon in der Vorschau (Rechts)
const previewIcon = computed(() => {
  const name = form.value.name.toLowerCase()
  if (name.includes('kali') || name.includes('hack') || name.includes('security')) return Shield
  if (name.includes('node')) return Server
  if (name.includes('python')) return Box
  return Layers // Standard Icon
})

// Farbe für das Icon-Hintergrund in der Vorschau
const iconColorClass = computed(() => {
  const name = form.value.name.toLowerCase()
  if (name.includes('kali')) return 'text-blue-500' // Kali ist meist blau
  return 'text-gray-700'
})

// Speichern Funktion
const handleSubmit = async () => {
  if (!form.value.name || !form.value.repoUrl) {
    toast.error('Bitte Namen und Repo-URL angeben.')
    return
  }

  isLoading.value = true
  try {
    // API Aufruf
    await appApi.create({
      name: form.value.name,
      description: form.value.description,
      // logo: form.value.logo, // Falls API das unterstützt
      // repoUrl: form.value.repoUrl // Falls API das unterstützt
    } as any)

    toast.success('App erfolgreich erstellt!')
    router.push({ name: 'apps' }) // Zurück zur Übersicht
  } catch (error) {
    console.error(error)
    toast.error('Fehler beim Erstellen der App.')
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="bg-white rounded-2xl p-10 border min-h-[600px]">

    <h1 class="text-4xl font-bold text-gray-900 mb-12">Apps</h1>

    <div class="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-16 items-start">

      <div class="space-y-6">

        <div class="bg-gray-100 rounded-lg p-3 flex items-center shadow-sm">
          <div class="p-2">
            <IdCard class="text-green-800" :size="28" />
          </div>
          <div class="font-bold text-gray-800 w-48 pl-2">Namen der App:</div>
          <input
              v-model="form.name"
              type="text"
              placeholder="Name"
              class="flex-1 bg-white rounded py-1.5 px-3 focus:ring-2 focus:ring-green-600 outline-none text-gray-700 shadow-sm mx-2"
          />
        </div>

        <div class="bg-gray-100 rounded-lg p-3 flex items-center shadow-sm">
          <div class="p-2">
            <MessageSquare class="text-green-800" :size="28" />
          </div>
          <div class="font-bold text-gray-800 w-48 pl-2">Beschreibung der App:</div>
          <input
              v-model="form.description"
              type="text"
              placeholder="Dies ist ein Beispiel Text"
              class="flex-1 bg-white rounded py-1.5 px-3 focus:ring-2 focus:ring-green-600 outline-none text-gray-700 shadow-sm mx-2"
          />
        </div>

        <div class="bg-gray-100 rounded-lg p-3 flex items-center shadow-sm">
          <div class="p-2">
            <Circle class="text-green-800" :size="28" />
          </div>
          <div class="font-bold text-gray-800 w-48 pl-2">App Logo:</div>
          <input
              v-model="form.logo"
              type="text"
              placeholder="kali.jpg"
              class="flex-1 bg-white rounded py-1.5 px-3 focus:ring-2 focus:ring-green-600 outline-none text-gray-700 shadow-sm mx-2"
          />
        </div>

        <div class="bg-gray-100 rounded-lg p-3 flex items-center shadow-sm">
          <div class="p-2">
            <LinkIcon class="text-green-800" :size="28" />
          </div>
          <div class="font-bold text-gray-800 w-48 pl-2">Link zu dem Github Repo:</div>
          <input
              v-model="form.repoUrl"
              type="text"
              placeholder="https://github.com..."
              class="flex-1 bg-white rounded py-1.5 px-3 focus:ring-2 focus:ring-green-600 outline-none text-gray-700 shadow-sm mx-2"
          />
        </div>

      </div>

      <div class="flex flex-col items-center pt-4">
        <div class="w-full bg-[#EFF5F2] border border-gray-200 rounded-xl p-8 flex flex-col items-center text-center shadow-sm relative min-h-[300px]">

          <span class="absolute top-2 right-3 text-[10px] text-gray-400 uppercase tracking-widest font-bold">Vorschau</span>

          <div class="mb-6 bg-white p-5 rounded-full shadow-sm">
            <component :is="previewIcon" :size="48" :class="iconColorClass" />
          </div>

          <h3 class="font-bold text-2xl mb-4 text-gray-900">
            {{ form.name || 'Name' }}
          </h3>

          <p class="text-gray-600 text-sm mb-8 leading-relaxed px-2">
            {{ form.description || 'Dies ist ein Beispiel Text' }}
          </p>

          <div class="mt-auto">
            <button class="bg-[#2E5C46] text-white px-6 py-2 rounded-md font-medium text-sm shadow-md opacity-90 cursor-default">
              Jetzt Deployen
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="mt-16 flex flex-col lg:flex-row items-end justify-between gap-6">

      <div class="w-full max-w-3xl space-y-4">
        <div class="bg-gray-100 text-gray-700 p-4 rounded-lg text-sm leading-relaxed border border-gray-200">
          Hinweis: Damit die App richtig hinzugefügt werden kann, muss der SSH-Key von dem Server bei ihrem GitHub Repository als Deployment-Key hinterlegt werden.
        </div>
        <div class="bg-gray-100 text-gray-700 p-4 rounded-lg text-sm font-mono break-all border border-gray-200">
          Der SSH-Key lautet: {{ sshKey }}
        </div>
      </div>

      <button
          @click="handleSubmit"
          :disabled="isLoading"
          class="bg-[#2E5C46] hover:bg-[#234a36] text-white text-lg px-10 py-3 rounded-full font-medium transition-colors shadow-lg flex items-center justify-center mb-2"
      >
        {{ isLoading ? 'Speichern...' : 'Hinzufügen' }}
      </button>

    </div>
  </div>
</template>