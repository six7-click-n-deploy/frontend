<script setup lang="ts">
/**
 * Compact scope indicator for the deployment-wizard variable cards.
 *
 * Wraps the existing ``Badge`` component with scope-specific copy:
 *   * ``team`` → purple badge "Pro Team" + ``Users`` lucide icon
 *   * ``user`` → purple badge "Pro User" + ``User`` lucide icon
 *   * ``all``/undefined → nothing rendered (the calm default; the
 *     UI shows extra badges only when something deviates from the
 *     plain "one value for everyone" case).
 *
 * Why purple: the wizard already uses purple to signal "Terraform"
 * sections and the scope-banner uses the same hue, so a single
 * "this is a scope-coloured thing" mental model carries.
 *
 * The component intentionally accepts ``undefined`` (and not just
 * the literal scopes) so callers can ``<ScopeBadge :scope="v.varScope" />``
 * without a guard — that's the most common shape because backend
 * omits ``varScope`` from the variable payload when it's effectively
 * "all".
 */
import { Users, User } from 'lucide-vue-next'
import Badge from './Badge.vue'

defineProps<{
  scope?: 'all' | 'team' | 'user'
}>()
</script>

<template>
  <Badge v-if="scope === 'team'" variant="purple">
    <Users :size="12" class="mr-1" aria-hidden="true" />
    <span>Pro Team</span>
  </Badge>
  <Badge v-else-if="scope === 'user'" variant="purple">
    <User :size="12" class="mr-1" aria-hidden="true" />
    <span>Pro User</span>
  </Badge>
  <!--
    scope === 'all' or undefined: render nothing. The default case
    needs no marker — adding a "Für alle"-Badge to every plain
    variable would just be visual noise.
  -->
</template>
