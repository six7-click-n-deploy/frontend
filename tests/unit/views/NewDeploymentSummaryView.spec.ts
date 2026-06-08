import { mount } from '@vue/test-utils'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { reactive } from 'vue'
import NewDeploymentSummaryView from '@/views/NewDeploymentSummaryView.vue'

let mockRouterPush = vi.fn()
let currentStore: any = null
let currentAppStore: any = null
let mockToastAdd = vi.fn()

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: (...args: any[]) => mockRouterPush(...args) }) }))

vi.mock('@/stores/deployment.store', () => ({
  useDeploymentStore: () => currentStore,
}))

vi.mock('@/stores/app.store', () => ({
  useAppStore: () => currentAppStore,
}))

vi.mock('@/stores/toast.store', () => ({
  useToastStore: () => ({ addToast: mockToastAdd }),
}))

vi.mock('@/api/user.api', () => ({
  userApi: { list: vi.fn(() => Promise.resolve({ data: [] })) },
}))
vi.mock('@/composables/useOpenStackResourceCache', () => ({
  ensureLoaded: vi.fn(() => Promise.resolve()),
  getDisplayName: vi.fn((type, mode, val) => ({ name: `PrettyName-${val}` })), // Val anhängen für Multi-Tests
}))

describe('NewDeploymentSummaryView', () => {
  beforeEach(() => {
    mockRouterPush = vi.fn()
    mockToastAdd.mockReset()

    // reactive() um Computed Properties (wie selectedApp) reaktiv zu halten
    currentStore = reactive({
      draft: {
        name: 'My Deployment',
        appId: 'app-1',
        releaseTag: { version: 'v1.2.3' }, // Teste die Objekt-Variante des Release-Tags
        studentIds: ['s1'],
        groupCount: 1,
        groupMode: 'custom',
        groupNames: ['Team A'],
        assignments: [[]],
        userInputVar: '',
        variables: null, // Testet Initialisierung
        variableDefinitions: null,
      },
      studentCache: new Map(),
      isLoading: false,
      submitDraft: vi.fn(() => Promise.resolve({ deploymentId: 'd1' })),
      resetDraft: vi.fn(),
    })

    currentAppStore = reactive({
      apps: [{ appId: 'app-1', name: 'Test App', image: '' }],
      fetchApps: vi.fn(() => Promise.resolve()),
      fetchAppVariables: vi.fn(() => Promise.resolve([])),
    })
  })

  // --- INITIALISIERUNG & STORE LOGIK ---
  
  it('calls fetchApps if apps array is empty on mount', async () => {
    currentAppStore.apps = []
    mount(NewDeploymentSummaryView, { global: { stubs: ['DeploymentProgressBar','BarChart3','Box','Layers','ArrowRight','ArrowLeft'] } })
    await new Promise(r => setTimeout(r, 0))
    expect(currentAppStore.fetchApps).toHaveBeenCalled()
  })

  it('aborts variable loading gracefully if no selected app matches', async () => {
    currentStore.draft.appId = 'does-not-exist'
    mount(NewDeploymentSummaryView, { global: { stubs: ['DeploymentProgressBar','BarChart3','Box','Layers','ArrowRight','ArrowLeft'] } })
    await new Promise(r => setTimeout(r, 0))
    expect(currentAppStore.fetchAppVariables).not.toHaveBeenCalled()
  })

  it('uses cached variableDefinitions if available to avoid API call', async () => {
    currentStore.draft.variableDefinitions = [{ name: 'cachedVar', source: 'packer' }]
    mount(NewDeploymentSummaryView, { global: { stubs: ['DeploymentProgressBar','BarChart3','Box','Layers','ArrowRight','ArrowLeft'] } })
    await new Promise(r => setTimeout(r, 0))
    expect(currentAppStore.fetchAppVariables).not.toHaveBeenCalled()
    expect(currentStore.draft.variables['cachedVar']).toBeUndefined() // nur Init
  })

  it('shows 500 server error toast if fetching variables fails', async () => {
    currentAppStore.fetchAppVariables.mockRejectedValue({ response: { status: 500 } })
    mount(NewDeploymentSummaryView, { global: { stubs: ['DeploymentProgressBar','BarChart3','Box','Layers','ArrowRight','ArrowLeft'] } })
    await new Promise(r => setTimeout(r, 0))
    expect(mockToastAdd).toHaveBeenCalledWith(expect.objectContaining({ message: 'Server Fehler (500). variables.tf nicht gefunden?' }))
  })

  // --- RENDERING & FORMATIERUNG ---

  it('renders basic summary info (name, app name, version from object)', async () => {
    const wrapper = mount(NewDeploymentSummaryView, { global: { stubs: ['DeploymentProgressBar','BarChart3','Box','Layers','ArrowRight','ArrowLeft'] } })
    await new Promise(r => setTimeout(r, 0))

    expect(wrapper.text()).toContain('My Deployment')
    expect(wrapper.text()).toContain('Test App')
    expect(wrapper.text()).toContain('v1.2.3') // Geparst aus { version: 'v1.2.3' }
  })

  it('displays correct group mode label', async () => {
    currentStore.draft.groupMode = 'one'
    let wrapper = mount(NewDeploymentSummaryView, { global: { stubs: ['DeploymentProgressBar','BarChart3','Box','Layers','ArrowRight','ArrowLeft'] } })
    await new Promise(r => setTimeout(r, 0))
    expect(wrapper.text()).toContain('deployment.groups.one')

    currentStore.draft.groupMode = 'eachUser'
    wrapper = mount(NewDeploymentSummaryView, { global: { stubs: ['DeploymentProgressBar','BarChart3','Box','Layers','ArrowRight','ArrowLeft'] } })
    await new Promise(r => setTimeout(r, 0))
    expect(wrapper.text()).toContain('deployment.groups.eachUser')
  })

  it('handles userInputVar when it is already a JS Object', async () => {
    currentAppStore.fetchAppVariables.mockResolvedValue([
      { name: 'pk1', source: 'packer', default: 'def' }
    ])
    // Mock user Input bereits als geparstes Objekt
    currentStore.draft.userInputVar = { pk1: 'objValue' }

    const wrapper = mount(NewDeploymentSummaryView, { global: { stubs: ['DeploymentProgressBar','Box','Layers'] } })
    await new Promise(r => setTimeout(r, 0))

    expect(wrapper.text()).toContain('pk1')
    expect(wrapper.text()).toContain('objValue')
  })

  it('formats array values correctly by stripping quotes in formatValue', async () => {
    currentAppStore.fetchAppVariables.mockResolvedValue([
      { name: 'arrVar', source: 'terraform', default: '[]' }
    ])
    currentStore.draft.variables = { arrVar: ['"val1"', '"val2"'] }

    const wrapper = mount(NewDeploymentSummaryView, { global: { stubs: ['DeploymentProgressBar','Box','Layers'] } })
    await new Promise(r => setTimeout(r, 0))

    expect(wrapper.text()).toContain('val1, val2')
  })

  it('renders multi-select OS values properly via renderOsValue', async () => {
    currentAppStore.fetchAppVariables.mockResolvedValue([
      { name: 'networks', source: 'terraform', osType: 'network', osMode: 'id', osMulti: true }
    ])
    // Comma-separated IDs
    currentStore.draft.variables = { networks: 'id-1, id-2' }

    const wrapper = mount(NewDeploymentSummaryView, { global: { stubs: ['DeploymentProgressBar','Box','Layers'] } })
    await new Promise(r => setTimeout(r, 0))

    // Unser Mock-getDisplayName returned `PrettyName-${val}`
    expect(wrapper.text()).toContain('PrettyName-id-1, PrettyName-id-2')
  })

  // --- NAVIGATION & INTERAKTION ---

  it('navigates to variables page when clicking Bearbeiten', async () => {
    const wrapper = mount(NewDeploymentSummaryView, { global: { stubs: ['DeploymentProgressBar','ArrowRight'] } })
    await new Promise(r => setTimeout(r, 0))

    const editBtn = wrapper.findAll('button').find(b => b.text().includes('Bearbeiten'))
    await (editBtn as any).trigger('click')
    expect(mockRouterPush).toHaveBeenCalledWith({ name: 'deployment.variables' })
  })

  it('navigates to variables page when clicking Zurück', async () => {
    const wrapper = mount(NewDeploymentSummaryView, { global: { stubs: ['DeploymentProgressBar','ArrowLeft'] } })
    await new Promise(r => setTimeout(r, 0))

    const backBtn = wrapper.findAll('button').find(b => b.text().includes('deployment.actions.back'))
    await (backBtn as any).trigger('click')
    expect(mockRouterPush).toHaveBeenCalledWith({ name: 'deployment.variables' })
  })

  // --- DEPLOY-LOGIK & FEHLER ---

  it('handleDeploy maps users and submits draft then navigates on success', async () => {
    const { userApi } = await import('@/api/user.api')
    ;(userApi.list as any).mockResolvedValue({ data: [{ userId: 'u1', keycloak_id: 'kc1' }] })

    currentStore.draft.assignments = { 0: ['kc1'] }
    currentStore.draft.studentIds = ['s1']

    const wrapper = mount(NewDeploymentSummaryView, { global: { stubs: ['DeploymentProgressBar'] } })
    await new Promise(r => setTimeout(r, 0))

    const deployBtn = wrapper.findAll('button').find(b => b.text().includes('deployment.actions.deploy'))
    await (deployBtn as any).trigger('click')
    await new Promise(r => setTimeout(r, 0))

    expect(currentStore.submitDraft).toHaveBeenCalled()
    expect(currentStore.resetDraft).toHaveBeenCalled()
    expect(mockRouterPush).toHaveBeenCalledWith({ name: 'deployments.list' })
  })

  it('shows toast and aborts when userApi.list fails', async () => {
    const { userApi } = await import('@/api/user.api')
    ;(userApi.list as any).mockRejectedValue(new Error('users fail'))

    const wrapper = mount(NewDeploymentSummaryView, { global: { stubs: ['DeploymentProgressBar'] } })
    await new Promise(r => setTimeout(r, 0))

    const deployBtn = wrapper.findAll('button').find(b => b.text().includes('deployment.actions.deploy'))
    await (deployBtn as any).trigger('click')
    await new Promise(r => setTimeout(r, 0))

    expect(currentStore.submitDraft).not.toHaveBeenCalled()
    expect(mockToastAdd).toHaveBeenCalled()
  })

  it('prevents double submit when clicking deploy twice quickly', async () => {
    const { userApi } = await import('@/api/user.api')
    ;(userApi.list as any).mockResolvedValue({ data: [{ userId: 'u1', keycloak_id: 'kc1' }] })

    let resolver: any = null
    currentStore.submitDraft = vi.fn(() => new Promise((res) => { resolver = res }))

    const wrapper = mount(NewDeploymentSummaryView, { global: { stubs: ['DeploymentProgressBar'] } })
    await new Promise(r => setTimeout(r, 0))

    const deployBtn = wrapper.findAll('button').find(b => b.text().includes('deployment.actions.deploy'))
    
    await (deployBtn as any).trigger('click')
    await (deployBtn as any).trigger('click')

    if (resolver) resolver({ deploymentId: 'd1' })
    await new Promise(r => setTimeout(r, 0))

    expect(currentStore.submitDraft).toHaveBeenCalledTimes(1)
  })

  it('shows toast and does not navigate when submitDraft fails', async () => {
    const { userApi } = await import('@/api/user.api')
    ;(userApi.list as any).mockResolvedValue({ data: [{ userId: 'u1', keycloak_id: 'kc1' }] })

    currentStore.submitDraft = vi.fn(() => Promise.reject(new Error('submit failed')))

    const wrapper = mount(NewDeploymentSummaryView, { global: { stubs: ['DeploymentProgressBar'] } })
    await new Promise(r => setTimeout(r, 0))

    const deployBtn = wrapper.findAll('button').find(b => b.text().includes('deployment.actions.deploy'))
    await (deployBtn as any).trigger('click')
    await new Promise(r => setTimeout(r, 0))

    expect(currentStore.submitDraft).toHaveBeenCalled()
    expect(mockRouterPush).not.toHaveBeenCalled()
    expect(mockToastAdd).toHaveBeenCalled()
  })

  it('shows toast when draft.userInputVar contains invalid JSON', async () => {
    currentStore.draft.userInputVar = 'not a json'
    mount(NewDeploymentSummaryView, { global: { stubs: ['DeploymentProgressBar','Box','Layers'] } })
    await new Promise(r => setTimeout(r, 0))
    expect(mockToastAdd).toHaveBeenCalled()
  })
})