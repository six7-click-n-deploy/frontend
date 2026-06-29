<script setup lang="ts">
import { computed } from 'vue'
import { Globe, Clock, XCircle, MinusCircle, Lock } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import type { AppVersionBadgeStatus } from '@/types'

const props = defineProps<{ status: AppVersionBadgeStatus }>()
const { t } = useI18n()

const config = computed(() => {
  switch (props.status) {
    case 'new':
      return { icon: MinusCircle, label: t('AppVersionStatusBadge.new'), classes: 'bg-gray-100 text-gray-600 border-gray-200' }
    case 'pending':
      return { icon: Clock, label: t('AppVersionStatusBadge.pending'), classes: 'bg-orange-50 text-orange-600 border-orange-200' }
    case 'approved':
    case 'published':
      return { icon: Globe, label: t('AppVersionStatusBadge.published'), classes: 'bg-green-50 text-green-700 border-green-200' }
    case 'rejected':
      return { icon: XCircle, label: t('AppVersionStatusBadge.rejected'), classes: 'bg-red-50 text-red-600 border-red-200' }
    case 'private':
      return { icon: Lock, label: t('AppVersionStatusBadge.private'), classes: 'bg-purple-50 text-purple-600 border-purple-200' }
    default:
      return { icon: MinusCircle, label: '-', classes: 'bg-gray-100 text-gray-500 border-gray-200' }
  }
})
</script>

<template>
  <span
    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border"
    :class="config.classes"
  >
    <component :is="config.icon" :size="11" />
    {{ config.label }}
  </span>
</template>
