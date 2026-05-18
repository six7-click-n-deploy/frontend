<script setup lang="ts">
import { AlertTriangle, HelpCircle, Layers, ShieldCheck, Sparkles, BookOpen } from 'lucide-vue-next'
</script>

<template>
  <div class="bg-white rounded-2xl p-10 border shadow-sm">
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
      <div class="flex items-center gap-4 text-primary">
        <HelpCircle :size="28" />
        <div>
          <h1 class="text-2xl font-bold">{{ $t('HelpView.title') }}</h1>
          <p class="text-sm text-gray-500">{{ $t('HelpView.subtitle') }}</p>
        </div>
      </div>
      <span class="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-semibold text-primary">
        <Sparkles :size="16" />
        {{ $t('HelpView.quickTip') }}
      </span>
    </div>

    <p class="text-gray-600 leading-7 max-w-3xl mb-8">
      {{ $t('HelpView.intro') }}
    </p>

    <div class="grid gap-4 lg:grid-cols-2">
      <article class="rounded-3xl border border-slate-200 bg-slate-50 p-6">
        <div class="flex items-center gap-3 mb-4 text-primary">
          <Layers :size="20" />
          <h2 class="text-lg font-semibold">{{ $t('HelpView.loggedInUsers.title') }}</h2>
        </div>
        <p class="text-gray-600 leading-7">
          {{ $t('HelpView.loggedInUsers.description') }}
        </p>
      </article>

      <article class="rounded-3xl border border-slate-200 bg-slate-50 p-6">
        <div class="flex items-center gap-3 mb-4 text-primary">
          <ShieldCheck :size="20" />
          <h2 class="text-lg font-semibold">{{ $t('HelpView.quota.title') }}</h2>
        </div>
        <p class="text-gray-600 leading-7 mb-4">
          {{ $t('HelpView.quota.description') }}
        </p>
        <ul class="list-disc list-inside space-y-2 text-gray-600">
          <li>{{ $t('HelpView.quota.item1') }}</li>
          <li>{{ $t('HelpView.quota.item2') }}</li>
          <li>{{ $t('HelpView.quota.item3') }}</li>
        </ul>
      </article>

      <article class="rounded-3xl border border-slate-200 bg-slate-50 p-6">
        <div class="flex items-center gap-3 mb-4 text-primary">
          <BookOpen :size="20" />
          <h2 class="text-lg font-semibold">{{ $t('HelpView.quickHelp.title') }}</h2>
        </div>
        <ol class="list-decimal list-inside space-y-3 text-gray-600">
          <li>{{ $t('HelpView.quickHelp.step1') }}</li>
          <li>{{ $t('HelpView.quickHelp.step2') }}</li>
          <li>{{ $t('HelpView.quickHelp.step3') }}</li>
          <li>{{ $t('HelpView.quickHelp.step4') }}</li>
        </ol>
      </article>

      <article class="rounded-3xl border border-slate-200 bg-slate-50 p-6">
        <div class="flex items-center gap-3 mb-4 text-primary">
          <AlertTriangle :size="20" />
          <h2 class="text-lg font-semibold">{{ $t('HelpView.troubleshooting.title') }}</h2>
        </div>
        <p class="text-gray-600 leading-7 mb-4">
          {{ $t('HelpView.troubleshooting.description') }}
        </p>
        <ul class="list-disc list-inside space-y-2 text-gray-600">
          <li>{{ $t('HelpView.troubleshooting.item1') }}</li>
          <li>{{ $t('HelpView.troubleshooting.item2') }}</li>
          <li>{{ $t('HelpView.troubleshooting.item3') }}</li>
        </ul>
      </article>
    </div>

    <div class="mt-10 rounded-3xl border border-slate-200 bg-slate-50 p-6">
      <h2 class="text-xl font-semibold mb-4">{{ $t('HelpView.faq.title') }}</h2>
      <dl class="space-y-6 text-gray-700">
        <div>
          <dt class="font-semibold">{{ $t('HelpView.faq.question1') }}</dt>
          <dd class="mt-2 text-gray-600">{{ $t('HelpView.faq.answer1') }}</dd>
        </div>
        <div>
          <dt class="font-semibold">{{ $t('HelpView.faq.question2') }}</dt>
          <dd class="mt-2 text-gray-600">{{ $t('HelpView.faq.answer2') }}</dd>
        </div>
        <div>
          <dt class="font-semibold">{{ $t('HelpView.faq.question3') }}</dt>
          <dd class="mt-2 text-gray-600">{{ $t('HelpView.faq.answer3') }}</dd>
        </div>
      </dl>
    </div>
  </div>
</template>
