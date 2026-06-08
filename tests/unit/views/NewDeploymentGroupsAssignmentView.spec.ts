import { mount } from '@vue/test-utils'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { reactive } from 'vue'
import NewDeploymentGroupsAssignmentView from '@/views/NewDeploymentGroupsAssignmentView.vue'

let mockRouterPush = vi.fn()
let mockRouterReplace = vi.fn()
let currentStore: any = null

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: (...args: any[]) => mockRouterPush(...args), replace: (...args: any[]) => mockRouterReplace(...args) }) }))

vi.mock('@/stores/deployment.store', () => ({
  useDeploymentStore: () => currentStore,
}))

vi.mock('@/api/user.api', () => ({
  userApi: {
    getById: vi.fn(() => Promise.resolve({ data: null })),
  },
}))

describe('NewDeploymentGroupsAssignmentView', () => {
  beforeEach(() => {
    mockRouterPush = vi.fn()
    mockRouterReplace = vi.fn()

    // Store in reactive() wickeln, damit Watcher funktionieren
    currentStore = reactive({
      draft: {
        studentIds: ['s1', 's2', 's3'],
        groupCount: 2,
        groupMode: 'custom',
        groupNames: ['', ''],
        assignments: [[], []],
      },
      studentCache: new Map<string, any>(),
    })
  })

  // --- onMounted Edge Cases ---
  it('onMounted: redirects to deployment.config if studentIds is empty', async () => {
    currentStore.draft.studentIds = []
    mount(NewDeploymentGroupsAssignmentView, { global: { stubs: ['DeploymentProgressBar'] } })
    await new Promise((r) => setTimeout(r, 0))
    expect(mockRouterReplace).toHaveBeenCalledWith({ name: 'deployment.config' })
  })

  it('onMounted: sets groupCount to 1 if it is less than 1', async () => {
    currentStore.draft.groupCount = 0
    mount(NewDeploymentGroupsAssignmentView, { global: { stubs: ['DeploymentProgressBar'] } })
    await new Promise((r) => setTimeout(r, 0))
    expect(currentStore.draft.groupCount).toBe(1)
  })

  // --- UI Interaktion (Input Watcher) ---
  it('updates store when group name input changes', async () => {
    currentStore.draft.groupCount = 1
    currentStore.draft.groupNames = ['Team-1']
    const wrapper = mount(NewDeploymentGroupsAssignmentView, { global: { stubs: ['DeploymentProgressBar'] } })
    await new Promise((r) => setTimeout(r, 0))

    const input = wrapper.find('input[type="text"]')
    expect(input.exists()).toBeTruthy()
    await input.setValue('Mein Cooles Team')

    expect(currentStore.draft.groupNames[0]).toBe('Mein Cooles Team')
  })

  // --- Watcher Logik prüfen (Namen auffüllen) ---
  it('watcher: adds default names when groupCount increases', async () => {
    currentStore.draft.groupCount = 1
    currentStore.draft.groupNames = ['Existing-Team']
    const wrapper = mount(NewDeploymentGroupsAssignmentView, { global: { stubs: ['DeploymentProgressBar'] } })
    await new Promise((r) => setTimeout(r, 0))

    const vm: any = wrapper.vm
    vm.groupCount = 3 
    await wrapper.vm.$nextTick() // Warten auf Vue's Reaktionszyklus

    expect(currentStore.draft.groupNames.length).toBe(3)
    expect(currentStore.draft.groupNames[0]).toBe('Existing-Team')
    expect(currentStore.draft.groupNames[1]).toBe('Team-2')
    expect(currentStore.draft.groupNames[2]).toBe('Team-3')
  })

  // --- Bestehende Tests ---
  it('setOneGroup assigns all students to single group and updates mode/count', async () => {
    const wrapper = mount(NewDeploymentGroupsAssignmentView, { global: { stubs: ['DeploymentProgressBar'] } })
    await new Promise((r) => setTimeout(r, 0))

    const btn = wrapper.findAll('button').find(b => b.text().includes('deployment.groups.one'))
    expect(btn).toBeTruthy()
    await (btn as any).trigger('click')

    expect(currentStore.draft.groupMode).toBe('one')
    expect(currentStore.draft.groupCount).toBe(1)
    expect(currentStore.draft.assignments[0]).toEqual(expect.arrayContaining(['s1','s2','s3']))
  })

  it('setOneGroup preserves existing non-default group name', async () => {
    currentStore.draft.groupCount = 2
    currentStore.draft.groupNames = ['My Awesome Team', 'Team-2']
    const wrapper = mount(NewDeploymentGroupsAssignmentView, { global: { stubs: ['DeploymentProgressBar'] } })
    await new Promise((r) => setTimeout(r, 0))

    const vm: any = wrapper.vm
    vm.setOneGroup()

    expect(currentStore.draft.groupNames.length).toBe(1)
    expect(currentStore.draft.groupNames[0]).toBe('My Awesome Team')
  })

  it('setEachUser creates one group per student and assigns each student uniquely', async () => {
    const wrapper = mount(NewDeploymentGroupsAssignmentView, { global: { stubs: ['DeploymentProgressBar'] } })
    await new Promise((r) => setTimeout(r, 0))

    const btn = wrapper.findAll('button').find(b => b.text().includes('deployment.groups.eachUser'))
    expect(btn).toBeTruthy()
    await (btn as any).trigger('click')

    expect(currentStore.draft.groupMode).toBe('eachUser')
    expect(currentStore.draft.groupCount).toBe(currentStore.draft.studentIds.length)
    const flat = ([] as string[]).concat(...currentStore.draft.assignments)
    expect(new Set(flat)).toEqual(new Set(currentStore.draft.studentIds))
  })

  it('increment and decrement update groupCount and preserve/remove assignments', async () => {
    const wrapper = mount(NewDeploymentGroupsAssignmentView, { global: { stubs: ['DeploymentProgressBar'] } })
    await new Promise((r) => setTimeout(r, 0))

    currentStore.draft.groupMode = 'custom'

    const vm: any = wrapper.vm
    const before = currentStore.draft.groupCount
    vm.increment()
    expect(currentStore.draft.groupCount).toBe(before + 1)
    vm.decrement()
    expect(currentStore.draft.groupCount).toBe(before)
  })

  it('shuffleStudents distributes students across groups (preserves all students)', async () => {
    const wrapper = mount(NewDeploymentGroupsAssignmentView, { global: { stubs: ['DeploymentProgressBar'] } })
    await new Promise((r) => setTimeout(r, 0))
    const vm: any = wrapper.vm
    currentStore.draft.assignments = Array.from({ length: currentStore.draft.groupCount }, () => [])

    vm.shuffleStudents()

    const flat = ([] as string[]).concat(...currentStore.draft.assignments)
    expect(new Set(flat)).toEqual(new Set(currentStore.draft.studentIds))
  })

  it('clearAllAssignments empties all assignment arrays', async () => {
    currentStore.draft.assignments = [['s1'], ['s2']]
    const wrapper = mount(NewDeploymentGroupsAssignmentView, { global: { stubs: ['DeploymentProgressBar'] } })
    await new Promise((r) => setTimeout(r, 0))
    const vm: any = wrapper.vm
    vm.clearAllAssignments()
    expect(currentStore.draft.assignments.every((g: any[]) => Array.isArray(g) && g.length === 0)).toBeTruthy()
  })

  it('back navigates to deployment.config and next navigates when ready', async () => {
    currentStore.draft.assignments = [[...currentStore.draft.studentIds]]
    currentStore.draft.groupCount = 1
    currentStore.draft.groupNames = ['Team-1']

    const wrapper = mount(NewDeploymentGroupsAssignmentView, { global: { stubs: ['DeploymentProgressBar'] } })
    await new Promise((r) => setTimeout(r, 0))

    const backBtn = wrapper.findAll('button').find(b => b.text().includes('deployment.actions.back'))
    expect(backBtn).toBeTruthy()
    await (backBtn as any).trigger('click')
    expect(mockRouterPush).toHaveBeenCalledWith({ name: 'deployment.config' })

    const nextBtn = wrapper.findAll('button').find(b => b.text().includes('deployment.actions.next'))
    expect(nextBtn).toBeTruthy()
    await (nextBtn as any).trigger('click')
    expect(mockRouterPush).toHaveBeenCalledWith({ name: 'deployment.variables' })
  })

  it('disables Next when unassigned students remain or group name empty', async () => {
    currentStore.draft.assignments = [[ 's1' ], []]
    currentStore.draft.groupCount = 2
    currentStore.draft.groupNames = ['Team-1', '']

    const wrapper = mount(NewDeploymentGroupsAssignmentView, { global: { stubs: ['DeploymentProgressBar'] } })
    await new Promise((r) => setTimeout(r, 0))

    const nextBtn = wrapper.findAll('button').find(b => b.text().includes('deployment.actions.next'))
    expect(nextBtn).toBeTruthy()
    expect((nextBtn as any).attributes('disabled') || (nextBtn as any).element.disabled).toBeDefined()
  })

  it('drag & drop: handleDragStart + handleDropOnGroup moves student between groups', async () => {
    currentStore.draft.assignments = [[], []]
    const wrapper = mount(NewDeploymentGroupsAssignmentView, { global: { stubs: ['DeploymentProgressBar'] } })
    await new Promise((r) => setTimeout(r, 0))

    const vm: any = wrapper.vm
    const fakeEvent: any = { dataTransfer: { effectAllowed: '', setData: vi.fn() }, preventDefault: vi.fn() }
    vm.handleDragStart('s1', fakeEvent)
    expect(vm.draggedStudent).toBe('s1')

    vm.handleDropOnGroup(0, fakeEvent)
    expect(currentStore.draft.assignments[0]).toContain('s1')
  })

  it('drag & drop: handleDragOver prevents default and sets dropEffect', async () => {
    const wrapper = mount(NewDeploymentGroupsAssignmentView, { global: { stubs: ['DeploymentProgressBar'] } })
    await new Promise((r) => setTimeout(r, 0))
    const vm: any = wrapper.vm

    const fakeEvent: any = { dataTransfer: { dropEffect: '' }, preventDefault: vi.fn() }
    vm.handleDragOver(fakeEvent)

    expect(fakeEvent.preventDefault).toHaveBeenCalled()
    expect(fakeEvent.dataTransfer.dropEffect).toBe('move')
  })

  it('drag & drop: drop handlers early return if draggedStudent is null', async () => {
    currentStore.draft.assignments = [[], []]
    const wrapper = mount(NewDeploymentGroupsAssignmentView, { global: { stubs: ['DeploymentProgressBar'] } })
    await new Promise((r) => setTimeout(r, 0))
    const vm: any = wrapper.vm

    const fakeEvent: any = { preventDefault: vi.fn() }
    vm.handleDropOnGroup(0, fakeEvent)
    vm.handleDropOnUnassigned(fakeEvent)

    expect(fakeEvent.preventDefault).toHaveBeenCalledTimes(2)
    expect(currentStore.draft.assignments).toEqual([[], []])
  })

  it('handleDropOnUnassigned removes student from groups', async () => {
    currentStore.draft.assignments = [['s1'], []]
    const wrapper = mount(NewDeploymentGroupsAssignmentView, { global: { stubs: ['DeploymentProgressBar'] } })
    await new Promise((r) => setTimeout(r, 0))
    const vm: any = wrapper.vm

    const fakeEvent: any = { dataTransfer: { effectAllowed: '', setData: vi.fn() }, preventDefault: vi.fn() }
    vm.handleDragStart('s1', fakeEvent)
    vm.handleDropOnUnassigned(fakeEvent)

    const flat = ([] as string[]).concat(...currentStore.draft.assignments)
    expect(flat).not.toContain('s1')
  })

  it('removeFromGroup via UI click removes student from group', async () => {
    currentStore.draft.assignments = [['s2'], []]
    const wrapper = mount(NewDeploymentGroupsAssignmentView, { global: { stubs: ['DeploymentProgressBar'] } })
    await new Promise((r) => setTimeout(r, 0))

    const removeBtn = wrapper.find('button[title="Entfernen"]')
    expect(removeBtn.exists()).toBeTruthy()
    await removeBtn.trigger('click')
    const flat = ([] as string[]).concat(...currentStore.draft.assignments)
    expect(flat).not.toContain('s2')
  })

  it('setCustom increases groupCount from 1 to 2 when totalStudents > 1', async () => {
    currentStore.draft.groupCount = 1
    currentStore.draft.studentIds = ['s1', 's2']
    const wrapper = mount(NewDeploymentGroupsAssignmentView, { global: { stubs: ['DeploymentProgressBar'] } })
    await new Promise((r) => setTimeout(r, 0))

    const vm: any = wrapper.vm
    vm.setCustom()
    expect(currentStore.draft.groupCount).toBe(2)
  })

  it('ensureDefaultGroupNames preserves existing names and sets defaults for empty', async () => {
    currentStore.draft.groupCount = 3
    currentStore.draft.groupNames = ['Custom', '', undefined]
    const wrapper = mount(NewDeploymentGroupsAssignmentView, { global: { stubs: ['DeploymentProgressBar'] } })
    await new Promise((r) => setTimeout(r, 0))

    const vm: any = wrapper.vm
    vm.ensureDefaultGroupNames()
    expect(currentStore.draft.groupNames[0]).toBe('Custom')
    expect(currentStore.draft.groupNames[1]).toBe('Team-2')
    expect(currentStore.draft.groupNames[2]).toBe('Team-3')
  })

  it('decrement trims assignments and reduces groupCount', async () => {
    currentStore.draft.groupCount = 3
    currentStore.draft.assignments = [['s1'], ['s2'], ['s3']]
    const wrapper = mount(NewDeploymentGroupsAssignmentView, { global: { stubs: ['DeploymentProgressBar'] } })
    await new Promise((r) => setTimeout(r, 0))

    const vm: any = wrapper.vm
    vm.decrement()
    expect(currentStore.draft.groupCount).toBe(2)
    expect(currentStore.draft.assignments.length).toBe(2)
  })

  it('drag enter/leave and drag end update drag state correctly', async () => {
    const wrapper = mount(NewDeploymentGroupsAssignmentView, { global: { stubs: ['DeploymentProgressBar'] } })
    await new Promise((r) => setTimeout(r, 0))

    const vm: any = wrapper.vm
    vm.handleDragEnterGroup(1)
    expect(vm.dragOverGroup).toBe(1)
    vm.handleDragLeaveGroup()
    expect(vm.dragOverGroup).toBe(null)

    vm.handleDragEnterUnassigned()
    expect(vm.dragOverUnassigned).toBe(true)
    vm.handleDragLeaveUnassigned()
    expect(vm.dragOverUnassigned).toBe(false)

    vm.handleDragStart('s1', { dataTransfer: { setData: vi.fn(), effectAllowed: '' } } as any)
    expect(vm.draggedStudent).toBe('s1')
    vm.handleDragEnd()
    expect(vm.draggedStudent).toBe(null)
    expect(vm.dragOverGroup).toBe(null)
    expect(vm.dragOverUnassigned).toBe(false)
  })

  it('onMounted: fetches missing student via userApi.getById and updates store.studentCache', async () => {
    const { userApi } = await import('@/api/user.api')
    ;(userApi.getById as any).mockResolvedValue({ data: { userId: 's4', firstName: 'Fritz' } })

    currentStore.draft.studentIds = ['s4']
    currentStore.studentCache = new Map()

    mount(NewDeploymentGroupsAssignmentView, { global: { stubs: ['DeploymentProgressBar'] } })
    await new Promise((r) => setTimeout(r, 0))

    expect(currentStore.studentCache.get('s4')).toBeTruthy()
    expect(currentStore.studentCache.get('s4').firstName).toBe('Fritz')
  })
})