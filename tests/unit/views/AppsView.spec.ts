import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { nextTick } from 'vue'

// WICHTIG: Hier nutzen wir jetzt das @-Alias, da der Test außerhalb von src liegt!
import AppsView from '@/views/AppsView.vue'

// Importiere die Icons, um später zu prüfen, ob sie gerendert wurden
import { Server, Globe, Box, Layers } from 'lucide-vue-next'

// ---------------------------------------------------------
// 1. Abhängigkeiten (Dependencies) "mocken" (simulieren)
// ---------------------------------------------------------

// Router simulieren
const mockPush = vi.fn()
vi.mock('vue-router', () => ({
    useRouter: () => ({ push: mockPush })
}))

// Übersetzungen (i18n) simulieren für den <script> Bereich
vi.mock('vue-i18n', () => ({
    useI18n: () => ({ t: (key: string) => key })
}))

// Toast-Benachrichtigungen simulieren
const mockToastError = vi.fn()
vi.mock('@/composables/useToast', () => ({
    useToast: () => ({ error: mockToastError })
}))

// Auth Store simulieren
vi.mock('@/stores/auth.store', () => ({
    useAuthStore: () => ({ userId: 'other-user-id', isTeacherOrAdmin: false })
}))

// Unsere Backend-API simulieren
vi.mock('@/api/app.api', () => ({
    appApi: {
        list: vi.fn(),
        listVersionApprovals: vi.fn().mockResolvedValue({ data: [] }),
    }
}))
import { appApi } from '@/api/app.api'

// ---------------------------------------------------------
// 2. Die eigentlichen Tests
// ---------------------------------------------------------

describe('AppsView.vue', () => {

    // Vor jedem Test setzen wir alle simulierten Funktionen zurück
    beforeEach(() => {
        vi.clearAllMocks()
    })

    // Hilfsfunktion zum Laden der Komponente
    const mountComponent = () => {
        return mount(AppsView, {
            global: {
                // Globale Funktionen für das HTML-Template simulieren
                mocks: {
                    $t: (msg: string) => msg
                },
                stubs: {
                    // Wir lassen Vue Test Utils einen "echten" Stub für den Link bauen,
                    // damit wir später prüfen können, wohin er führt.
                    RouterLink: {
                        props: ['to'],
                        template: '<a :href="to.name" class="router-link-stub"><slot /></a>'
                    },
                    BackCard: { template: '<div><slot /></div>' },
                    BaseButton: { template: '<button><slot /></button>' }
                }
            }
        })
    }

    // --- Critical Path (Haupt-Funktionen) ---

    it('zeigt den "Empty State" (Keine Apps) an, wenn die API ein leeres Array zurückgibt', async () => {
        ;(appApi.list as any).mockResolvedValue({ data: [] })
        const wrapper = mountComponent()
        await flushPromises()

        expect(wrapper.text()).toContain('AppsView.noAppsTitle')
        expect(wrapper.text()).toContain('AppsView.noAppsDesc')
    })

    it('zeigt eine Liste von Apps an, wenn die API Daten liefert', async () => {
        const mockApps = [
                { id: '1', name: 'Meine erste Vue App', description: 'Frontend' },
                { id: '2', name: 'NodeJS Backend', description: 'API' }
            ]
        ;(appApi.list as any).mockResolvedValue({ data: mockApps })

        const wrapper = mountComponent()
        await flushPromises()

        expect(wrapper.text()).toContain('Meine erste Vue App')
        expect(wrapper.text()).toContain('NodeJS Backend')
    })

    it('zeigt eine Fehlermeldung (Toast) an, wenn der API-Aufruf fehlschlägt', async () => {
        ;(appApi.list as any).mockRejectedValue(new Error('Netzwerkfehler'))
        mountComponent()
        await flushPromises()

        expect(mockToastError).toHaveBeenCalledTimes(1)
        expect(mockToastError).toHaveBeenCalledWith('AppsView.loadError')
    })

    it('navigiert zur Detailseite, wenn auf "Details" geklickt wird', async () => {
        const mockApps = [{ id: 'app-999', name: 'Test App' }]
        ;(appApi.list as any).mockResolvedValue({ data: mockApps })

        const wrapper = mountComponent()
        await flushPromises()

        const buttons = wrapper.findAll('button')
        const detailButton = buttons.find(b => b.text().includes('AppsView.detailsDeploy'))

        await detailButton!.trigger('click')

        expect(mockPush).toHaveBeenCalledWith({
            name: 'apps.detail',
            params: { id: 'app-999' }
        })
    })

    // --- Erweiterte Tests (Edge Cases & UI Logik) ---

    it('i18n: verwendet die richtigen Übersetzungs-Keys für statische Texte', async () => {
        ;(appApi.list as any).mockResolvedValue({ data: [] })
        const wrapper = mountComponent()
        await flushPromises()

        expect(wrapper.text()).toContain('AppsView.title')
        expect(wrapper.text()).toContain('AppsView.subtitle')
        expect(wrapper.text()).toContain('AppsView.addApp')
    })

    it('Router: der "Hinzufügen" Button verweist auf die richtige Route (apps.create)', async () => {
        ;(appApi.list as any).mockResolvedValue({ data: [] })
        const wrapper = mountComponent()
        await flushPromises()

        // Wir suchen nach unserem oben definierten RouterLink-Stub
        const addLink = wrapper.find('a.router-link-stub')

        // Prüfen, ob das "to"-Attribut zur Route 'apps.create' gehört
        expect(addLink.attributes('href')).toBe('apps.create')
    })

    it('Icons: rendert das richtige Icon basierend auf dem App-Namen', async () => {
        const mockApps = [
                { id: '1', name: 'Meine Node App' },     // Sollte 'Server' Icon auslösen
                { id: '2', name: 'React Dashboard' },    // Sollte 'Globe' Icon auslösen
                { id: '3', name: 'Python Skript' },      // Sollte 'Box' Icon auslösen
                { id: '4', name: 'Unbekannte App' }      // Sollte 'Layers' Icon (Default) auslösen
            ]
        ;(appApi.list as any).mockResolvedValue({ data: mockApps })

        const wrapper = mountComponent()
        await flushPromises()

        expect(wrapper.findComponent(Server).exists()).toBe(true)
        expect(wrapper.findComponent(Globe).exists()).toBe(true)
        expect(wrapper.findComponent(Box).exists()).toBe(true)
        expect(wrapper.findComponent(Layers).exists()).toBe(true)
    })

    it('zeigt einen Lade-Text/Spinner an, während die Daten geladen werden', async () => {
        let resolveApi: any
        ;(appApi.list as any).mockReturnValue(new Promise(resolve => {
            resolveApi = resolve
        }))

        const wrapper = mountComponent()

        // Wir geben Vue einen kurzen Moment Zeit, das DOM mit isLoading = true neu zu zeichnen
        await nextTick()

        expect(wrapper.text()).toContain('AppsView.loading')

        // Test sauber beenden
        resolveApi({ data: [] })
    })

    it('zeigt ein Bild anstelle eines Icons, wenn die App ein eigenes Bild hat', async () => {
        const mockApps = [{
                id: 'custom-img',
                name: 'App mit Logo',
                image: 'https://mein-server.de/logo.png'
            }]
        ;(appApi.list as any).mockResolvedValue({ data: mockApps })

        const wrapper = mountComponent()
        await flushPromises()

        const img = wrapper.find('img')
        expect(img.exists()).toBe(true)
        expect(img.attributes('src')).toBe('https://mein-server.de/logo.png')
    })
})