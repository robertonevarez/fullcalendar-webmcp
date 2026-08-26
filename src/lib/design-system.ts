/**
 * Protocol Tooling design system.
 *
 * Spacing uses p-3 (0.75rem / 12px) as the single inset unit across
 * pages, sections, panels, and the site header. Layout surfaces use
 * Tailwind `container mx-auto` for width and centering.
 */
export const spacing = {
  /** Standard padding on all sides — use everywhere. */
  page: 'p-3',
  x: 'px-3',
  y: 'py-3',
  /** Standard gap between siblings inside a container. */
  gap: 'gap-3',
  stack: 'space-y-3',
} as const;

export const layout = {
  container: 'container mx-auto',
} as const;

/** Combined class strings for common layout patterns. */
export const ds = {
  spacing,
  layout,
  shell: `${layout.container} ${spacing.page}`,
  content: `${layout.container} ${spacing.page}`,
  section: spacing.stack,
  panel: `${spacing.page} rounded-lg border border-border bg-muted/30`,
} as const;

export type DesignSystem = typeof ds;
