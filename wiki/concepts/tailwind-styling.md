---
title: 'Tailwind CSS + Inter Font Styling'
type: concept
created: 2026-04-29
updated: 2026-04-29
sources: ['[[wiki/sources/ft-01-scaffold]]']
tags: [tailwind, css, inter, styling, shadcn-ui]
lang: en
---

## Overview

The renderer uses Tailwind CSS v3 with the Inter font family (via `@fontsource/inter`) and shadcn/ui components (manually installed).

## Configuration

### `tailwind.config.js`

- Content: `src/renderer/src/**/*.{js,ts,jsx,tsx}` + `src/renderer/index.html`
- Extends `fontFamily.sans` with `['Inter', ...defaultTheme.fontFamily.sans]`

### `postcss.config.js`

Standard Tailwind + Autoprefixer pipeline.

### CSS entry (`src/renderer/src/assets/index.css`)

```css
@import '@fontsource/inter/400.css';
@import '@fontsource/inter/500.css';
@import '@fontsource/inter/600.css';
@import '@fontsource/inter/700.css';
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  font-family: 'Inter', sans-serif;
}
```

## Utility: `cn()`

Location: `src/renderer/src/lib/utils.ts`

Combines `clsx` (conditional class names) with `tailwind-merge` (deduplication of Tailwind classes):

```typescript
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
```

## shadcn/ui Approach

Components are manually created in `src/renderer/src/components/ui/` following shadcn patterns but without the CLI. Uses `class-variance-authority` for variant management.

## See also

- [[wiki/entities/button-component]]
- [[wiki/entities/topbar]]
- [[wiki/topics/renderer-ui]]
