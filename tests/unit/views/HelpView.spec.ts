import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach } from 'vitest'
import { createI18n } from 'vue-i18n'
import HelpView from '@/views/HelpView.vue'
import en from '../../../src/i18n/locales/en.ts'
import de from '../../../src/i18n/locales/de.ts'

const locales: Record<string, any> = { en, de }

for (const [lng, msgs] of Object.entries(locales)) {
  describe(`HelpView (${lng})`, () => {
    let wrapper: ReturnType<typeof mount>

    beforeEach(() => {
      const i18n = createI18n({ legacy: false, locale: lng, messages: { [lng]: msgs } })
      wrapper = mount(HelpView as any, {
        global: {
          plugins: [i18n],
          stubs: ['HelpCircle', 'Layers', 'BookOpen', 'AlertTriangle'],
        },
      })
    })

    it('renders main texts', () => {
      const text = wrapper.text()
      expect(text).toContain(msgs.HelpView.title)
      expect(text).toContain(msgs.HelpView.intro)
      expect(text).toContain(msgs.HelpView.quickHelp.step1)
      expect(text).toContain(msgs.HelpView.resources.frontendRepo)
    })

    it('renders all quickHelp steps (6)', () => {
      const items = wrapper.findAll('ol li')
      expect(items.length).toBe(6)
    })

    it('contains resource links with correct hrefs', () => {
      const expectHref = (href: string) => {
        const el = wrapper.find(`a[href="${href}"]`)
        expect(el.exists()).toBe(true)
        // external links should open in new tab and be safe
        expect(el.attributes('target')).toBe('_blank')
        const rel = el.attributes('rel') || ''
        expect(rel).toContain('noopener')
        expect(rel).toContain('noreferrer')
      }

      expectHref('https://github.com/six7-click-n-deploy/frontend')
      expectHref('https://github.com/six7-click-n-deploy/backend')
      expectHref('https://github.com/six7-click-n-deploy/deployment')
      expectHref('https://github.com/six7-click-n-deploy/worker')
    })

    it('renders icon visuals (stub or svg)', () => {
      const html = wrapper.html()
      // lucide icons render as inline SVG with classnames like 'lucide-...'
      expect(
        html.includes('helpcircle-stub') || html.includes('lucide-circle-question-mark')
      ).toBe(true)
      expect(html.includes('layers-stub') || html.includes('lucide-layers')).toBe(true)
      expect(html.includes('bookopen-stub') || html.includes('lucide-book-open')).toBe(true)
      expect(html.includes('alerttriangle-stub') || html.includes('lucide-triangle-alert')).toBe(true)
    })

    it('key i18n strings used in template appear in the DOM', () => {
      const keys: string[] = []
      // top-level
      keys.push(msgs.HelpView.title)
      keys.push(msgs.HelpView.intro)

      // quickHelp steps
      keys.push(msgs.HelpView.quickHelp.step1)
      keys.push(msgs.HelpView.quickHelp.step2)
      keys.push(msgs.HelpView.quickHelp.step3)
      keys.push(msgs.HelpView.quickHelp.step4)
      keys.push(msgs.HelpView.quickHelp.step5)
      keys.push(msgs.HelpView.quickHelp.step6)

      // resources
      keys.push(msgs.HelpView.resources.frontendRepo)
      keys.push(msgs.HelpView.resources.backendRepo)
      keys.push(msgs.HelpView.resources.deploymentRepo)
      keys.push(msgs.HelpView.resources.workerRepo)

      // docs
      keys.push(msgs.HelpView.docs.link1)
      keys.push(msgs.HelpView.docs.link2)
      keys.push(msgs.HelpView.docs.link3)

      // troubleshooting
      keys.push(msgs.HelpView.troubleshooting.description)
      keys.push(msgs.HelpView.troubleshooting.item1)
      keys.push(msgs.HelpView.troubleshooting.item2)
      keys.push(msgs.HelpView.troubleshooting.item3)

      // faq / quota
      keys.push(msgs.HelpView.quota.title)
      keys.push(msgs.HelpView.quota.description)
      keys.push(msgs.HelpView.faq.question1)
      keys.push(msgs.HelpView.faq.answer1)

      const text = wrapper.text()
      for (const s of keys) {
        if (!s) continue
        expect(text).toContain(s)
      }
    })

    it('has correct heading element', () => {
      const h1 = wrapper.find('h1')
      expect(h1.exists()).toBe(true)
      expect(h1.text()).toBe(msgs.HelpView.title)
    })

    it('matches snapshot', () => {
      expect(wrapper.html()).toMatchSnapshot()
    })
  })
}

// Locale parity test: ensure HelpView keys exist in all locales
describe('HelpView locale parity', () => {
  const collectKeyPaths = (obj: any, prefix = ''): string[] => {
    const out: string[] = []
    for (const k of Object.keys(obj)) {
      const v = obj[k]
      const path = prefix ? `${prefix}.${k}` : k
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        out.push(...collectKeyPaths(v, path))
      } else {
        out.push(path)
      }
    }
    return out
  }

  it('en and de have same HelpView key paths', () => {
    const enKeys = collectKeyPaths(en.HelpView).sort()
    const deKeys = collectKeyPaths(de.HelpView).sort()
    expect(enKeys).toEqual(deKeys)
  })
})
