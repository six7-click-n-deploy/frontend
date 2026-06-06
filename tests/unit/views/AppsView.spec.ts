import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

// WICHTIG: Hier nutzen wir jetzt das @-Alias, da der Test außerhalb von src liegt!
import AppsView from '@/views/AppsView.vue'

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

// Unsere Backend-API simulieren
vi.mock('@/api/app.api', () => ({
    appApi: { list: vi.fn() }
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
                    RouterLink: true,
                    BackCard: { template: '<div><slot /></div>' },
                    BaseButton: { template: '<button><slot /></button>' }
                }
            }
        })
    }

    it('zeigt den "Empty State" (Keine Apps) an, wenn die API ein leeres Array zurückgibt', async () => {
        // 1. Vorbereitung: Wir befehlen der API, [] zurückzugeben
        ;(appApi.list as any).mockResolvedValue({ data: [] })

        // 2. Ausführung: Komponente laden & warten bis alle Promises (onMounted) fertig sind
        const wrapper = mountComponent()
        await flushPromises()

        // 3. Prüfung: Der Text für keine Apps muss sichtbar sein
        expect(wrapper.text()).toContain('AppsView.noAppsTitle')
        expect(wrapper.text()).toContain('AppsView.noAppsDesc')
    })

    it('zeigt eine Liste von Apps an, wenn die API Daten liefert', async () => {
        // 1. Vorbereitung: Wir simulieren 2 Apps aus dem Backend
        const mockApps = [
                { id: '1', name: 'Meine erste Vue App', description: 'Frontend' },
                { id: '2', name: 'NodeJS Backend', description: 'API' }
            ]
        ;(appApi.list as any).mockResolvedValue({ data: mockApps })

        // 2. Ausführung
        const wrapper = mountComponent()
        await flushPromises()

        // 3. Prüfung: Die Namen der Apps müssen im HTML auftauchen
        expect(wrapper.text()).toContain('Meine erste Vue App')
        expect(wrapper.text()).toContain('NodeJS Backend')
    })

    it('zeigt eine Fehlermeldung (Toast) an, wenn der API-Aufruf fehlschlägt', async () => {
        // 1. Vorbereitung: Die API wirft einen Fehler
        ;(appApi.list as any).mockRejectedValue(new Error('Netzwerkfehler'))

        // 2. Ausführung
        mountComponent()
        await flushPromises()

        // 3. Prüfung: Die Toast-Fehlerfunktion muss exakt 1x aufgerufen worden sein
        expect(mockToastError).toHaveBeenCalledTimes(1)
        expect(mockToastError).toHaveBeenCalledWith('AppsView.loadError')
    })

    it('navigiert zur Detailseite, wenn auf "Details" geklickt wird', async () => {
        // 1. Vorbereitung: Eine App laden
        const mockApps = [{ id: 'app-999', name: 'Test App' }]
        ;(appApi.list as any).mockResolvedValue({ data: mockApps })

        const wrapper = mountComponent()
        await flushPromises()

        // 2. Ausführung: Wir suchen den Detail-Button und klicken ihn
        const buttons = wrapper.findAll('button')
        const detailButton = buttons.find(b => b.text().includes('AppsView.detailsDeploy'))

        await detailButton!.trigger('click')

        // 3. Prüfung: Wurde der Router angewiesen, auf die richtige Seite zu wechseln?
        expect(mockPush).toHaveBeenCalledWith({
            name: 'apps.detail',
            params: { id: 'app-999' }
        })
    })
})