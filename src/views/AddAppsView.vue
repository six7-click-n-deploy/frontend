<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { appApi } from '@/api/app.api'
import { useI18n } from 'vue-i18n' // <-- i18n Import hinzugefügt

// Icons
import {
  IdCard,
  MessageSquare,
  Link as LinkIcon,
  Server,
  Layers,
  Shield,
  Box,
  Info,
  Image as ImageIcon,
  Globe,
  Lock,
  Send,
} from 'lucide-vue-next'

const { t } = useI18n()
const router = useRouter()
const toast = useToast()
const isLoading = ref(false)

const form = ref({
  name: '',
  description: '',
  logo: null as File | null,
  repoUrl: '',
  isPrivate: false,
  submitAllVersions: false,
})

const imagePreviewUrl = ref<string | null>(null)
const isDragging = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

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

const triggerFileInput = () => {
  fileInputRef.value?.click()
}

const MAX_IMAGE_BYTES = 2 * 1024 * 1024

const processFile = (file: File) => {
  if (!file.type.startsWith('image/')) {
    toast.error(t('AppsCreateView.messages.onlyImages'))
    return
  }
  if (file.size > MAX_IMAGE_BYTES) {
    // Variable für MB an i18n übergeben
    toast.error(t('AppsCreateView.messages.imageTooLarge', { size: Math.round(MAX_IMAGE_BYTES / 1024 / 1024) }))
    return
  }

  if (imagePreviewUrl.value) {
    URL.revokeObjectURL(imagePreviewUrl.value)
  }

  form.value.logo = file
  imagePreviewUrl.value = URL.createObjectURL(file)
}

const handleFileChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    const file = target.files[0]
    if (file) {
      processFile(file)
    }
  }
  if (target) target.value = ''
}

const handleDrop = (event: DragEvent) => {
  isDragging.value = false
  if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
    const file = event.dataTransfer.files[0]
    if (file) {
      processFile(file)
    }
  }
}

const isValidGitUrl = (url: string) => {
  const regex = /^(https?:\/\/|git@)[\w.-]+[\/:].+/
  return regex.test(url)
}

const fileToDataUrl = (file: File | null): Promise<string | null> => {
  if (!file) return Promise.resolve(null)
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

const handleSubmit = async () => {
  if (!form.value.name || !form.value.repoUrl) {
    toast.error(t('AppsCreateView.messages.missingFields'))
    return
  }

  if (!isValidGitUrl(form.value.repoUrl)) {
    toast.error(t('AppsCreateView.messages.invalidUrl'))
    return
  }

  isLoading.value = true
  try {
    const imageDataUrl = await fileToDataUrl(form.value.logo)

    await appApi.create({
      name: form.value.name,
      description: form.value.description,
      git_link: form.value.repoUrl,
      image: imageDataUrl,
      is_private: form.value.isPrivate,
      submit_all_versions: !form.value.isPrivate && form.value.submitAllVersions,
    })

    toast.success(t('AppsCreateView.messages.success'))
    router.push({ name: 'apps' })

  } catch (error: any) {
    console.error('API Error:', error)

    if (error.response) {
      if (error.response.status === 403 || error.response.status === 400 || error.response.status === 422) {
        toast.error(t('AppsCreateView.messages.noAccess'))
      } else {
        toast.error(t('AppsCreateView.messages.serverError', { statusText: error.response.statusText || 'Unknown' }))
      }
    } else {
      toast.error(t('AppsCreateView.messages.networkError'))
    }
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <div class="bg-white rounded-2xl p-10 border min-h-[600px] flex flex-col">

    <h1 class="text-4xl font-bold text-gray-900 mb-12">{{ $t('AppsCreateView.title') }}</h1>

    <div class="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-16 items-start mb-8">

      <div class="space-y-6">

        <div class="bg-gray-100 rounded-lg p-3 flex items-center shadow-sm">
          <div class="p-2">
            <IdCard class="text-green-800" :size="28" />
          </div>
          <div class="font-bold text-gray-800 w-48 pl-2">{{ $t('AppsCreateView.form.nameLabel') }}</div>
          <input
              v-model="form.name"
              type="text"
              :placeholder="$t('AppsCreateView.form.namePlaceholder')"
              class="flex-1 bg-white rounded py-1.5 px-3 focus:ring-2 focus:ring-green-600 outline-none text-gray-700 shadow-sm mx-2"
          />
        </div>

        <div class="bg-gray-100 rounded-lg p-3 flex items-center shadow-sm">
          <div class="p-2">
            <MessageSquare class="text-green-800" :size="28" />
          </div>
          <div class="font-bold text-gray-800 w-48 pl-2">{{ $t('AppsCreateView.form.descLabel') }}</div>
          <input
              v-model="form.description"
              type="text"
              :placeholder="$t('AppsCreateView.form.descPlaceholder')"
              class="flex-1 bg-white rounded py-1.5 px-3 focus:ring-2 focus:ring-green-600 outline-none text-gray-700 shadow-sm mx-2"
          />
        </div>

        <div class="bg-gray-100 rounded-lg p-3 flex items-center shadow-sm">
          <div class="p-2">
            <ImageIcon class="text-green-800" :size="28" />
          </div>
          <div class="font-bold text-gray-800 w-48 pl-2">{{ $t('AppsCreateView.form.logoLabel') }}</div>
          <div
              class="flex-1 bg-white rounded py-1.5 px-3 outline-none text-gray-700 shadow-sm mx-2 border-2 transition-all cursor-pointer flex items-center min-h-[36px]"
              :class="isDragging ? 'border-green-500 bg-green-50 border-dashed' : 'border-transparent hover:border-gray-300 border-dashed'"
              @dragover.prevent="isDragging = true"
              @dragleave.prevent="isDragging = false"
              @drop.prevent="handleDrop"
              @click="triggerFileInput"
          >
            <input
                ref="fileInputRef"
                type="file"
                accept="image/*"
                class="hidden"
                @change="handleFileChange"
            />
            <span v-if="!imagePreviewUrl" class="text-sm text-gray-400">
              {{ $t('AppsCreateView.form.logoSelect') }}
            </span>
            <div v-else class="flex justify-between items-center w-full">
              <span class="text-sm text-green-700 font-medium truncate">{{ form.logo?.name }}</span>
              <span class="text-xs text-gray-400 hover:text-red-500 ml-2" @click.stop="imagePreviewUrl = null; form.logo = null">{{ $t('AppsCreateView.form.logoRemove') }}</span>
            </div>
          </div>
        </div>
        <div class="bg-gray-100 rounded-lg p-3 flex items-center shadow-sm">
          <div class="p-2">
            <LinkIcon class="text-green-800" :size="28" />
          </div>
          <div class="font-bold text-gray-800 w-48 pl-2">{{ $t('AppsCreateView.form.repoLabel') }}</div>
          <input
              v-model="form.repoUrl"
              type="text"
              :placeholder="$t('AppsCreateView.form.repoPlaceholder')"
              class="flex-1 bg-white rounded py-1.5 px-3 focus:ring-2 focus:ring-green-600 outline-none text-gray-700 shadow-sm mx-2"
          />
        </div>

        <!-- Visibility Toggle -->
        <div class="bg-gray-100 rounded-lg p-3 flex items-start shadow-sm">
          <div class="p-2">
            <component :is="form.isPrivate ? Lock : Globe" class="text-green-800" :size="28" />
          </div>
          <div class="font-bold text-gray-800 w-48 pl-2 pt-1">{{ $t('AppsCreateView.form.visibilityLabel') }}</div>
          <div class="flex-1 mx-2">
            <div class="flex gap-3">
              <button
                type="button"
                @click="form.isPrivate = false"
                class="flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all"
                :class="!form.isPrivate ? 'border-green-600 bg-green-50 text-green-800' : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'"
              >
                <Globe :size="16" />
                {{ $t('AppsCreateView.form.visibilityPublic') }}
              </button>
              <button
                type="button"
                @click="form.isPrivate = true"
                class="flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all"
                :class="form.isPrivate ? 'border-purple-600 bg-purple-50 text-purple-800' : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'"
              >
                <Lock :size="16" />
                {{ $t('AppsCreateView.form.visibilityPrivate') }}
              </button>
            </div>
            <p class="mt-2 text-sm text-gray-500">
              {{ form.isPrivate ? $t('AppsCreateView.form.visibilityPrivateHint') : $t('AppsCreateView.form.visibilityPublicHint') }}
            </p>
          </div>
        </div>

        <!-- Submit all versions toggle (public only) -->
        <div v-if="!form.isPrivate" class="bg-gray-100 rounded-lg p-3 flex items-center shadow-sm">
          <div class="p-2">
            <Send class="text-green-800" :size="28" />
          </div>
          <div class="font-bold text-gray-800 w-48 pl-2">{{ $t('AppsCreateView.form.submitAllLabel') }}</div>
          <div class="flex-1 mx-2 flex items-center justify-between">
            <p class="text-sm text-gray-500">{{ $t('AppsCreateView.form.submitAllHint') }}</p>
            <button
              type="button"
              @click="form.submitAllVersions = !form.submitAllVersions"
              class="relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ml-4"
              :class="form.submitAllVersions ? 'bg-green-600' : 'bg-gray-300'"
            >
              <span
                class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200"
                :class="form.submitAllVersions ? 'translate-x-5' : 'translate-x-0'"
              />
            </button>
          </div>
        </div>

      </div>

      <div class="flex flex-col items-center pt-4">
        <div class="w-full bg-[#EFF5F2] border border-gray-200 rounded-xl p-8 flex flex-col items-center text-center shadow-sm relative min-h-[300px]">
          <span class="absolute top-2 right-3 text-[10px] text-gray-400 uppercase tracking-widest font-bold">{{ $t('AppsCreateView.preview.badge') }}</span>

          <div class="mb-6 bg-white rounded-full shadow-sm flex items-center justify-center overflow-hidden w-[88px] h-[88px]">
            <img
                v-if="imagePreviewUrl"
                :src="imagePreviewUrl"
                :alt="$t('AppsCreateView.preview.logoAlt')"
                class="w-full h-full object-cover"
            />
            <component
                v-else
                :is="previewIcon"
                :size="48"
                :class="iconColorClass"
            />
          </div>

          <h3 class="font-bold text-2xl mb-4 text-gray-900">
            {{ form.name || $t('AppsCreateView.preview.defaultName') }}
          </h3>
          <p class="text-gray-600 text-sm mb-8 leading-relaxed px-2">
            {{ form.description || $t('AppsCreateView.preview.defaultDesc') }}
          </p>
          <div class="mt-auto">
            <button class="bg-[#2E5C46] text-white px-6 py-2 rounded-md font-medium text-sm shadow-md opacity-90 cursor-default">
              {{ $t('AppsCreateView.preview.deployBtn') }}
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
            <span class="font-semibold block mb-1">{{ $t('AppsCreateView.info.important') }}</span>
            <span v-html="$t('AppsCreateView.info.inviteText')"></span><br>
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
          {{ isLoading ? $t('AppsCreateView.buttons.saving') : $t('AppsCreateView.buttons.add') }}
        </button>
      </div>

    </div>

  </div>
</template>