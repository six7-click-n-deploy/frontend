<script setup lang="ts">
/**
 * MarkdownRenderer — sanitised markdown → HTML output.
 *
 * Two visual variants:
 *  - ``full``    — Tailwind's ``prose`` styling, used on the detail page
 *                  where the description owns its own column.
 *  - ``compact`` — collapses headings to ``<strong>`` and code blocks to
 *                  inline code, used inside app cards / inline rows where
 *                  a giant H1 would explode the layout.
 *
 * The HTML is run through DOMPurify before it hits ``v-html``, so user
 * markdown like ``<img src=x onerror=alert(1)>`` is neutralised.
 */
import { computed } from 'vue'
import { marked, Renderer } from 'marked'
import DOMPurify from 'dompurify'

const props = withDefaults(defineProps<{
  /** Raw markdown source. ``null`` / empty renders nothing. */
  source: string | null | undefined
  /** ``full`` for detail views, ``compact`` for cards & inline. */
  variant?: 'full' | 'compact'
  /** Optional ``line-clamp-N`` for card previews. */
  clamp?: number
}>(), {
  variant: 'full',
  clamp: 0,
})

// ``compact`` neutralises block-level constructs that would blow up an
// inline / card layout: headings render as bold, code blocks as inline
// code, blockquotes as plain paragraphs. The original markdown is still
// parsed correctly — only the rendered HTML differs. We use ``text``
// from the token (already plain) and escape it ourselves to avoid
// poking at marked's internal parser state.
const buildRenderer = (): Renderer => {
  const r = new Renderer()
  if (props.variant === 'compact') {
    r.heading = ({ text }) => `<strong>${escapeHtml(text)}</strong> `
    r.code = ({ text }) => `<code>${escapeHtml(text)}</code> `
    r.hr = () => ' · '
  }
  return r
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const html = computed(() => {
  const raw = (props.source ?? '').trim()
  if (!raw) return ''
  const renderer = buildRenderer()
  // GFM + line-breaks: matches what users expect from GitHub-style markdown
  // (tables, ``- [ ]`` task lists, single-newline → ``<br>``).
  const parsed = marked.parse(raw, {
    gfm: true,
    breaks: true,
    renderer,
    async: false,
  }) as string
  return DOMPurify.sanitize(parsed, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ['target', 'rel'],
  })
})

const wrapperClass = computed(() => {
  const base: string[] = []
  if (props.variant === 'full') {
    base.push('prose prose-sm md:prose-base max-w-none')
    // Keep links visually consistent with the rest of the app.
    base.push('prose-a:text-primary prose-a:no-underline hover:prose-a:underline')
    base.push('prose-headings:text-gray-900 prose-p:text-gray-600')
    base.push('prose-code:text-gray-800 prose-code:bg-gray-100 prose-code:px-1 prose-code:rounded')
    base.push('prose-pre:bg-gray-900 prose-pre:text-gray-100')
  } else {
    base.push('text-gray-600 leading-relaxed break-words')
    base.push('[&_a]:text-primary [&_a]:underline')
    base.push('[&_code]:bg-gray-100 [&_code]:px-1 [&_code]:rounded [&_code]:text-xs')
    base.push('[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5')
    base.push('[&_p]:my-0 [&_strong]:font-semibold')
  }
  if (props.clamp && props.clamp > 0) {
    base.push(`line-clamp-${props.clamp}`)
  }
  return base.join(' ')
})
</script>

<template>
  <div v-if="html" :class="wrapperClass" v-html="html" />
</template>
