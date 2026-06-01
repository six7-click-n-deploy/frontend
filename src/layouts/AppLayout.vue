<script setup lang="ts">
import {
  LayoutDashboard,
  BarChart3,
  Layers,
  GraduationCap,
  HelpCircle,
  Settings,
  User,
  LogOut
} from 'lucide-vue-next'

import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth.store'
import { useAuth } from '@/composables/useAuth'
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import logo from '@/assets/Six7-white-withoutBackground.png'

const { locale } = useI18n()
const authStore = useAuthStore()
const { logout } = useAuth()
const route = useRoute()

const userName = computed(() => authStore.user?.username || 'User')

// ÄNDERUNG: WIR PRÜFEN JETZT DIREKT, OB DER NAME ODER DIE URL "dashboard" ENTHÄLT
const isMeshBgActive = computed(() => {
  return route.name === 'dashboard' || route.path === '/'
})

const changeLocale = (value: string) => {
  locale.value = value
  localStorage.setItem('locale', value)
}
</script>


<template>
  <div class="h-screen flex bg-bgSoft overflow-hidden">

    <!-- Sidebar -->
  <aside class="w-64 sidebar-gradient text-white flex flex-col h-full flex-shrink-0">

      <!-- Logo -->
      <div class="h-16 flex items-center gap-4 px-6 pt-5">
        <!-- <span class="font-bold text-xl">SIX7 Click'n Deploy</span>-->
       <RouterLink to="/"> <img :src="logo" alt="SIX7 Click'n Deploy" class="h-15 w-auto" /></RouterLink>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 px-4 py-6 space-y-2 overflow-hidden text-xl">

        <RouterLink to="/" class="flex items-center gap-4 px-4 py-5 rounded-lg hover:bg-white/10"
          active-class="bg-white/20">
          <LayoutDashboard :size="22" />
          {{ $t('nav.dashboard') }}
        </RouterLink>

        <RouterLink :to="{ name: 'deployments.list' }" class="flex items-center gap-4 px-4 py-5 rounded-lg hover:bg-white/10"
          active-class="bg-white/20">
          <BarChart3 :size="22" />
          {{ $t('nav.deployments') }}
        </RouterLink>

        <RouterLink to="/apps" class="flex items-center gap-4 px-4 py-5 rounded-lg hover:bg-white/10"
          active-class="bg-white/20">
          <Layers :size="22" />
          {{ $t('nav.apps') }}
        </RouterLink>

          <RouterLink to="/courses" class="flex items-center gap-4 px-4 py-5 rounded-lg hover:bg-white/10"
          active-class="bg-white/20">
          <GraduationCap :size="22" />
          {{ $t('nav.courses') }}
        </RouterLink>

        <RouterLink to="/help" class="flex items-center gap-4 px-4 py-5 rounded-lg hover:bg-white/10"
          active-class="bg-white/20">
          <HelpCircle :size="22" />
          {{ $t('nav.help') }}
        </RouterLink>
      </nav>

      <!-- Config -->
      <RouterLink to="/config" class="group px-4 py-6 border-t border-accentYellow/30
         flex items-center gap-4 text-xl
         hover:bg-accentYellow/15 transition" active-class="bg-accentYellow/25 text-accentYellow font-semibold">
        <Settings :size="22" class="text-white group-hover:text-accentYellow" />
        {{ $t('nav.config') }}
      </RouterLink>


    </aside>

    <!-- Main Area -->
    <div class="flex-1 flex flex-col h-full">

      <!-- Header -->
      <header class="h-20 header-gradient text-white flex items-center justify-end px-8 flex-shrink-0">

        <!-- Right: Language + User -->
        <div class="flex items-center gap-4">

          <!-- 🌍 Sprachumschalter -->
          <select :value="locale" @change="changeLocale(($event.target as HTMLSelectElement).value)" class="bg-primary border border-accentYellow text-white
             rounded-md px-2 py-1 text-sm focus:outline-none">
            <option value="de">DE</option>
            <option value="en">EN</option>
          </select>

          <span class="text-sm opacity-90">
            {{ userName }}
          </span>

          <RouterLink to="/user" class="w-9 h-9 rounded-full border border-white/40
             hover:border-accentYellow hover:text-accentYellow
             transition flex items-center justify-center">
            <User :size="18" />
          </RouterLink>

          <button
            @click="logout"
            class="w-9 h-9 rounded-full border border-white/40
             hover:border-red-400 hover:text-red-400
             transition flex items-center justify-center"
            title="Abmelden"
          >
            <LogOut :size="18" />
          </button>

        </div>

      </header>


   <main 
        class="flex-1 overflow-y-auto p-10"
        :class="isMeshBgActive ? 'mesh-gradient-bg' : 'bg-bgSoft'"
      >
        <slot />
      </main>

    </div>
  </div>
</template>

<style scoped>
.mesh-gradient-bg {
  /* ÄNDERUNG: BASIS AUF REINES WEISS GEÄNDERT FÜR DIE HELLERE MITTE */
  background-color: #ffffff !important; 
  
  /* ÄNDERUNG: FARBEN DIREKT IN DIE ECKEN GEDRÜCKT (at top left, at bottom right, etc.) */
  /* DIE DECKKRAFT WURDE ERHÖHT, DAMIT ES GEGEN DAS WEISS GUT ZUR GELTUNG KOMMT */
  background-image: 
  /* radial-gradient(at top left, rgba(247, 148, 26, 0.121) 2px, transparent 55%),*/
    radial-gradient(at top left, #3c89655e 2px, transparent 55%),
    radial-gradient(at bottom right, #3c8965b0 0px, transparent 60%),
    radial-gradient(at top right, rgba(251, 251, 251, 0.258) 0px, transparent 45%),
    radial-gradient(at bottom left, rgba(16, 185, 129, 0.08) 0px, transparent 50%) !important;
}

.sidebar-gradient {
  background: linear-gradient(
    to bottom, 
    #317153 0px,      /* Startet mit Original-Grün */
   #317153 80px,     /* ÄNDERUNG: Bleibt die ersten 80px (Höhe des Headers!) exakt flach */
    #173325 100%    /* Verläuft erst danach ins Dunkle */
  ) !important;
}

.header-gradient {
  background: linear-gradient(
    to right, 
    #317153 0px,      /* Startet mit Original-Grün */
   #317153 100px,     /* ÄNDERUNG: Bleibt die ersten 80px (Höhe des Headers!) exakt flach */
    #234e38 100%    /* Verläuft erst danach ins Dunkle */
  ) !important;
}
</style>