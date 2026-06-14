# Portfolio 2.0 — Souvik Chatterjee

A fast, responsive personal portfolio for a Senior Quality Engineer / SDET, built with
**vanilla HTML, CSS, and JavaScript** — no frameworks and no build step.

## Highlights

- **Data-driven content** — every section's content lives in its own file under [`data/`](data/),
  so the site can be updated without touching markup or logic.
- **System-adaptive theme** — colours follow the visitor's OS light/dark preference automatically
  and react to live OS changes; a manual toggle overrides and is remembered.
- **Responsive everywhere** — fluid layouts validated from 320 px phones up to wide desktops.
- **Collapsible skills** — on phones each skill category becomes a tap-to-expand accordion;
  on larger screens it's a grid whose column count scales with the window.
- **Infinite carousels** — Posts and Recommendations loop seamlessly, auto-play, and fade the
  inactive cards at both ends so the active cards stand out.

## Project structure

```
index.html          Markup — section "mount points" only, no hard-coded content
style.css           Core styles and theming (CSS custom properties)
mediaqueries.css    Responsive breakpoints
script.js           Rendering, theming, carousels, skills accordion
data/               One file per content area (see below)
assets/             Images, icons, resume.pdf
```

### `data/` files

| File | `PORTFOLIO_DATA` key | Content |
| --- | --- | --- |
| `site.js` | `site` | Brand name, nav links, footer copyright |
| `profile.js` | `profile` | Hero greeting, name, role, tagline, stats, buttons |
| `about.js` | `about` | About section text and cards |
| `experience.js` | `experience` | Work history timeline |
| `skills.js` | `skills` | Skill categories (icon + badges) |
| `certifications.js` | `certifications` | Certifications |
| `posts.js` | `posts` | LinkedIn posts/articles carousel |
| `recommendations.js` | `recommendations` | Recommendations carousel |
| `socials.js` | `socials` | Social profile links |
| `contact.js` | `contact` | Contact methods |

Each file attaches to a shared global:

```js
window.PORTFOLIO_DATA = window.PORTFOLIO_DATA || {};
window.PORTFOLIO_DATA.skills = { /* ... */ };
```

The `<script>` tags in [`index.html`](index.html) load every `data/` file **before**
`script.js`, which reads `window.PORTFOLIO_DATA` and renders each section on `DOMContentLoaded`.

## Editing content

To change what the site shows, edit the relevant file in [`data/`](data/) — no other changes
needed. A few useful notes:

- **Skills** — each category has an `icon` (emoji), a `title`, and `badges` (`{ t, v }`,
  where `v` is `primary` | `secondary` | `accent`). The count chip is derived automatically.
- **Footer year** — `site.copyright` uses a `{year}` placeholder that is replaced with the
  current year at runtime, so it never needs manual updating.
- **Hero buttons** — each button has an `action` of `open` (opens a link, e.g. the resume)
  or `navigate` (jumps to a section).

## Theming

The active theme is the `data-theme` attribute (`light` | `dark`) on `<html>`:

- An inline script in `<head>` sets it on first paint from a saved choice, or from
  `prefers-color-scheme` when none is saved (prevents a flash of the wrong theme).
- `watchSystemTheme()` updates it live when the OS theme changes — unless the visitor has
  made a manual choice, which is stored in `localStorage` and always wins.