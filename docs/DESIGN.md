# Design

Reference: `design/landing-page.dc.html` (open in a browser to see structure and copy; it is a design file, so rebuild it as real Next.js components rather than copying the markup). The logo sheet is `design/logo-sheet.dc.html`; logo files are in `brand/`.

## Feel

Clean, light, Apple/Vercel-style software company. Quiet layout, one strong moment (the live check card in the hero), precise typography.

## Colors

| Token | Hex | Use |
|-------|-----|-----|
| background | #FBFBFA | page |
| surface | #FFFFFF | cards, inputs |
| ink | #0E1114 | text, primary buttons, logo |
| ink-2 | #3D444B | secondary text |
| muted | #5B636B | body copy on light |
| subtle | #8A9199 | hints, meta |
| line | #E3E5E7 | borders |
| signal | #0F7C70 (on light) / #5FD3C1 (on dark) | pass states, accents. NOT in the logo. |
| pass-bg | #E4F3EF | pass icon background |
| fail | #B4441C | fail text/icons |
| fail-bg | #FBEAE2 | fail icon background |

## Type

- Geist (UI and headings), Geist Mono (URLs, response codes). Use the `geist` npm package.
- Headlines: weight 600, tight tracking (-0.035em to -0.045em).
- Body 16–18px, line-height 1.55.
- Sentence case everywhere. No all-caps labels.

## Motion (Emil Kowalski-style)

- Easing: `cubic-bezier(.23, 1, .32, 1)` (fast start, gentle settle). Durations 160–420ms.
- Buttons: `scale(.97)` on press.
- Check steps appear one by one: opacity 0→1, translateY 6px→0, blur 4px→0, 420ms, staggered.
- Animate only transform, opacity, filter.
- Respect `prefers-reduced-motion`: turn animations off.
- Motion answers user actions; avoid decorative scroll animations.

## Logo

- Folded-ribbon heartbeat mark + "toolbeat" wordmark (Unbounded font, already converted to outlines).
- Dark backgrounds: `*-dark.svg` (shaded white). Light backgrounds: `*-light.svg` (solid ink).
- Below 24px tall, use the mark alone. Favicon: generate from `toolbeat-app-icon.svg`.
- Never recolor the mark teal.

## Accessibility

Real buttons/links/labels, visible focus rings, 4.5:1 text contrast, works at 375px width.
