<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { appApi } from '@/api/app.api'

// Icons
import {
  IdCard,
  MessageSquare,
  Link as LinkIcon,
  Server,
  Layers,
  Shield,
  Box,
  Info
} from 'lucide-vue-next'

const router = useRouter()
const toast = useToast()
const isLoading = ref(false)

const form = ref({
  name: '',
  description: '',
  logo: 'kali.jpg',
  repoUrl: ''
})

const previewIcon = computed(() => {
  const name = form.value.name.toLowerCase()
  if (name.includes('kali') || name.includes('hack') || name.includes('security')) return Shield
  if (name.includes('node')) return Server
  if (name.includes('python')) return Box
  return Layers
})

const iconColorClass = computed(() => {
  const name = form.value.name.toLowerCase()
  if (name.includes('kali')) return 'text-blue-500'
  return 'text-gray-700'
})

// 1. Verbesserte Validierung für das Frontend
const isValidGitUrl = (url: string) => {
  // Regex Erklärung:
  // ^(https?:\/\/|git@)  -> Startet mit http://, https:// oder git@
  // [\w.-]+              -> Danach kommen Domain-Zeichen (Buchstaben, Zahlen, Punkte, Striche)
  // [\/:].+              -> Danach muss ein Slash oder Doppelpunkt (bei SSH) und noch Text folgen
  // Damit wird 'https://asd' abgelehnt (weil kein Pfad), 'https://github.com/user/repo' aber akzeptiert.
  const regex = /^(https?:\/\/|git@)[\w.-]+[\/:].+/
  return regex.test(url)
}

const handleSubmit = async () => {
  if (!form.value.name || !form.value.repoUrl) {
    toast.error('Bitte Namen und Repo-URL angeben.')
    return
  }

  // Frontend Vor-Check
  if (!isValidGitUrl(form.value.repoUrl)) {
    toast.error('Dies sieht nicht nach einer gültigen Git-URL aus (z.B. https://github.com/user/repo).')
    return
  }

  isLoading.value = true
  try {
    await appApi.create({
      name: form.value.name,
      description: form.value.description,
      // logo: form.value.logo,
      git_link: form.value.repoUrl
    } as any)

    toast.success('App erfolgreich erstellt!')
    router.push({ name: 'apps' })

  } catch (error: any) {
    console.error('API Error:', error)

    // 2. Erweitertes Error Handling basierend auf Backend Antwort
    if (error.response) {
      // Wenn der Server mit einem Fehler antwortet (z.B. 403 oder 400)
      if (error.response.status === 403 || error.response.status === 400 || error.response.status === 422) {
        toast.error('Keine gültige URL oder kein Zugriff auf das Repository. Bitte prüfe die Berechtigungen.')
      } else {
        // Anderer Serverfehler (z.B. 500)
        toast.error(`Server Fehler: ${error.response.statusText || 'Unbekannter Fehler'}`)
      }
    } else {
      // Netzwerkfehler oder Server nicht erreichbar
      toast.error('Fehler beim Erstellen der App. (Netzwerkfehler)')
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="bg-white rounded-2xl p-10 border min-h-[600px] flex flex-col">

    <h1 class="text-4xl font-bold text-gray-900 mb-12">Apps</h1>

    <div class="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-16 items-start mb-8">

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

    <div class="mt-auto grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-16 items-end">

      <div>
        <div class="bg-blue-50 text-blue-900 p-4 rounded-lg text-sm leading-relaxed border border-blue-200 flex gap-3 items-start shadow-sm">
          <Info class="shrink-0 mt-0.5 text-blue-700" :size="20" />
          <div>
            <span class="font-semibold block mb-1">Wichtig:</span>
            Bitte lade den Git user <strong>six7clickndeploy</strong> als Collaborator zu dem Repo ein.<br>
            <a href="https://github.com/six7clickndeploy" target="_blank" class="text-blue-700 underline hover:text-blue-500 break-all">
              https://github.com/six7clickndeploy
            </a>
          </div>
        </div>
      </div>

      <div class="flex justify-center lg:justify-end pb-1">
        <button
            @click="handleSubmit"
            :disabled="isLoading"
            class="bg-[#2E5C46] hover:bg-[#234a36] text-white text-lg px-10 py-3 rounded-full font-medium transition-colors shadow-lg flex items-center justify-center w-full lg:w-auto"
        >
          {{ isLoading ? 'Speichern...' : 'Hinzufügen' }}
        </button>
      </div>

    </div>

  </div>
</template>