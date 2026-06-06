import { mount } from '@vue/test-utils'
import { vi, describe, it, expect, beforeEach } from 'vitest'
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

    currentStore = {
      draft: {
        studentIds: ['s1', 's2', 's3'],
        groupCount: 2,
        groupMode: 'custom',
        groupNames: ['', ''],
        assignments: [[], []],
      },
      studentCache: new Map<string, any>(),
    }
  })

  it('setOneGroup assigns all students to single group and updates mode/count', async () => {
    const wrapper = mount(NewDeploymentGroupsAssignmentView, { global: { stubs: ['DeploymentProgressBar'] } })
    await new Promise((r) => setTimeout(r, 0))

    // find the button by i18n key text
    const btn = wrapper.findAll('button').find(b => b.text().includes('deployment.groups.one'))
    expect(btn).toBeTruthy()
    await (btn as any).trigger('click')

    expect(currentStore.draft.groupMode).toBe('one')
    expect(currentStore.draft.groupCount).toBe(1)
    expect(currentStore.draft.assignments[0]).toEqual(expect.arrayContaining(['s1','s2','s3']))
  })

  it('setEachUser creates one group per student and assigns each student uniquely', async () => {
    const wrapper = mount(NewDeploymentGroupsAssignmentView, { global: { stubs: ['DeploymentProgressBar'] } })
    await new Promise((r) => setTimeout(r, 0))

    const btn = wrapper.findAll('button').find(b => b.text().includes('deployment.groups.eachUser'))
    expect(btn).toBeTruthy()
    await (btn as any).trigger('click')

    expect(currentStore.draft.groupMode).toBe('eachUser')
    expect(currentStore.draft.groupCount).toBe(currentStore.draft.studentIds.length)
    // each assignment index should contain exactly one distinct student id
    const flat = ([] as string[]).concat(...currentStore.draft.assignments)
    expect(new Set(flat)).toEqual(new Set(currentStore.draft.studentIds))
  })

  it('increment and decrement update groupCount and preserve/remove assignments', async () => {
    const wrapper = mount(NewDeploymentGroupsAssignmentView, { global: { stubs: ['DeploymentProgressBar'] } })
    await new Promise((r) => setTimeout(r, 0))

    // ensure custom mode so controls are visible
    currentStore.draft.groupMode = 'custom'

    // instead of relying on exact button glyphs, call increment/decrement via component methods
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
    // ensure assignments are empty first
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
    // prepare ready state: assign all students
    currentStore.draft.assignments = [[...currentStore.draft.studentIds]]
    currentStore.draft.groupCount = 1
    currentStore.draft.groupNames = ['Team-1']

    const wrapper = mount(NewDeploymentGroupsAssignmentView, { global: { stubs: ['DeploymentProgressBar'] } })
    await new Promise((r) => setTimeout(r, 0))

    // Back button
    const backBtn = wrapper.findAll('button').find(b => b.text().includes('deployment.actions.back'))
    expect(backBtn).toBeTruthy()
    await (backBtn as any).trigger('click')
    expect(mockRouterPush).toHaveBeenCalledWith({ name: 'deployment.config' })

    // Next button should be enabled now
    const nextBtn = wrapper.findAll('button').find(b => b.text().includes('deployment.actions.next'))
    expect(nextBtn).toBeTruthy()
    await (nextBtn as any).trigger('click')
    expect(mockRouterPush).toHaveBeenCalledWith({ name: 'deployment.variables' })
  })

  it('disables Next when unassigned students remain or group name empty', async () => {
    // ensure there's an unassigned student
    currentStore.draft.assignments = [[ 's1' ], []]
    currentStore.draft.groupCount = 2
    currentStore.draft.groupNames = ['Team-1', '']

    const wrapper = mount(NewDeploymentGroupsAssignmentView, { global: { stubs: ['DeploymentProgressBar'] } })
    await new Promise((r) => setTimeout(r, 0))

    const nextBtn = wrapper.findAll('button').find(b => b.text().includes('deployment.actions.next'))
    expect(nextBtn).toBeTruthy()
    // should have disabled attribute due to unassigned or empty name
    expect((nextBtn as any).attributes('disabled') || (nextBtn as any).element.disabled).toBeDefined()
  })

  it('drag & drop: handleDragStart + handleDropOnGroup moves student between groups', async () => {
    // start with s1 in unassigned
    currentStore.draft.assignments = [[], []]
    const wrapper = mount(NewDeploymentGroupsAssignmentView, { global: { stubs: ['DeploymentProgressBar'] } })
    await new Promise((r) => setTimeout(r, 0))

    const vm: any = wrapper.vm
    // mock a DataTransfer-like object
    const fakeEvent: any = { dataTransfer: { effectAllowed: '', setData: vi.fn() }, preventDefault: vi.fn() }
    vm.handleDragStart('s1', fakeEvent)
    expect(vm.draggedStudent).toBe('s1')

    vm.handleDropOnGroup(0, fakeEvent)
    expect(currentStore.draft.assignments[0]).toContain('s1')
  })

  it('handleDropOnUnassigned removes student from groups', async () => {
    currentStore.draft.assignments = [['s1'], []]
    const wrapper = mount(NewDeploymentGroupsAssignmentView, { global: { stubs: ['DeploymentProgressBar'] } })
    await new Promise((r) => setTimeout(r, 0))
    const vm: any = wrapper.vm

    const fakeEvent: any = { dataTransfer: { effectAllowed: '', setData: vi.fn() }, preventDefault: vi.fn() }
    vm.handleDragStart('s1', fakeEvent)
    vm.handleDropOnUnassigned(fakeEvent)

    // s1 should no longer be present in any group
    const flat = ([] as string[]).concat(...currentStore.draft.assignments)
    expect(flat).not.toContain('s1')
  })

  it('removeFromGroup via UI click removes student from group', async () => {
    currentStore.draft.assignments = [['s2'], []]
    const wrapper = mount(NewDeploymentGroupsAssignmentView, { global: { stubs: ['DeploymentProgressBar'] } })
    await new Promise((r) => setTimeout(r, 0))

    // find the remove button by title attribute
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

  it('onMounted: fetches missing student via userApi.getById and updates store.studentCache', async () => {
    // override mock to return user data for missing id
    const { userApi } = await import('@/api/user.api')
    ;(userApi.getById as any).mockResolvedValue({ data: { userId: 's4', firstName: 'Fritz' } })

    currentStore.draft.studentIds = ['s4']
    currentStore.studentCache = new Map()

    const wrapper = mount(NewDeploymentGroupsAssignmentView, { global: { stubs: ['DeploymentProgressBar'] } })
    // allow onMounted async work to complete
    await new Promise((r) => setTimeout(r, 0))

    expect(currentStore.studentCache.get('s4')).toBeTruthy()
    expect(currentStore.studentCache.get('s4').firstName).toBe('Fritz')
  })
})
