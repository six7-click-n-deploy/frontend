<script setup lang="ts">
/**
 * App-weiter Primärbutton.
 *
 * Variants — bewusst klein gehalten, damit über alle Views derselbe
 * visuelle Wortschatz benutzt wird:
 *   * ``primary`` / ``yellow`` (default) — Hauptaktion / Create / Submit.
 *                                          Orange aus dem Logo
 *                                          (``accentYellow``). Identisch
 *                                          mit dem alten ``yellow`` —
 *                                          ``primary`` ist nur der
 *                                          semantische Alias, damit
 *                                          neuer Code "primary" sagen
 *                                          kann ohne die Farbe als
 *                                          Vertragsteil zu fixieren.
 *   * ``green``                          — bestätigende Sekundäraktion
 *                                          (Resume, Speichern in nicht-
 *                                          destruktivem Kontext).
 *   * ``red``                            — destruktive Aktion (Löschen,
 *                                          Ablehnen, Zurücksetzen).
 *   * ``ghost``                          — sehr unauffällige Aktion
 *                                          (Abbrechen in Modals, wenn
 *                                          neben einer roten/grünen
 *                                          Primäraktion gezeigt).
 *
 * Disabled: alle Varianten verlieren den Hover-Effekt und schalten auf
 * ``opacity-50 + cursor-not-allowed``. Wir setzen das hier zentral statt
 * jedem Aufrufer zu überlassen — vorher gab es Stellen, an denen ein
 * disabled-Button optisch immer noch klickbar wirkte.
 */
withDefaults(defineProps<{
  variant?: 'primary' | 'yellow' | 'green' | 'red' | 'ghost'
}>(), {
  variant: 'primary',
})
</script>

<template>
  <button
    :class="[
      'inline-flex items-center justify-center gap-2',
      'px-5 py-2.5 rounded-xl font-medium text-sm transition duration-150 shadow-sm',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:!bg-current',
      // ``primary`` und ``yellow`` zeigen denselben Stil. Wir behalten
      // ``yellow`` als legacy-Alias, damit bestehender Call-Site-Code
      // nicht angefasst werden muss.
      (variant === 'primary' || variant === 'yellow')
        ? 'bg-lightYellow text-accentYellow hover:bg-accentYellow hover:text-white focus:ring-accentYellow/60'
        : variant === 'green'
        ? 'bg-lightGreen text-gray-800 hover:bg-primary hover:text-white focus:ring-primary/60'
        : variant === 'red'
        ? 'bg-lightRed text-accentRed hover:bg-accentRed hover:text-white focus:ring-accentRed/60'
        : variant === 'ghost'
        ? 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 focus:ring-gray-300 shadow-none'
        : ''
    ]"
  >
    <slot />
  </button>
</template>


