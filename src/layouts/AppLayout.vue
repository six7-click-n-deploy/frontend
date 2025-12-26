<script setup lang="ts">
import {
  LayoutDashboard,
  BarChart3,
  Layers,
  GraduationCap,
  HelpCircle,
  Settings,
  User
} from 'lucide-vue-next'

import { useI18n } from 'vue-i18n'

import logo from '@/assets/Six7-white-withoutBackground.png'

const { locale } = useI18n()

const changeLocale = (value: string) => {
  locale.value = value
  localStorage.setItem('locale', value)
}
</script>


<template>
  <div class="h-screen flex bg-bgSoft overflow-hidden">

    <!-- Sidebar -->
    <aside class="w-64 bg-primary text-white flex flex-col h-full flex-shrink-0">

      <!-- Logo -->
      <div class="h-16 flex items-center gap-4 px-6 pt-5">
        <!-- <span class="font-bold text-xl">SIX7 Click'n Deploy</span>-->
        <img :src="logo" alt="SIX7 Click'n Deploy" class="h-15 w-auto" />
      </div>

      <!-- Navigation -->
      <nav class="flex-1 px-4 py-6 space-y-2 overflow-hidden text-lg">

        <RouterLink to="/" class="flex items-center gap-4 px-4 py-2 rounded-lg hover:bg-white/10"
          active-class="bg-white/20">
          <LayoutDashboard :size="22" />
          {{ $t('nav.dashboard') }}
        </RouterLink>

        <RouterLink to="/deployments" class="flex items-center gap-4 px-4 py-2 rounded-lg hover:bg-white/10"
          active-class="bg-white/20">
          <BarChart3 :size="22" />
          {{ $t('nav.deployments') }}
        </RouterLink>

        <RouterLink to="/templates" class="flex items-center gap-4 px-4 py-2 rounded-lg hover:bg-white/10"
          active-class="bg-white/20">
          <Layers :size="22" />
          {{ $t('nav.templates') }}
        </RouterLink>

          <RouterLink to="/courses" class="flex items-center gap-4 px-4 py-2 rounded-lg hover:bg-white/10"
          active-class="bg-white/20">
          <GraduationCap :size="22" />
          {{ $t('nav.courses') }}
        </RouterLink>

        <RouterLink to="/help" class="flex items-center gap-4 px-4 py-2 rounded-lg hover:bg-white/10"
          active-class="bg-white/20">
          <HelpCircle :size="22" />
          {{ $t('nav.help') }}
        </RouterLink>
      </nav>

      <!-- Config -->
      <RouterLink to="/config" class="group px-4 py-4 border-t border-accentYellow/30
         flex items-center gap-4 text-lg
         hover:bg-accentYellow/15 transition" active-class="bg-accentYellow/25 text-accentYellow font-semibold">
        <Settings :size="22" class="text-white group-hover:text-accentYellow" />
        {{ $t('nav.config') }}
      </RouterLink>


    </aside>

    <!-- Main Area -->
    <div class="flex-1 flex flex-col h-full">

      <!-- Header -->
      <header class="h-20 bg-primary text-white flex items-center justify-end px-8 flex-shrink-0">

        <!-- Right: Language + User -->
        <div class="flex items-center gap-4">

          <!-- 🌍 Sprachumschalter -->
          <select :value="locale" @change="changeLocale(($event.target as HTMLSelectElement).value)" class="bg-primary border border-accentYellow text-white
             rounded-md px-2 py-1 text-sm focus:outline-none">
            <option value="de">DE</option>
            <option value="en">EN</option>
          </select>

          <span class="text-sm opacity-90">
            Prof. Dr. Eichberg
          </span>

          <RouterLink to="/user" class="w-9 h-9 rounded-full border border-white/40
             hover:border-accentYellow hover:text-accentYellow
             transition flex items-center justify-center">
            <User :size="18" />
          </RouterLink>

        </div>

      </header>



      <main class="flex-1 overflow-y-auto p-10">
        <slot />
      </main>

    </div>
  </div>
</template>
