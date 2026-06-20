import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createTestingPinia } from '@pinia/testing'
import NewDeploymentConfigView from '@/views/NewDeploymentConfigView.vue'
import { useOpenStackCredentialsStore } from '@/stores/openstack-credentials.store'
import { useDeploymentStore } from '@/stores/deployment.store'
import { courseApi } from '@/api/course.api'
import { userApi } from '@/api/user.api'

// --- Mocks ---
const mockPush = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush
  })
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}))

const mockToastWarning = vi.fn()
const mockToastError = vi.fn()
const mockToastClear = vi.fn()
vi.mock('@/composables/useToast', () => ({
  useToast: () => ({
    warning: mockToastWarning,
    error: mockToastError,
    clear: mockToastClear
  })
}))

vi.mock('@/api/course.api', () => ({
  courseApi: {
    list: vi.fn().mockResolvedValue({ data: [{ courseId: 'c1', name: 'Vue 3 Mastery' }] }),
    getById: vi.fn().mockResolvedValue({ data: { users: [{ keycloak_id: 'u1', firstName: 'Max' }] } })
  }
}))

vi.mock('@/api/user.api', () => ({
  userApi: {
    list: vi.fn().mockResolvedValue({ data: [{ keycloak_id: 'u1', firstName: 'Max' }, { keycloak_id: 'u2', firstName: 'Erika' }] }),
    search: vi.fn().mockResolvedValue({ data: [{ keycloak_id: 'u1', firstName: 'Max' }] })
  }
}))

// --- Test Suite ---
describe('NewDeploymentConfigView.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Hilfsfunktion zum Mounten mit Pinia
  const createWrapper = (initialCredState = true) => {
    const wrapper = mount(NewDeploymentConfigView, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            // Wir setzen den State explizit nach dem Mounten
          })
        ],
        stubs: {
          DeploymentProgressBar: true,
          CredentialMissingBanner: true,
          BarChart3: true,
          Search: true,
          Check: true,
          Users: true,
          BookOpen: true,
          UserPlus: true
        }
      }
    })

    // --- EXPLIZITES SETZEN DES STATES ---
    // 'as any' verhindert TypeScript-Fehler bei Gettern
    const credStore = useOpenStackCredentialsStore() as any
    credStore.status = true
    credStore.isResolved = true
    credStore.hasCredential = initialCredState

    // Für den Deployment-Store auch gleich ein sauberes Draft-Objekt setzen
    const deploymentStore = useDeploymentStore() as any
    deploymentStore.draft = {
      appId: null,
      name: '',
      studentIds: [],
      courseIds: []
    }
    deploymentStore.studentCache = new Map()

    return wrapper
  }

  it('renders correctly and loads initial data', async () => {
    const wrapper = createWrapper()
    await flushPromises() // Wartet, bis alle Promises (onMounted API calls) aufgelöst sind

    // Prüfen, ob die API aufgerufen wurde
    expect(courseApi.list).toHaveBeenCalled()
    expect(userApi.list).toHaveBeenCalled()

    // Title sollte existieren (i18n key)
    expect(wrapper.text()).toContain('deployment.title')
  })

  it('shows missing credential banner if credentials are not present', async () => {
    const wrapper = createWrapper(false) // hasCredential = false
    await flushPromises()

    const banner = wrapper.findComponent({ name: 'CredentialMissingBanner' })
    expect(banner.exists()).toBe(true)
    
    // Das Eingabefeld für den Namen sollte NICHT existieren
    const nameInput = wrapper.find('[data-testid="deployment-name"]')
    expect(nameInput.exists()).toBe(false)
  })

  it('validates form inputs on handleNext', async () => {
    const wrapper = createWrapper(true)
    await flushPromises()

    const nextBtn = wrapper.find('[data-testid="btn-next"]')
    
    // 1. Klick ohne Name
    await nextBtn.trigger('click')
    expect(mockToastWarning).toHaveBeenCalledWith('Bitte geben Sie einen Namen für das Deployment an.')

    // Store holen und Namen setzen
    const store = useDeploymentStore() as any
    store.draft.name = 'Mein Test Deployment'

    // 2. Klick mit Name, aber ohne Studenten
    await nextBtn.trigger('click')
    expect(mockToastWarning).toHaveBeenCalledWith('Bitte wählen Sie mindestens einen Studenten aus.')

    // 3. Erfolgreicher Klick
    store.draft.studentIds = ['u1']
    await nextBtn.trigger('click')
    expect(mockPush).toHaveBeenCalledWith({ name: 'deployment.teams' })
  })

  it('switches tabs and selects an individual student', async () => {
    const wrapper = createWrapper(true)
    await flushPromises()

    const store = useDeploymentStore() as any

    // Zum "Einzelne Studenten" Tab wechseln
    const buttons = wrapper.findAll('button')
    const individualTabBtn = buttons.find(b => b.text().includes('Einzelne Studenten'))
    await individualTabBtn?.trigger('click')

    // Das Suchfeld ansteuern (um die Ansicht zu filtern, da sie erst ab der Suche füllt)
    const searchInput = wrapper.find('[data-testid="student-search"]')
    await searchInput.setValue('Max')
    
    // Wait for the debounced watcher (300ms)
    await new Promise(r => setTimeout(r, 350))
    await flushPromises()

    // Student anklicken
    const studentItem = wrapper.find('[data-testid="student-u1"]')
    expect(studentItem.exists()).toBe(true)
    
    await studentItem.trigger('click')
    expect(store.draft.studentIds).toContain('u1')
  })
  
  it('handles the back button correctly', async () => {
    const wrapper = createWrapper(true)
    await flushPromises()

    const store = useDeploymentStore() as any
    
    const backBtn = wrapper.find('[data-testid="btn-back"]')

    // Test ohne appId
    store.draft.appId = null
    await backBtn.trigger('click')
    expect(mockPush).toHaveBeenCalledWith('/apps')

    // Test mit appId
    store.draft.appId = 'app-123'
    await backBtn.trigger('click')
    expect(mockPush).toHaveBeenCalledWith({ name: 'apps.detail', params: { id: 'app-123' } })
  })
})