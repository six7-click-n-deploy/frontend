import { mount } from '@vue/test-utils'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import NewDeploymentSummaryView from '@/views/NewDeploymentSummaryView.vue'

let mockRouterPush = vi.fn()
let currentStore: any = null
let currentAppStore: any = null

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: (...args: any[]) => mockRouterPush(...args) }) }))

vi.mock('@/stores/deployment.store', () => ({
  useDeploymentStore: () => currentStore,
}))

vi.mock('@/stores/app.store', () => ({
  useAppStore: () => currentAppStore,
}))

vi.mock('@/stores/toast.store', () => ({
  useToastStore: () => ({ addToast: vi.fn() }),
}))

vi.mock('@/api/user.api', () => ({
  userApi: { list: vi.fn(() => Promise.resolve({ data: [] })) },
}))

describe('NewDeploymentSummaryView', () => {
  beforeEach(() => {
    mockRouterPush = vi.fn()

    currentStore = {
      draft: {
        name: 'My Deployment',
        appId: 'app-1',
        releaseTag: 'v1.2.3',
        studentIds: ['s1'],
        groupCount: 1,
        groupMode: 'custom',
        groupNames: ['Team A'],
        assignments: [[]],
        userInputVar: '',
      },
      studentCache: new Map(),
      isLoading: false,
      submitDraft: vi.fn(() => Promise.resolve({ deploymentId: 'd1' })),
    }

    currentAppStore = {
      apps: [{ appId: 'app-1', name: 'Test App', image: '' }],
      fetchApps: vi.fn(() => Promise.resolve()),
      fetchAppVariables: vi.fn(() => Promise.resolve([])),
    }
  })

  it('renders basic summary info (name, app name, version)', async () => {
    const wrapper = mount(NewDeploymentSummaryView, { global: { stubs: ['DeploymentProgressBar','BarChart3','Box','Layers','ArrowRight','ArrowLeft'] } })
    await new Promise(r => setTimeout(r, 0))

    expect(wrapper.text()).toContain('My Deployment')
    expect(wrapper.text()).toContain('Test App')
    expect(wrapper.text()).toContain('v1.2.3')
  })

  it('navigates to variables page when clicking Bearbeiten', async () => {
    const wrapper = mount(NewDeploymentSummaryView, { global: { stubs: ['DeploymentProgressBar','ArrowRight'] } })
    await new Promise(r => setTimeout(r, 0))

    const btn = wrapper.findAll('button').find(b => b.text().includes('deployment.actions.deploy') === false && b.text().includes('Bearbeiten'))
    // fallback: find by text that includes 'Bearbeiten'
    const editBtn = wrapper.findAll('button').find(b => b.text().includes('Bearbeiten'))
    expect(editBtn).toBeTruthy()
    await (editBtn as any).trigger('click')

    expect(mockRouterPush).toHaveBeenCalledWith({ name: 'deployment.variables' })
  })

  it('loads variables and shows formatted values from defaults and user overrides', async () => {
    // prepare app variables and a user override
    currentAppStore.fetchAppVariables = vi.fn(() => Promise.resolve([
      { name: 'pk1', source: 'packer', default: 'def' },
      { name: 'tf1', source: 'terraform', default: true },
    ]))

    // set a user override JSON string
    currentStore.draft.userInputVar = JSON.stringify({ pk1: 'over', tf1: false })

    const wrapper = mount(NewDeploymentSummaryView, { global: { stubs: ['DeploymentProgressBar','Box','Layers'] } })
    // allow onMounted tasks to complete
    await new Promise(r => setTimeout(r, 0))

    // Check that packer and terraform labels/values are visible
    expect(wrapper.text()).toContain('pk1')
    expect(wrapper.text()).toContain('over')
    // boolean false is rendered as 'Nein'
    expect(wrapper.text()).toContain('Nein')
  })

  it('handleDeploy maps users and submits draft then navigates on success', async () => {
    // prepare userApi.list to return mapping from keycloak to userId
    const { userApi } = await import('@/api/user.api')
    ;(userApi.list as any).mockResolvedValue({ data: [{ userId: 'u1', keycloak_id: 'kc1' }] })

    // prepare assignments using keycloak id
    currentStore.draft.assignments = { 0: ['kc1'] }
    currentStore.draft.studentIds = ['s1']

    const wrapper = mount(NewDeploymentSummaryView, { global: { stubs: ['DeploymentProgressBar'] } })
    await new Promise(r => setTimeout(r, 0))

    // click deploy button
    const deployBtn = wrapper.findAll('button').find(b => b.text().includes('deployment.actions.deploy'))
    expect(deployBtn).toBeTruthy()
    await (deployBtn as any).trigger('click')

    // allow async actions
    await new Promise(r => setTimeout(r, 0))

    // submitDraft should have been called and navigation to deployments.list should occur
    expect(currentStore.submitDraft).toHaveBeenCalled()
    expect(mockRouterPush).toHaveBeenCalledWith({ name: 'deployments.list' })
  })
})
