import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia } from 'pinia'
import NewDeploymentGroupsAssignmentView from '@/views/NewDeploymentGroupsAssignmentView.vue'
import { useDeploymentStore } from '@/stores/deployment.store'

// Minimal mocks for i18n and router used by the component
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: () => {}, replace: () => {} }) }))

describe('NewDeploymentGroupsAssignmentView (integration)', () => {
  let pinia: any

  beforeEach(() => {
    pinia = createPinia()
  })

  it('applies default group names when switching to custom mode (Pinia integration)', async () => {
    const wrapper = mount(NewDeploymentGroupsAssignmentView, {
      global: { plugins: [pinia], stubs: ['DeploymentProgressBar'] }
    })

    // initialize store draft to single group with empty name and multiple students
    const store = useDeploymentStore()
    store.draft.groupCount = 1
    store.draft.groupNames = ['']
    store.draft.studentIds = ['s1', 's2', 's3']

    // Call the setCustom method via component instance which triggers ensureDefaultGroupNames
    const vm: any = wrapper.vm
    vm.setCustom()
    // wait for reactivity
    await new Promise((r) => setTimeout(r, 0))

    // The store draft should now have 2 group names with defaults
    expect(store.draft.groupCount).toBeGreaterThanOrEqual(2)
    expect(store.draft.groupNames.length).toBeGreaterThanOrEqual(2)
    expect(store.draft.groupNames[0]).toMatch(/Team-?1/i)
    expect(store.draft.groupNames[1]).toMatch(/Team-?2/i)
  })
})
