import { mount } from '@vue/test-utils'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import NewDeploymentConfigView from '@/views/NewDeploymentConfigView.vue'

// Mocks and mutable test doubles
let mockRouterPush = vi.fn()
let currentStore: any = null
let currentCredStore: any = null
let toastMock = { warning: vi.fn(), error: vi.fn(), clear: vi.fn() }

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (k: string) => k }) }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: (...args: any[]) => mockRouterPush(...args) }) }))

vi.mock('@/stores/deployment.store', () => ({
  useDeploymentStore: () => currentStore,
}))

vi.mock('@/stores/openstack-credentials.store', () => ({
  useOpenStackCredentialsStore: () => currentCredStore,
}))

vi.mock('@/composables/useToast', () => ({ useToast: () => toastMock }))

// APIs: return simple predictable data
vi.mock('@/api/course.api', () => ({
  courseApi: {
    list: vi.fn(() => Promise.resolve({ data: [] })),
    getById: vi.fn(() => Promise.resolve({ data: { users: [] } })),
  },
}))

vi.mock('@/api/user.api', () => ({
  userApi: {
    list: vi.fn(() => Promise.resolve({ data: [{ keycloak_id: 's1', firstName: 'Max', lastName: 'Mustermann' }] })),
    search: vi.fn(() => Promise.resolve({ data: [] })),
  },
}))

describe('NewDeploymentConfigView', () => {
  beforeEach(() => {
    mockRouterPush = vi.fn()
    toastMock.warning = vi.fn()
    toastMock.error = vi.fn()
    toastMock.clear = vi.fn()

    // Default deployment store
    currentStore = {
      draft: {
        name: '',
        studentIds: [],
        courseIds: [],
        appId: null,
      },
      studentCache: new Map<string, any>(),
    }

    // Default credentials: resolved but missing
    currentCredStore = {
      hasCredential: false,
      isResolved: true,
      status: true,
      fetch: vi.fn(() => Promise.resolve()),
    }
  })

  it('disables Next and shows credential state when credentials missing', async () => {
    const wrapper = mount(NewDeploymentConfigView, { global: { stubs: ['DeploymentProgressBar', 'CredentialMissingBanner'] } })
    await new Promise((r) => setTimeout(r, 0))

    // Next button should be disabled when credentials are resolved but missing
    const nextBtn = wrapper.find('[data-testid="btn-next"]')
    expect(nextBtn.exists()).toBeTruthy()
    expect(nextBtn.attributes('disabled')).toBeDefined()
  })

  it('navigates to teams when credentials present, name set and at least one student selected', async () => {
    // Enable credentials
    currentCredStore.hasCredential = true

    // Prepare cached student and selection
    currentStore.studentCache.set('s1', { keycloak_id: 's1', firstName: 'Max', lastName: 'Mustermann' })
    currentStore.draft.studentIds = ['s1']
    currentStore.draft.name = 'Mein Deployment'

    const wrapper = mount(NewDeploymentConfigView, { global: { stubs: ['DeploymentProgressBar', 'CredentialMissingBanner'] } })
    await new Promise((r) => setTimeout(r, 0))

    const nextBtn = wrapper.find('[data-testid="btn-next"]')
    expect(nextBtn.exists()).toBeTruthy()

    await nextBtn.trigger('click')
    // router.push should be called to navigate to teams step
    expect(mockRouterPush).toHaveBeenCalledWith({ name: 'deployment.teams' })
  })

  it('toggles all students for a course when clicking the course item', async () => {
    // Import the mocked APIs dynamically (vi.mock is hoisted)
    const { courseApi } = await import('@/api/course.api')
    const { userApi } = await import('@/api/user.api')

    // Mock course list and course students
    ;(courseApi.list as any).mockResolvedValue({ data: [{ courseId: 'c1', name: 'Course 1' }] })
    ;(courseApi.getById as any).mockResolvedValue({ data: { users: [{ keycloak_id: 's1', firstName: 'Max' }] } })
    // Ensure user list contains the same student
    ;(userApi.list as any).mockResolvedValue({ data: [{ keycloak_id: 's1', firstName: 'Max' }] })

    // Ensure credentials present so main UI renders
    currentCredStore.hasCredential = true
    const wrapper = mount(NewDeploymentConfigView, { global: { stubs: ['DeploymentProgressBar', 'CredentialMissingBanner'] } })
    await new Promise((r) => setTimeout(r, 0))

    // Find course element by data-testid
    const courseEl = wrapper.find('[data-testid="course-c1"]')
    expect(courseEl.exists()).toBeTruthy()

    // Click to select course -> should add student s1
    await courseEl.trigger('click')
    await new Promise((r) => setTimeout(r, 0))
    expect(currentStore.draft.studentIds).toContain('s1')

    // Click again to unselect -> should remove student
    await courseEl.trigger('click')
    expect(currentStore.draft.studentIds).not.toContain('s1')
  })

  it('toggles individual student and allows removing from selection via UI', async () => {
    // Mock user list to include student s2 so the component's local cacheStudents populates
    const { userApi } = await import('@/api/user.api')
    ;(userApi.list as any).mockResolvedValue({ data: [{ keycloak_id: 's2', firstName: 'Anna', lastName: 'Schmidt' }] })

    // Pre-select student id in store
    currentStore.draft.studentIds = ['s2']

    // Ensure credentials present so main UI renders
    currentCredStore.hasCredential = true
    const wrapper = mount(NewDeploymentConfigView, { global: { stubs: ['DeploymentProgressBar', 'CredentialMissingBanner'] } })
    await new Promise((r) => setTimeout(r, 0))

    // Now the right column shows selected students with a remove button
    await new Promise((r) => setTimeout(r, 0))
    const removeBtn = wrapper.find('[data-testid="remove-s2"]')
    expect(removeBtn.exists()).toBeTruthy()
    await removeBtn.trigger('click')
    expect(currentStore.draft.studentIds).not.toContain('s2')
  })

  it('performs search with debounce and updates student list', async () => {
    const { userApi } = await import('@/api/user.api')
    currentCredStore.hasCredential = true
    // Mock search to return one matching student
    ;(userApi.search as any).mockResolvedValue({ data: [{ keycloak_id: 'sx', firstName: 'Su', lastName: 'Searcher' }] })

    const wrapper = mount(NewDeploymentConfigView, { global: { stubs: ['DeploymentProgressBar', 'CredentialMissingBanner'] } })
    await new Promise((r) => setTimeout(r, 0))

    // Switch to individuals tab so the search input is rendered
    const tabBtn = wrapper.findAll('button').find(b => b.text().includes('Einzelne Studenten'))
    expect(tabBtn).toBeTruthy()
    await (tabBtn as any).trigger('click')
    await new Promise((r) => setTimeout(r, 0))

    // Find the search input by data-testid
    const searchInput = wrapper.find('[data-testid="student-search"]')
    expect(searchInput.exists()).toBeTruthy()

    // Wait for debounce (300ms + margin)
    await searchInput.setValue('Su')
    await searchInput.trigger('input')
    await new Promise((r) => setTimeout(r, 400))

    // Should render the searched student in filteredStudents
    const found = wrapper.find('[data-testid="student-sx"]')
    expect(found.exists()).toBeTruthy()
  }, 10000)

  it('lazy-loads student counts and updates UI', async () => {
    const { courseApi } = await import('@/api/course.api')
    const { userApi } = await import('@/api/user.api')
    // course list contains one course
    ;(courseApi.list as any).mockResolvedValue({ data: [{ courseId: 'lc1', name: 'LazyCourse' }] })
    // getById returns 2 students
    ;(courseApi.getById as any).mockResolvedValue({ data: { users: [{ keycloak_id: 'a' }, { keycloak_id: 'b' }] } })
    ;(userApi.list as any).mockResolvedValue({ data: [{ keycloak_id: 'a' }, { keycloak_id: 'b' }] })

    currentCredStore.hasCredential = true
    const wrapper = mount(NewDeploymentConfigView, { global: { stubs: ['DeploymentProgressBar', 'CredentialMissingBanner'] } })
    await new Promise((r) => setTimeout(r, 0))

    // Initially the course shows '0 Studenten' (placeholder) or 'Lade...'
    const courseLine = wrapper.find('[data-testid="course-lc1"]')
    expect(courseLine.exists()).toBeTruthy()

    // Trigger click to cause getStudentIdsForCourse to load
    await courseLine.trigger('click')
    // wait for async
    await new Promise((r) => setTimeout(r, 0))

    // After load, the displayed count should reflect 2 students
    const updated = wrapper.findAll('.cursor-pointer').find(d => d.text().includes('LazyCourse') && d.text().includes('2'))
    expect(updated).toBeTruthy()
  }, 10000)
  

  it('navigates back to app detail when appId present, else to /apps', async () => {
    // Case 1: with appId
    currentStore.draft.appId = 'app123'
    currentCredStore.hasCredential = true
    let wrapper = mount(NewDeploymentConfigView, { global: { stubs: ['DeploymentProgressBar', 'CredentialMissingBanner'] } })
    await new Promise((r) => setTimeout(r, 0))
    const backBtn = wrapper.find('[data-testid="btn-back"]')
    expect(backBtn.exists()).toBeTruthy()
    await backBtn.trigger('click')
    expect(mockRouterPush).toHaveBeenCalledWith({ name: 'apps.detail', params: { id: 'app123' } })

    // Case 2: without appId
    currentStore.draft.appId = null
    wrapper = mount(NewDeploymentConfigView, { global: { stubs: ['DeploymentProgressBar', 'CredentialMissingBanner'] } })
    await new Promise((r) => setTimeout(r, 0))
    const backBtn2 = wrapper.find('[data-testid="btn-back"]')
    await backBtn2.trigger('click')
    expect(mockRouterPush).toHaveBeenCalledWith('/apps')
  }, 10000)

  it('shows error toast when courseApi.list fails', async () => {
    const { courseApi } = await import('@/api/course.api')
    ;(courseApi.list as any).mockRejectedValue(new Error('boom'))
    currentCredStore.hasCredential = true
    const wrapper = mount(NewDeploymentConfigView, { global: { stubs: ['DeploymentProgressBar', 'CredentialMissingBanner'] } })
    await new Promise((r) => setTimeout(r, 0))
    expect(toastMock.error).toHaveBeenCalled()
  }, 10000)

  it('shows error toast when userApi.search fails', async () => {
    const { userApi } = await import('@/api/user.api')
    ;(userApi.search as any).mockRejectedValue(new Error('searchboom'))
    currentCredStore.hasCredential = true

    const wrapper = mount(NewDeploymentConfigView, { global: { stubs: ['DeploymentProgressBar', 'CredentialMissingBanner'] } })
    await new Promise((r) => setTimeout(r, 0))

    // Switch to individuals tab and trigger a search
    const tabBtn = wrapper.findAll('button').find(b => b.text().includes('Einzelne Studenten'))
    expect(tabBtn).toBeTruthy()
    await (tabBtn as any).trigger('click')
    await new Promise((r) => setTimeout(r, 0))

    const searchInput = wrapper.find('[data-testid="student-search"]')
    await searchInput.setValue('err')
    await searchInput.trigger('input')
    await new Promise((r) => setTimeout(r, 400))

    expect(toastMock.error).toHaveBeenCalled()
  }, 10000)

  it('shows warning when toggling course with no students', async () => {
    const { courseApi } = await import('@/api/course.api')
    ;(courseApi.list as any).mockResolvedValue({ data: [{ courseId: 'empty1', name: 'EmptyCourse' }] })
    ;(courseApi.getById as any).mockResolvedValue({ data: { users: [] } })
    currentCredStore.hasCredential = true

    const wrapper = mount(NewDeploymentConfigView, { global: { stubs: ['DeploymentProgressBar', 'CredentialMissingBanner'] } })
    await new Promise((r) => setTimeout(r, 0))

    const courseEl = wrapper.find('[data-testid="course-empty1"]')
    expect(courseEl.exists()).toBeTruthy()
    await courseEl.trigger('click')
    await new Promise((r) => setTimeout(r, 0))

    expect(toastMock.warning).toHaveBeenCalled()
  }, 10000)
})
