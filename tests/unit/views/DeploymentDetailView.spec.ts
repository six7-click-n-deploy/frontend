import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick, ref } from 'vue'

import DeploymentDetailView from '@/views/DeploymentDetailView.vue'
import type { DeploymentWithRelations, Task } from '@/types'

// ---------------------------------------------------------
// 1. Mocks & Setup
// ---------------------------------------------------------

const mocks = vi.hoisted(() => ({
  mockPush: vi.fn(),
  mockFetchDeploymentById: vi.fn(),
  mockDeleteDeployment: vi.fn(),
  mockListTasksByDeployment: vi.fn(),
  mockGetTaskById: vi.fn(),
  mockAddToast: vi.fn(),
  mockStartStream: vi.fn(),
  mockStopStream: vi.fn(),
}))

const mockDeployment = ref<DeploymentWithRelations | null>(null)
const mockAuthUserId = ref('user-owner')
const mockIsTeacherOrAdmin = ref(true)

const mockStreamProgress = ref<number | null>(null)
const mockStreamCurrentPhase = ref<string | null>(null)
const mockStreamCurrentPhaseIndex = ref<number | null>(null)
const mockStreamTotalPhases = ref(11)
const mockStreamLiveLogs = ref([])
const mockStreamTotalLogCount = ref(0)
const mockStreamConnectionState = ref<'idle' | 'connecting' | 'live' | 'reconnecting' | 'ended' | 'error'>('idle')

vi.mock('lucide-vue-next', () => {
  const icon = (className: string) => ({ template: `<span class="${className}" />` })

  return {
    CircleArrowLeft: icon('icon-circle-arrow-left'),
    Loader2: icon('icon-loader'),
    Users: icon('icon-users'),
    Settings: icon('icon-settings'),
    Terminal: icon('icon-terminal'),
    ChevronDown: icon('icon-chevron-down'),
    Trash2: icon('icon-trash'),
    GitBranch: icon('icon-git-branch'),
    User: icon('icon-user'),
    Calendar: icon('icon-calendar'),
    Clock: icon('icon-clock'),
    Package: icon('icon-package'),
    AlertCircle: icon('icon-alert-circle'),
    CheckCircle: icon('icon-check-circle'),
    XCircle: icon('icon-x-circle'),
    StopCircle: icon('icon-stop-circle'),
    Flame: icon('icon-flame'),
    Copy: icon('icon-copy'),
    Check: icon('icon-check'),
    Send: icon('icon-send'),
  }
})

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: 'dep-1' } }),
  useRouter: () => ({ push: mocks.mockPush }),
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

vi.mock('@/stores/deployment.store', () => ({
  useDeploymentStore: () => ({
    get currentDeployment() {
      return mockDeployment.value
    },
    fetchDeploymentById: mocks.mockFetchDeploymentById,
    deleteDeployment: mocks.mockDeleteDeployment,
  }),
}))

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => ({
    get isTeacherOrAdmin() {
      return mockIsTeacherOrAdmin.value
    },
    get userId() {
      return mockAuthUserId.value
    },
  }),
}))

vi.mock('@/stores/toast.store', () => ({
  useToastStore: () => ({
    addToast: mocks.mockAddToast,
  }),
}))

vi.mock('@/api/task.api', () => ({
  taskApi: {
    listByDeployment: mocks.mockListTasksByDeployment,
    getById: mocks.mockGetTaskById,
  },
}))

vi.mock('@/api/deployment.api', () => ({
  deploymentApi: {
    resendAccess: vi.fn(),
  },
}))

vi.mock('@/composables/useDeploymentStream', () => ({
  useDeploymentStream: () => ({
    progress: mockStreamProgress,
    currentPhase: mockStreamCurrentPhase,
    currentPhaseIndex: mockStreamCurrentPhaseIndex,
    totalPhases: mockStreamTotalPhases,
    liveLogs: mockStreamLiveLogs,
    totalLogCount: mockStreamTotalLogCount,
    connectionState: mockStreamConnectionState,
    start: mocks.mockStartStream,
    stop: mocks.mockStopStream,
  }),
}))

const baseDeployment = (overrides: Partial<DeploymentWithRelations> = {}): DeploymentWithRelations => ({
  deploymentId: 'dep-1',
  name: 'Data Lab',
  appId: 'app-1',
  userId: 'user-owner',
  status: 'success',
  commitHash: null,
  commitInfo: null,
  userInputVar: JSON.stringify({
    groupNames: ['Group A'],
    assignments: {
      0: ['student-1', 'student-2'],
    },
    variables: {
      image: 'ubuntu:22.04 # default image',
      note: 'hello',
    },
  }),
  releaseTag: 'v1.2.3',
  created_at: '2026-06-08T12:00:00Z',
  user: {
    userId: 'user-owner',
    username: 'owner',
    email: 'owner@example.com',
    role: 'teacher',
    courseId: null,
    created_at: '2026-06-01T00:00:00Z',
  },
  app: {
    appId: 'app-1',
    name: 'Notebook Stack',
    description: 'Jupyter deployment',
    git_link: 'https://git.example/app.git',
    userId: 'user-owner',
    created_at: '2026-06-01T00:00:00Z',
    releaseTag: 'v1.2.3',
  },
  teams: [
    {
      teamId: 'team-1',
      name: 'Team Alpha',
      members: [
        {
          userId: 'member-1',
          username: 'member.one',
          email: 'member1@example.com',
        },
      ],
    },
  ],
  outputs: null,
  logs: null,
  latest_task: null,
  ...overrides,
})

const baseTask = (overrides: Partial<Task> = {}): Task => ({
  taskId: 'task-1',
  deploymentId: 'dep-1',
  celeryTaskId: 'celery-1',
  type: 'deploy',
  status: 'success',
  started_at: '2026-06-08T12:10:00Z',
  finished_at: '2026-06-08T12:20:00Z',
  logs: {
    logs: [
      {
        timestamp: '2026-06-08T12:15:00Z',
        level: 'INFO',
        message: 'hello from the worker',
      },
    ],
  },
  tf_state: { resources: [{ name: 'vm-1' }] },
  outputs: { url: 'https://example.org' },
  current_phase: 'OUTPUTS_AND_CLEANUP',
  progress_pct: 100,
  created_at: '2026-06-08T12:09:00Z',
  ...overrides,
})

// ---------------------------------------------------------
// 2. Die Tests
// ---------------------------------------------------------

describe('DeploymentDetailView.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockDeployment.value = null
    mockAuthUserId.value = 'user-owner'
    mockIsTeacherOrAdmin.value = true

    mockStreamProgress.value = null
    mockStreamCurrentPhase.value = null
    mockStreamCurrentPhaseIndex.value = null
    mockStreamTotalPhases.value = 11
    mockStreamLiveLogs.value = []
    mockStreamTotalLogCount.value = 0
    mockStreamConnectionState.value = 'idle'

    mocks.mockFetchDeploymentById.mockImplementation(async () => {
      mockDeployment.value = baseDeployment()
      return { data: mockDeployment.value }
    })

    mocks.mockDeleteDeployment.mockResolvedValue({ status: 204 })
    mocks.mockListTasksByDeployment.mockResolvedValue({ data: [baseTask()] })
    mocks.mockGetTaskById.mockResolvedValue({ data: baseTask() })
  })

  const mountComponent = () => {
    return mount(DeploymentDetailView, {
      global: {
        mocks: {
          $t: (key: string, vars?: Record<string, unknown>) => {
            return vars ? `${key} ${JSON.stringify(vars)}` : key
          },
        },
        stubs: {
          RouterLink: true,
          BaseButton: { template: '<button><slot /></button>' },
          Modal: {
            props: ['show'],
            template: '<div v-if="$props.show" class="modal"><slot name="title" /><slot /></div>',
          },
        },
      },
    })
  }

  // --- 1. Lifecycle & Datenladen ---

  it('lädt Deployment und Tasks beim Öffnen der Detailseite', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    expect(mocks.mockFetchDeploymentById).toHaveBeenCalledWith('dep-1')
    expect(mocks.mockListTasksByDeployment).toHaveBeenCalledWith('dep-1')
    expect(wrapper.text()).toContain('Data Lab')
    expect(wrapper.text()).toContain('Notebook Stack')
    expect(wrapper.text()).toContain('owner@example.com')
  })

  it('zeigt Gruppen-, Variablen- und Teamdaten aus dem Deployment', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    expect(wrapper.text()).toContain('Group A')
    expect(wrapper.text()).toContain('Team Alpha')
    expect(wrapper.text()).toContain('member.one')
    expect(wrapper.text()).toContain('ubuntu:22.04')
    expect(wrapper.text()).not.toContain('# default image')

   const groupCard = wrapper.findAll('div.cursor-pointer')[0]
    expect(groupCard?.text()).toContain('Group A')

    await groupCard!.trigger('click')
    await nextTick()

    expect(wrapper.text()).toContain('student-1')
    expect(wrapper.text()).toContain('student-2')
  })

  // --- 2. Rollen- und Sichtbarkeitslogik ---

  it('blendet Tasks und Löschaktion für Nicht-Besitzer aus', async () => {
    mockIsTeacherOrAdmin.value = false
    mockAuthUserId.value = 'student-1'
    mockDeployment.value = baseDeployment({ userId: 'user-owner' })

    const wrapper = mountComponent()
    await flushPromises()

    expect(mocks.mockListTasksByDeployment).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('DeploymentDetailView.tasksOwnerOnly')
    expect(wrapper.text()).not.toContain('DeploymentDetailView.deploymentDelete')
  })

  // --- 3. Task-Details & Aktionen ---

  it('lädt und zeigt Task-Details, wenn ein Task aus der Historie geöffnet wird', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    const taskRow = wrapper.findAll('div.cursor-pointer')[wrapper.findAll('div.cursor-pointer').length - 1]
    expect(taskRow?.text()).toContain('deploy')

    await taskRow!.trigger('click')
    await flushPromises()

    expect(mocks.mockGetTaskById).toHaveBeenCalledWith('task-1')
    expect(wrapper.text()).toContain('Task ID')
    expect(wrapper.text()).toContain('celery-1')
    expect(wrapper.text()).toContain('hello from the worker')
    expect(wrapper.text()).toContain('1 entries')
  })

  it('öffnet den Delete-Dialog und löst den Lösch-Flow aus', async () => {
    const wrapper = mountComponent()
    await flushPromises()

    const buttons = wrapper.findAll('button')
    const deleteButton = buttons.find((button) => button.text().includes('DeploymentDetailView.deploymentDelete'))

    expect(deleteButton).toBeTruthy()
    await deleteButton!.trigger('click')
    await nextTick()

    expect(wrapper.find('.modal').exists()).toBe(true)

    const confirmButton = wrapper.findAll('.modal button').find((button) => button.text().includes('DeploymentDetailView.confirmButton'))
    expect(confirmButton).toBeTruthy()

    await confirmButton!.trigger('click')
    await flushPromises()

    expect(mocks.mockDeleteDeployment).toHaveBeenCalledWith('dep-1')
    expect(mocks.mockAddToast).toHaveBeenCalledWith({
      type: 'success',
      message: 'DeploymentDetailView.deleteSuccessToast',
    })
    expect(mocks.mockPush).toHaveBeenCalledWith({ name: 'deployments.list' })
  })
})