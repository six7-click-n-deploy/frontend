import { mount } from '@vue/test-utils'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import NewDeploymentVariableView from '@/views/NewDeploymentVariableView.vue'

let mockRouterPush = vi.fn()
let currentStore: any = null
let currentAppStore: any = null
let mockUseToast: any = { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn(), clear: vi.fn() }

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: (...args: any[]) => mockRouterPush(...args) }) }))

vi.mock('@/stores/deployment.store', () => ({
  useDeploymentStore: () => currentStore,
}))

vi.mock('@/stores/app.store', () => ({
  useAppStore: () => currentAppStore,
}))

vi.mock('@/composables/useToast', () => ({ useToast: () => mockUseToast }))

vi.mock('@/stores/toast.store', () => ({
  useToastStore: () => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn(), clear: vi.fn() }),
}))

describe('NewDeploymentVariableView', () => {
  beforeEach(() => {
    mockRouterPush = vi.fn()

    currentStore = {
      draft: {
        name: 'My Deployment',
        appId: 'app-1',
        releaseTag: 'v1.0.0',
        variableDefinitions: undefined,
        variables: {},
        userInputVar: '',
      },
      isLoading: false,
    }

    currentAppStore = {
      apps: [{ appId: 'app-1', name: 'Test App', image: '' }],
      fetchApps: vi.fn(() => Promise.resolve()),
      fetchAppVariables: vi.fn(() => Promise.resolve([
        { name: 'pk_list', source: 'packer', type: 'list(string)', default: ['a','b'], description: 'List desc' },
        { name: 'pk_str', source: 'packer', type: 'string', default: 'def' },
        { name: 'tf_num', source: 'terraform', type: 'number', default: 3 },
        { name: 'tf_bool', source: 'terraform', type: 'bool', default: true, required: true },
      ])),
    }
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

    // boolean renders text 'Aktiviert' for true
    expect(wrapper.text()).toContain('Aktiviert')
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

  it('navigates back and next; handleNext saves only changed values', async () => {
    const wrapper = mount(NewDeploymentVariableView, { global: { stubs: ['DeploymentProgressBar','Box','Layers','Info','ArrowLeft','ArrowRight'] } })
    await new Promise(r => setTimeout(r, 0))

    // change list, number and toggle boolean
    const listEl = wrapper.find('#pk_list')
    await (listEl as any).setValue('a, b, c')

    const numEl = wrapper.find('#tf_num')
    await (numEl as any).setValue('5')

    // toggle bool button: find the container that shows 'Aktiviert'/'Deaktiviert' then click its button
    // directly set the internal formValues to toggle the boolean reliably
    ;(wrapper.vm as any).formValues['tf_bool'] = false

    // click next
    const nextBtn = wrapper.findAll('button').find(b => b.text().includes('deployment.actions.next'))
    expect(nextBtn).toBeTruthy()
    await (nextBtn as any).trigger('click')

    // expect navigation to summary
    expect(mockRouterPush).toHaveBeenCalledWith({ name: 'deployment.summary' })

    // draft.userInputVar should contain only changed values
    const saved = JSON.parse(currentStore.draft.userInputVar)
    expect(saved.pk_list).toEqual(['a','b','c'])
    expect(saved.tf_num).toEqual(5)
    expect(saved.tf_bool).toEqual(false)
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

  it('navigates back when clicking back button', async () => {
    const wrapper = mount(NewDeploymentVariableView, { global: { stubs: ['DeploymentProgressBar','ArrowLeft'] } })
    await new Promise(r => setTimeout(r, 0))

    const backBtn = wrapper.findAll('button').find(b => b.text().includes('deployment.actions.back'))
    expect(backBtn).toBeTruthy()
    await (backBtn as any).trigger('click')
    expect(mockRouterPush).toHaveBeenCalledWith({ name: 'deployment.teams' })
  })
})
