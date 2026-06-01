<script setup lang="ts">
import { onMounted, computed } from 'vue'
import {
  BarChart3, Layers, GraduationCap, Clock, ArrowRight,
  CheckCircle2, Loader2, XCircle, AlertCircle, Rocket
} from 'lucide-vue-next'
import { useDashboard } from '@/composables/useDashboard'
import { useQuotas } from '@/composables/useQuotas'
import { useOpenStackCredentialsStore } from '@/stores/openstack-credentials.store'
import { useAuthStore } from '@/stores/auth.store'
import CredentialMissingBanner from '@/components/CredentialMissingBanner.vue'

const { stats, fetchStats } = useDashboard()
const { formattedQuotas, loading: quotasLoading, needsCredentials, hasCachedQuotas, fetchQuotas, getColorClass } = useQuotas()
const credStore = useOpenStackCredentialsStore()
const authStore = useAuthStore()

const firstName = computed(() => {
  const name = authStore.user?.username || ''
  return name.charAt(0).toUpperCase() + name.slice(1)
})

const timeGreeting = computed(() => {
  const h = new Date().getHours()
  if (h < 12) return 'Guten Morgen'
  if (h < 18) return 'Guten Tag'
  return 'Guten Abend'
})

onMounted(() => {
  fetchStats()
  fetchQuotas()
  if (!credStore.status) credStore.fetch()
})
</script>

<template>
  <div class="space-y-6">

    <!-- Banners -->
    <CredentialMissingBanner
      v-if="credStore.isResolved && !credStore.hasCredential"
      variant="warning"
      title="OpenStack-Credentials fehlen"
      message="Ohne Credentials kannst du keine Deployments anlegen und keine Quotas sehen."
      cta="Jetzt einrichten"
      ctaTo="/user/openstack"
    />
    <CredentialMissingBanner
      v-else-if="credStore.isResolved && credStore.lastError"
      variant="error"
      title="OpenStack-Credentials nicht validiert"
      :message="credStore.lastError"
      cta="Erneut prüfen"
      ctaTo="/user/openstack"
    />

    <!-- Hero banner -->
    <div class="hero-banner">
      <div class="hero-content">
        <p class="text-white/60 text-xs font-semibold uppercase tracking-widest mb-1">{{ timeGreeting }}</p>
        <h1 class="text-white text-3xl font-bold mb-1">{{ firstName }}</h1>
        <p class="text-white/60 text-sm">Willkommen zurück in deiner Deployment-Umgebung.</p>
      </div>
      <RouterLink
        :to="{ name: 'deployment.config' }"
        class="hero-cta group"
      >
        <Rocket :size="16" class="group-hover:translate-x-0.5 transition-transform" />
        Neues Deployment
      </RouterLink>
    </div>

    <!-- KPI row -->
    <div class="kpi-row">
      <RouterLink :to="{ name: 'deployments.list' }" class="kpi-item group">
        <div class="kpi-icon-wrap" style="background:rgba(49,113,83,0.10)">
          <BarChart3 :size="16" class="text-primary" />
        </div>
        <div>
          <p class="kpi-num">{{ stats.deployments }}</p>
          <p class="kpi-lbl">{{ $t('DashboardView.deployments') }}</p>
        </div>
        <ArrowRight :size="14" class="ml-auto text-gray-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
      </RouterLink>

      <div class="kpi-divider" />

      <RouterLink to="/apps" class="kpi-item group">
        <div class="kpi-icon-wrap" style="background:rgba(228,140,42,0.10)">
          <Layers :size="16" class="text-accentYellow" />
        </div>
        <div>
          <p class="kpi-num">{{ stats.apps }}</p>
          <p class="kpi-lbl">{{ $t('DashboardView.apps') }}</p>
        </div>
        <ArrowRight :size="14" class="ml-auto text-gray-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
      </RouterLink>

      <div class="kpi-divider" />

      <RouterLink to="/courses" class="kpi-item group">
        <div class="kpi-icon-wrap" style="background:rgba(59,130,246,0.08)">
          <GraduationCap :size="16" class="text-blue-500" />
        </div>
        <div>
          <p class="kpi-num">{{ stats.courses }}</p>
          <p class="kpi-lbl">{{ $t('DashboardView.courses') }}</p>
        </div>
        <ArrowRight :size="14" class="ml-auto text-gray-300 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
      </RouterLink>
    </div>

    <!-- Bottom grid -->
    <div class="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">

      <!-- Activity -->
      <div class="lg:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <div class="flex items-center gap-2">
            <h2 class="text-sm font-semibold text-gray-900">{{ $t('DashboardView.activity') }}</h2>
            <span class="px-1.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">3</span>
          </div>
          <RouterLink :to="{ name: 'deployments.list' }" class="text-xs font-medium text-primary hover:text-primaryDark flex items-center gap-1 transition-colors">
            Alle anzeigen <ArrowRight :size="12" />
          </RouterLink>
        </div>

        <div class="divide-y divide-gray-50">
          <div class="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style="background:rgba(49,113,83,0.08)">
              <Layers :size="14" class="text-primary" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900">{{ $t('DashboardView.appUpdated') }}</p>
              <p class="text-xs text-gray-400 mt-0.5 truncate">NodeJS App v1.2 wurde aktualisiert</p>
            </div>
            <div class="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
              <CheckCircle2 :size="13" class="text-emerald-400" />
              <span>2 min</span>
            </div>
          </div>

          <div class="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style="background:rgba(49,113,83,0.08)">
              <BarChart3 :size="14" class="text-primary" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900">{{ $t('DashboardView.deploymentCreated') }}</p>
              <p class="text-xs text-gray-400 mt-0.5 truncate">NodeJS-WWI23SEB wurde erstellt</p>
            </div>
            <div class="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
              <Clock :size="13" />
              <span>{{ $t('DashboardView.today') }}</span>
            </div>
          </div>

          <div class="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style="background:rgba(59,130,246,0.08)">
              <GraduationCap :size="14" class="text-blue-500" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-gray-900">{{ $t('DashboardView.courseEdited') }}</p>
              <p class="text-xs text-gray-400 mt-0.5 truncate">Kubernetes Grundlagen bearbeitet</p>
            </div>
            <div class="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
              <Clock :size="13" />
              <span>{{ $t('DashboardView.yesterday') }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Quotas -->
      <div class="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <h2 class="text-sm font-semibold text-gray-900">{{ $t('DashboardView.availableResources') }}</h2>
          <span v-if="quotasLoading && hasCachedQuotas" class="flex items-center gap-1.5 text-xs text-gray-400">
            <Loader2 :size="12" class="animate-spin" />
          </span>
        </div>

        <div v-if="quotasLoading && !hasCachedQuotas" class="px-5 py-4 space-y-4">
          <div v-for="i in 5" :key="i" class="animate-pulse space-y-2">
            <div class="flex justify-between">
              <div class="h-3 bg-gray-100 rounded w-20" />
              <div class="h-3 bg-gray-100 rounded w-10" />
            </div>
            <div class="h-1.5 bg-gray-100 rounded-full" />
          </div>
        </div>

        <div v-else-if="formattedQuotas.length > 0" class="px-5 py-4 space-y-3.5">
          <div v-for="quota in formattedQuotas" :key="quota.label">
            <div class="flex items-center justify-between mb-1.5">
              <div class="flex items-center gap-1.5">
                <component :is="quota.icon" :size="12" class="text-gray-400" />
                <span class="text-xs font-medium text-gray-700">{{ quota.label }}</span>
              </div>
              <span class="text-xs font-semibold tabular-nums" :class="quota.percentage >= 80 ? 'text-red-500' : quota.percentage >= 60 ? 'text-amber-500' : 'text-gray-600'">
                {{ quota.used }}/{{ quota.limit }}{{ quota.unit }}
              </span>
            </div>
            <div class="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <div :class="getColorClass(quota.percentage)" class="h-1.5 rounded-full transition-all duration-700" :style="{ width: `${quota.percentage}%` }" />
            </div>
            <div class="flex items-center justify-between mt-1">
              <p class="text-xs text-gray-400">{{ quota.percentage }}% ausgelastet</p>
              <AlertCircle v-if="quota.percentage >= 80" :size="11" class="text-red-400" />
            </div>
          </div>
        </div>

        <div v-else-if="needsCredentials" class="px-5 py-10 text-center">
          <div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <XCircle :size="20" class="text-gray-400" />
          </div>
          <p class="text-sm font-medium text-gray-700">Keine Credentials hinterlegt</p>
          <p class="text-xs text-gray-400 mt-1 mb-4">Hinterlege deine OpenStack-Zugangsdaten.</p>
          <RouterLink to="/user/openstack" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primaryDark transition-colors">
            Jetzt einrichten <ArrowRight :size="12" />
          </RouterLink>
        </div>

        <div v-else class="px-5 py-10 text-center">
          <p class="text-sm text-gray-400">Quota-Daten konnten nicht geladen werden</p>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* Hero */
.hero-banner {
  background: linear-gradient(135deg, #317153 0%, #1e4a32 60%, #173325 100%);
  border-radius: 20px;
  padding: 28px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  overflow: hidden;
}

.hero-banner::before {
  content: '';
  position: absolute;
  top: -40px;
  right: -40px;
  width: 200px;
  height: 200px;
  background: rgba(255,255,255,0.04);
  border-radius: 50%;
}

.hero-banner::after {
  content: '';
  position: absolute;
  bottom: -60px;
  right: 80px;
  width: 160px;
  height: 160px;
  background: rgba(255,255,255,0.03);
  border-radius: 50%;
}

.hero-content {
  position: relative;
  z-index: 1;
}

.hero-cta {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: rgba(255,255,255,0.15);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.25);
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
  border-radius: 12px;
  text-decoration: none;
  transition: background 150ms, border-color 150ms;
  white-space: nowrap;
}

.hero-cta:hover {
  background: rgba(255,255,255,0.22);
  border-color: rgba(255,255,255,0.35);
}

/* KPI row */
.kpi-row {
  background: white;
  border-radius: 16px;
  border: 1px solid #f0f0f0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  display: grid;
  grid-template-columns: 1fr auto 1fr auto 1fr;
  overflow: hidden;
}

.kpi-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 24px;
  text-decoration: none;
  transition: background 150ms;
}

.kpi-item:hover {
  background: #fafafa;
}

.kpi-divider {
  width: 1px;
  background: #f0f0f0;
  margin: 12px 0;
}

.kpi-icon-wrap {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.kpi-num {
  font-size: 1.75rem;
  font-weight: 700;
  color: #111827;
  line-height: 1;
}

.kpi-lbl {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #9ca3af;
  margin-top: 3px;
}
</style>
