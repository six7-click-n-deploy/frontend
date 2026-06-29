<script setup lang="ts">
import { computed } from "vue"
import { useRole } from "@/composables/useRole"

/**
 * Conditional slot wrapper for permission-gated template content.
 *
 *   <RoleGate admin>…</RoleGate>          – nur Admins sehen den Slot
 *   <RoleGate staff>…</RoleGate>          – Teacher + Admin
 *   <RoleGate :can="canEditApp(app)">…</RoleGate>
 *
 * The capability checks (``can``) are evaluated by the parent and
 * passed in as a plain boolean — the gate component itself stays
 * thin and does not know about specific resources.
 */
const props = defineProps<{
  admin?: boolean
  staff?: boolean
  can?: boolean
}>()

const { isAdmin, isStaff } = useRole()
const allow = computed(() => {
  if (props.admin) return isAdmin.value
  if (props.staff) return isStaff.value
  if (props.can !== undefined) return props.can
  return true
})
</script>

<template>
  <slot v-if="allow" />
</template>
