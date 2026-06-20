import { mount } from '@vue/test-utils'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { reactive } from 'vue'
import NewDeploymentVariableView from '@/views/NewDeploymentVariableView.vue'

let mockRouterPush = vi.fn()
let mockRouterReplace = vi.fn()
let currentStore: any = null
let currentAppStore: any = null
let mockUseToast: any = { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn(), clear: vi.fn() }

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: (...args: any[]) => mockRouterPush(...args), replace: (...args: any[]) => mockRouterReplace(...args) }) }))

vi.mock('@/stores/deployment.store', () => ({
  useDeploymentStore: () => currentStore,
}))

vi.mock('@/stores/app.store', () => ({
  useAppStore: () => currentAppStore,
}))

vi.mock('@/composables/useToast', () => ({ useToast: () => mockUseToast }))

describe('NewDeploymentVariableView', () => {
  beforeEach(() => {
    mockRouterPush = vi.fn()
    mockRouterReplace = vi.fn()
    vi.clearAllMocks()

    currentStore = reactive({
      draft: {
        name: 'My Deployment',
        appId: 'app-1',
        releaseTag: 'v1.0.0',
        variableDefinitions: undefined,
        variables: {},
        userInputVar: '',
      },
      isLoading: false,
    })

    currentAppStore = reactive({
      apps: [{ appId: 'app-1', name: 'Test App', image: '' }],
      fetchApps: vi.fn(() => Promise.resolve()),
      fetchAppVariables: vi.fn(() => Promise.resolve([
        { name: 'pk_list', source: 'packer', type: 'list(string)', default: ['a','b'], description: 'List desc' },
        { name: 'pk_str', source: 'packer', type: 'string', default: 'def' },
        { name: 'tf_num', source: 'terraform', type: 'number', default: 3 },
        { name: 'tf_bool', source: 'terraform', type: 'bool', default: true, required: true },
      ])),
    })
  })

  // --- INITIALISIERUNG & ROUTING ---

  it('redirects to /apps if appId is missing', async () => {
    currentStore.draft.appId = null
    mount(NewDeploymentVariableView, { global: { stubs: ['DeploymentProgressBar','Box','Layers','Info','ArrowLeft','ArrowRight'] } })
    await new Promise(r => setTimeout(r, 0))
    expect(mockRouterReplace).toHaveBeenCalledWith('/apps')
  })

  it('uses cached variableDefinitions and skips API call if present', async () => {
    currentStore.draft.variableDefinitions = [
      { name: 'cached_var', source: 'packer', type: 'string', default: 'cache_def' }
    ]
    const wrapper = mount(NewDeploymentVariableView, { global: { stubs: ['DeploymentProgressBar','Box','Layers','Info'] } })
    await new Promise(r => setTimeout(r, 0))

    expect(currentAppStore.fetchAppVariables).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('cached_var')
  })

  it('parses object releaseTag and handles object userInputVar correctly', async () => {
    currentStore.draft.releaseTag = { version: 'v2.0.0' } // Als Objekt
    currentStore.draft.userInputVar = { tf_num: 42 } // Als Objekt
    
    mount(NewDeploymentVariableView, { global: { stubs: ['DeploymentProgressBar','Box','Layers','Info'] } })
    await new Promise(r => setTimeout(r, 0))

    expect(currentAppStore.fetchAppVariables).toHaveBeenCalledWith('app-1', 'v2.0.0')
    expect(currentStore.draft.variables.tf_num).toBeUndefined() // API Def takes precedence in local state test context, but formValues are populated
  })

  // --- RENDERING & UI ZUSTÄNDE ---

  it('renders empty state when no variables are required', async () => {
    currentAppStore.fetchAppVariables.mockResolvedValue([])
    const wrapper = mount(NewDeploymentVariableView, { global: { stubs: ['DeploymentProgressBar','Box','Layers','Info'] } })
    await new Promise(r => setTimeout(r, 0))

    expect(wrapper.text()).toContain('Diese App benötigt keine speziellen Variablen.')
  })

  it('renders headings and sections', async () => {
    const wrapper = mount(NewDeploymentVariableView, { global: { stubs: ['DeploymentProgressBar','Box','Layers','Info','ArrowLeft','ArrowRight'] } })
    await new Promise(r => setTimeout(r, 0))

    expect(wrapper.text()).toContain('Variablen Konfiguration')
    expect(wrapper.text()).toContain('Packer Variablen')
    expect(wrapper.text()).toContain('Terraform Variablen')
  })

  it('loads variables and fills form with defaults', async () => {
    const wrapper = mount(NewDeploymentVariableView, { global: { stubs: ['DeploymentProgressBar','Box','Layers','Info'] } })
    await new Promise(r => setTimeout(r, 0))

    const listEl = wrapper.find('#pk_list')
    expect(listEl.exists()).toBe(true)
    expect((listEl.element as HTMLTextAreaElement).value).toBe('a, b')

    const numEl = wrapper.find('#tf_num')
    expect(numEl.exists()).toBe(true)
    expect((numEl.element as HTMLInputElement).value).toBe('3')

    expect(wrapper.text()).toContain('Aktiviert') // bool ist true
  })

  // --- DOM INTERAKTIONEN ---

  it('focuses input element when label is clicked (focusInput helper)', async () => {
    const wrapper = mount(NewDeploymentVariableView, { global: { stubs: ['DeploymentProgressBar','Box','Layers','Info'] } })
    await new Promise(r => setTimeout(r, 0))

    // DOM API mocken
    const focusMock = vi.fn()
    const getElementByIdSpy = vi.spyOn(document, 'getElementById').mockReturnValue({ focus: focusMock } as any)

    const vm: any = wrapper.vm
    vm.focusInput('tf_num')

    expect(getElementByIdSpy).toHaveBeenCalledWith('tf_num')
    expect(focusMock).toHaveBeenCalled()
    
    getElementByIdSpy.mockRestore()
  })

  it('toggles tooltip and shows info for list variables', async () => {
    const wrapper = mount(NewDeploymentVariableView, { global: { stubs: ['DeploymentProgressBar','Box','Layers','Info'] } })
    await new Promise(r => setTimeout(r, 0))

    const infoBtn = wrapper.findAll('button').find(b => b.attributes('title') === 'Info anzeigen')
    expect(infoBtn).toBeTruthy()
    await (infoBtn as any).trigger('click')
    expect(wrapper.text()).toContain('List desc')
    expect(wrapper.text()).toContain('Mehrere Werte mit Komma trennen')
  })

  // --- OPENSTACK PICKER & LOGIK ---

  it('renders OpenStackResourcePicker and computes subnet network dependency', async () => {
    currentAppStore.fetchAppVariables.mockResolvedValue([
      { name: 'net_id', source: 'terraform', type: 'string', osType: 'network', osMode: 'id' },
      { name: 'sub_id', source: 'terraform', type: 'string', osType: 'subnet' }
    ])

    const wrapper = mount(NewDeploymentVariableView, { global: { stubs: ['DeploymentProgressBar','Box','Layers','Info', 'OpenStackResourcePicker'] } })
    await new Promise(r => setTimeout(r, 0))

    const vm: any = wrapper.vm
    // Set network value
    vm.formValues['net_id'] = 'network-uuid-123'
    
    // Check if subnet correctly finds its parent network ID
    const subnetVar = vm.variables.find((v: any) => v.name === 'sub_id')
    const filterId = vm.findNetworkValueForSubnet(subnetVar)
    
    expect(filterId).toBe('network-uuid-123')
  })

  it('findNetworkValueForSubnet returns null if no valid network id is set', async () => {
    currentAppStore.fetchAppVariables.mockResolvedValue([
      { name: 'net_id', source: 'terraform', type: 'string', osType: 'network', osMode: 'name' }, // Mode name instead of id
      { name: 'sub_id', source: 'terraform', type: 'string', osType: 'subnet' }
    ])

    const wrapper = mount(NewDeploymentVariableView, { global: { stubs: ['DeploymentProgressBar','Box','Layers','Info'] } })
    await new Promise(r => setTimeout(r, 0))

    const vm: any = wrapper.vm
    const subnetVar = vm.variables.find((v: any) => v.name === 'sub_id')
    expect(vm.findNetworkValueForSubnet(subnetVar)).toBeNull()
  })

  // --- HILFSFUNKTIONEN (NORMALISIERUNG) ---

  it('normalizeValue handles lists correctly (string vs array, sorting)', async () => {
    const wrapper = mount(NewDeploymentVariableView, { global: { stubs: ['DeploymentProgressBar','Box','Layers','Info'] } })
    await new Promise(r => setTimeout(r, 0))

    const vm: any = wrapper.vm
    // Test: String mit Spaces wird getrimmt und als Array JSON sortiert
    expect(vm.normalizeValue('c, a, b ', 'list(string)')).toEqual(JSON.stringify(['a', 'b', 'c']))
    // Test: Bereits existierendes Array
    expect(vm.normalizeValue(['b', 'a'], 'set(string)')).toEqual(JSON.stringify(['a', 'b']))
    // Test: Fallback bei Skalar in List-Typ
    expect(vm.normalizeValue('singleValue', 'list')).toEqual(JSON.stringify(['singleValue']))
  })

  it('normalizeValue handles null/undefined and types correctly', async () => {
    const wrapper = mount(NewDeploymentVariableView, { global: { stubs: ['DeploymentProgressBar','Box','Layers','Info'] } })
    await new Promise(r => setTimeout(r, 0))

    const vm: any = wrapper.vm
    expect(vm.normalizeValue(null, 'list(string)')).toEqual([])
    expect(vm.normalizeValue(undefined, 'bool')).toEqual(false)
    expect(vm.normalizeValue(null, 'number')).toEqual('')
    expect(vm.normalizeValue('  abc  ', 'string')).toEqual('abc')
  })

  // --- SPEICHERN & NAVIGATION ---

  it('navigates back and next; handleNext saves only changed values', async () => {
    const wrapper = mount(NewDeploymentVariableView, { global: { stubs: ['DeploymentProgressBar','Box','Layers','Info','ArrowLeft','ArrowRight'] } })
    await new Promise(r => setTimeout(r, 0))

    const listEl = wrapper.find('#pk_list')
    await (listEl as any).setValue('a, b, c')

    const numEl = wrapper.find('#tf_num')
    await (numEl as any).setValue('5')

    ;(wrapper.vm as any).formValues['tf_bool'] = false

    const nextBtn = wrapper.findAll('button').find(b => b.text().includes('deployment.actions.next'))
    expect(nextBtn).toBeTruthy()
    await (nextBtn as any).trigger('click')

    expect(mockRouterPush).toHaveBeenCalledWith({ name: 'deployment.summary' })

    const saved = JSON.parse(currentStore.draft.userInputVar)
    expect(saved.pk_list).toEqual(['a','b','c'])
    expect(saved.tf_num).toEqual(5)
    expect(saved.tf_bool).toEqual(false)
  })

  it('navigates back when clicking back button', async () => {
    const wrapper = mount(NewDeploymentVariableView, { global: { stubs: ['DeploymentProgressBar','ArrowLeft'] } })
    await new Promise(r => setTimeout(r, 0))

    const backBtn = wrapper.findAll('button').find(b => b.text().includes('deployment.actions.back'))
    expect(backBtn).toBeTruthy()
    await (backBtn as any).trigger('click')
    expect(mockRouterPush).toHaveBeenCalledWith({ name: 'deployment.teams' })
  })

  // --- FEHLERBEHANDLUNG (TOASTS) ---

  it('shows toast when variable markerError exists', async () => {
    currentAppStore.fetchAppVariables = vi.fn(() => Promise.resolve([
      { name: 'bad', source: 'packer', type: 'string', markerError: { variable: 'bad', message: 'boom', location: 'L1' } }
    ]))

    mount(NewDeploymentVariableView, { global: { stubs: ['DeploymentProgressBar','Box','Layers','Info'] } })
    await new Promise(r => setTimeout(r, 0))

    expect(mockUseToast.error).toHaveBeenCalled()
  })

  it('shows toast when draft.userInputVar contains invalid JSON', async () => {
    currentStore.draft.userInputVar = 'not a json'

    mount(NewDeploymentVariableView, { global: { stubs: ['DeploymentProgressBar','Box','Layers','Info'] } })
    await new Promise(r => setTimeout(r, 0))

    expect(mockUseToast.error).toHaveBeenCalled()
  })
})