# Accessibility Audit — Arras Community Health Indicator

**Date:** May 2026  
**Scope:** Application UI in `src/` (Vue 3 + Vuetify + MapLibre), `index.html`, embed example, branding/config colors used for data visualization  
**Target conformance:** [WCAG 2.2](https://www.w3.org/TR/WCAG22/) **Level AA** (aligned with common public-sector and ADA Title II expectations, which reference WCAG 2.x Level AA)

### Implementation status (May 2026)

- **Always on:** Skip link, live regions, alt text, headings, dialog semantics, keyboard geography browse, timeline keyboard + data table, labels, external-link cues, DOM order on map page — see `src/styles/accessibility-base.css` and related component changes.
- **Enhanced display toggle:** App bar button below menu (`mdi-eye-plus` / `mdi-eye-check`) applies `html.a11y-enhanced` styles in `src/styles/accessibility-enhanced.css` (motion reduction, stronger focus, legend text weight, theme title text-shadow, popup value prefixes, left-map zoom controls). **Does not modify** `public/config/arras_branding.json`.
- **Still deferred:** Map choropleth patterns, brand-palette contrast strategy, config-editor `alert()` replacement.
- **User/developer guide:** [accessibility-features.md](./accessibility-features.md) — how default vs enhanced display works.

**Method:** Code review of templates, styles, map interaction utilities, and configuration. This is not a substitute for automated scanning (axe, WAVE), manual screen-reader testing, or user testing with people who use assistive technology.

---

## Executive summary

The app has a solid foundation from Vuetify components and some semantic HTML in places (e.g. `Popup.vue` uses `<h3>`). However, **core map workflows are pointer-dependent**, **data meaning relies heavily on color**, and **project-owned code adds almost no ARIA, skip navigation, or non-visual alternatives**. Several issues are **Level A failures** (keyboard, non-text content, use of color) and would block a formal WCAG 2.2 AA claim without remediation.

**Recommendation on “accessibility button” vs default design:**  
See [Built-in improvements vs. accessibility mode](#built-in-improvements-vs-accessibility-mode) — most fixes should ship in the **default** experience. A separate toggle is appropriate only as a **supplementary “accessible data view”** (table + keyboard-driven geography list), not as the primary way to meet contrast, labeling, focus, or heading requirements.

---

## Built-in improvements vs. accessibility mode

| Approach | Use for | Rationale |
|----------|---------|-----------|
| **Include in default design** | Alt text, page titles/headings, skip link, visible focus, form labels, dialog semantics, contrast-safe legend text, `prefers-reduced-motion`, link warnings for new tabs, labeled icon buttons | Required by WCAG; users should not hunt for a mode to get baseline access. Hiding fixes behind a button is a common audit failure and excludes users who do not know the feature exists. |
| **Supplementary “Accessible view” (optional)** | Keyboard-selectable geography list, tabular indicator values by year, downloadable/filterable data mirroring map + timeline | Map canvases are inherently difficult for WCAG **2.1.1 Keyboard** and **1.1.1 Non-text Content**. A dedicated panel satisfies “alternative for time-based / complex visual” patterns without degrading the visual map for sighted users. |
| **Do not use a toggle for** | Color contrast, focus rings, ARIA names, heading hierarchy, motion reduction | These are not stylistic preferences; they are conformance requirements. |

**Verdict:** Prefer **progressive enhancement in the main UI**, plus an optional **data-first accessible view** for map exploration—not a global “high contrast mode” that replaces fixing the default palette and controls.

---

## What already helps

| Item | Location | Notes |
|------|----------|--------|
| Page language | `index.html` `lang="en"` | Meets **3.1.1 Language of Page** (A) |
| Document title | `index.html` `<title>` | Partial **2.4.2 Page Titled** (A); map route should update title per theme |
| Embed iframe title | `embed-test/index.html` | Good **4.1.2** practice for iframe |
| Vuetify buttons / selects | `ComparisonMap.vue`, `IndicatorSelector.vue`, etc. | Baseline keyboard support when used as documented |
| MapLibre controls | `ComparisonMap.vue` | Zoom/attribution partially accessible; left panel controls hidden in side-by-side (see below) |
| Text labels on legend ends | `ColorLegend.vue`, `PointLegend.vue` | Helps **1.4.1** but does not remove map’s color-only encoding |
| `Popup` structure | `Popup.vue` | Named feature + year grid; needs dialog semantics and keyboard path to open |

---

## Findings by WCAG principle

### 1. Perceivable

#### 1.1.1 Non-text Content (Level A) — **Not met (multiple instances)**

Informative images lack text alternatives.

| Issue | Evidence | Suggested change |
|-------|----------|------------------|
| Logo images without `alt` | `App.vue` L6–10, L43–48, L96; `Landing.vue` L49 | `alt="Arras Foundation"` (or empty `alt=""` if redundant with adjacent text) |
| Category / theme icons | `App.vue` L68, `Landing.vue` L49, `MapPage.vue` L10 | `alt=""` if decorative next to visible title; otherwise describe purpose |
| Carousel photos | `Landing.vue` L25–31 | `alt` per slide (from config or filename); captions if informative |
| Gradient legend bar | `ColorLegend.vue` L19–22 | `role="img"` + `aria-label` describing min/mid/max and indicator name |
| D3 timeline chart | `TimelineVisualization.vue` L36 | Hidden data table, `aria-label` on SVG, or text summary of trend |

**Standard:** [WCAG 2.2 — 1.1.1 Non-text Content](https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html)

---

#### 1.3.1 Info and Relationships (Level A) — **Partially met; gaps**

| Issue | Evidence | WCAG impact | Suggested change |
|-------|----------|-------------|------------------|
| No `<h1>` on landing or map | `Landing.vue` (title is `v-card-title` / `text-h5`); `MapPage.vue` uses `v-card-title` only | **2.4.6** related | One `<h1>` per route; theme name as `<h1>` on map |
| Orphan `<h3>` in popup | `Popup.vue` L6–7 without page outline | **1.3.1**, **2.4.6** | Map page `<h1>` + panel as `<section aria-labelledby="...">` |
| Theme title not a heading | `MapPage.vue` L8–12 | **1.3.1** | Use `<h1 class="theme-title__label">` or `aria-labelledby` on `<header>` |
| Menu is icon-only, not a button | `App.vue` L99 `v-icon` + `@click` | **4.1.2** | `<v-btn icon="mdi-menu" aria-label="Open navigation menu">` |
| Feature panel not exposed as dialog | `ComparisonMap.vue` L26–33 | **4.1.2** | `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, focus trap, `aria-label` on close |
| Close control text is `"x"` | `ComparisonMap.vue` L31, L65 | **4.1.2** | `aria-label="Close feature details"` |
| `v-html` landing copy | `Landing.vue` L9 | **1.3.1** if markup invalid | Sanitize; ensure headings/lists in CMS/config are semantic |

**Standards:** [1.3.1 Info and Relationships](https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html), [2.4.6 Headings and Labels (AA)](https://www.w3.org/WAI/WCAG22/Understanding/headings-and-labels.html)

---

#### 1.3.2 Meaningful Sequence (Level A) — **Risk**

Map chrome (title, search) overlays the map (`MapPage.vue`). Screen-reader order should be: skip link → landmarks → map description → controls. Today map DOM may precede or follow header depending on template order (`MapPage.vue` L4–15: map before header in DOM).

**Suggested change:** DOM order: header landmarks first (or `aria-flowto`), then map; visually overlay with CSS as today.

**Standard:** [1.3.2 Meaningful Sequence](https://www.w3.org/WAI/WCAG22/Understanding/meaningful-sequence.html)

---

#### 1.3.3 Sensory Characteristics (Level A) — **Not met for map/chart**

Instructions and data interpretation assume sight and pointer position (“hover over the map”, color bands, line colors).

| Issue | Evidence |
|-------|----------|
| Map fill = value via color scale only | `dataToMap.ts` interpolate/stops ~L177+; no pattern hatch |
| Timeline series: blue / orange / gray only | `TimelineVisualization.vue` L63–65, legend swatches |
| Popup stats: blue vs green text | `Popup.vue` styles ~L121–129 |

**Suggested change:** Numeric labels on map at zoom thresholds, keyboard-selected feature always shows full `Popup`; timeline legend text labels (“Selected”, “Statewide”, “Hovered”); do not rely on “green subtitle” alone per `popup_legend` config.

**Standard:** [1.3.3 Sensory Characteristics](https://www.w3.org/WAI/WCAG22/Understanding/sensory-characteristics.html)

---

#### 1.4.1 Use of Color (Level A) — **Not met**

Choropleth and point maps communicate values **only** through fill color. Legend gradient reinforces color-only encoding (`ColorLegend.vue` L19–22).

**Suggested change:** Add patterns/text labels for discrete classes; for continuous scales, expose values in feature panel and optional “data table” view; ensure selected year / frozen feature is indicated with **border weight or icon**, not color alone.

**Standard:** [1.4.1 Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html)

---

#### 1.4.3 Contrast (Minimum) (Level AA) — **Likely failures**

Requires **4.5:1** for normal text, **3:1** for large text (≥18pt or 14pt bold).

| Combination | Source | Concern |
|-------------|--------|---------|
| White on theme brand colors | `MapPage.vue` title on dynamic `arrasBrandingColor` | Fails for light colors (e.g. `yellow` `#fdb827`, `beige` `#dfd1a7`) |
| `#6b7280` legend text ~10–12px | `ColorLegend.vue`, `TimelineVisualization.vue` deep styles | May fail 4.5:1 on white |
| Brand palette mid-stops | `arras_branding.json` `pale-blue`, `pink`, `yellow` used in map/legend | Data visualization on white labels |
| Blue `#2563eb` / green `#059669` stat text | `Popup.vue` | Verify against white panel background |

**Suggested change:** Audit each theme header color pair; darken text or add semi-opaque backing; bump legend label size/contrast; document **approved indicator palettes** that meet 3:1 for UI components and 4.5:1 for text.

**Standard:** [1.4.3 Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)

---

#### 1.4.11 Non-text Contrast (Level AA) — **Likely failures**

UI components and graphical objects need **3:1** against adjacent colors.

| Issue | Evidence |
|-------|----------|
| Compare divider / handle | `maplibre-gl-compare.css` |
| Focus indicator on custom controls | Often missing on D3 circles, menu icon |
| 2px color swatches in timeline legend | `TimelineVisualization.vue` legend table |

**Standard:** [1.4.11 Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)

---

#### 1.4.4 Resize Text (Level AA) — **Risk**

`document.body.style.zoom = '0.8'` below 1280px width (`App.vue` L149) scales entire UI non-standardly; can break user agent text sizing and **1.4.4**.

**Suggested change:** Use responsive layout/CSS `rem` scaling, not `zoom`.

**Standard:** [1.4.4 Resize Text](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html)

---

#### 1.4.10 Reflow (Level AA) — **Partial**

Side-by-side maps and fixed overlays may require horizontal scroll at 320px unless stacked (orientation class exists). Verify map page at 320px width.

**Standard:** [1.4.10 Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)

---

#### 1.4.12 Text Spacing (Level AA) — **Not tested**

No overrides blocking spacing were found; manual test recommended.

**Standard:** [1.4.12 Text Spacing](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html)

---

#### 1.4.13 Content on Hover or Focus (Level AA) — **Not met**

Feature panel content appears on **mousemove** (`areaDataToMap.ts` L101–163; `pointDataToMap.ts` similar) without equivalent **focus** trigger; hover content can disappear when pointer moves.

**Suggested change:** Open panel on **focus** of list alternative or keyboard selection; satisfy dismissible, hoverable, persistent criteria for tooltips (`ColorLegend.vue` `v-tooltip`).

**Standard:** [1.4.13 Content on Hover or Focus](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html)

---

### 2. Operable

#### 2.1.1 Keyboard (Level A) — **Not met for core tasks**

| Function | Keyboard today | Evidence |
|----------|----------------|----------|
| Open navigation | No | `App.vue` L99 |
| Select map geography | No | `areaDataToMap.ts` / `pointDataToMap.ts` mousemove/click only |
| Timeline year points | No | `TimelineVisualization.vue` D3 `click` only on circles |
| Compare slider (if enabled) | No | `maplibre-gl-compare.js` pointer events |

MapLibre canvas is not keyboard-operable for feature picking per platform limits; **an alternative UI is required** for equivalence.

**Suggested change:** Geography `<v-autocomplete>` or searchable list synced with map; arrow keys or tab to timeline years with `role="button"` and `tabindex="0"`; ensure all `v-btn`/`v-list-item` paths work without mouse.

**Standard:** [2.1.1 Keyboard](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html)

---

#### 2.1.2 No Keyboard Trap (Level A) — **Mostly OK**

Vuetify drawer typically manages focus; verify return focus to menu button on close. Feature panel should not trap without Escape to close.

**Standard:** [2.1.2 No Keyboard Trap](https://www.w3.org/WAI/WCAG22/Understanding/no-keyboard-trap.html)

---

#### 2.4.1 Bypass Blocks (Level A) — **Not met**

No “Skip to main content” link to `#main` (`App.vue` L2 has `tabindex="-1"` but no skip link in `index.html` / `App.vue`).

**Suggested change:** First focusable element: `<a href="#main" class="skip-link">Skip to main content</a>`; visible on focus.

**Standard:** [2.4.1 Bypass Blocks](https://www.w3.org/WAI/WCAG22/Understanding/bypass-blocks.html)

---

#### 2.4.2 Page Titled (Level A) — **Partial**

Static title in `index.html`; map route does not update `document.title` with theme name.

**Suggested change:** `watch` route/theme → `document.title = \`${theme} — Arras Community Indicator Tool\``.

**Standard:** [2.4.2 Page Titled](https://www.w3.org/WAI/WCAG22/Understanding/page-titled.html)

---

#### 2.4.3 Focus Order (Level A) — **Review needed**

Overlay header vs map DOM order (`MapPage.vue`). Solo buttons use `--map-chrome-height`; focus order should follow visual logic.

**Standard:** [2.4.3 Focus Order](https://www.w3.org/WAI/WCAG22/Understanding/focus-order.html)

---

#### 2.4.4 Link Purpose (In Context) (Level A) — **Minor gaps**

External links open new tab without warning (`ColorLegend.vue` L31, `Landing.vue` L58, `App.vue` L82).

**Suggested change:** Visible “(opens in new tab)” or `aria-label` / `sr-only` + `rel="noopener noreferrer"`.

**Standard:** [2.4.4 Link Purpose (In Context)](https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html)

---

#### 2.4.7 Focus Visible (Level AA) — **Partial**

`style.css` L82–85 defines `button:focus-visible` only; many controls are Vuetify/D3/custom. Menu icon has no focus ring (`App.vue` L99).

**Suggested change:** Global `:focus-visible` outline for interactive elements; verify Vuetify theme `focusVisibleOpacity`.

**Standard:** [2.4.7 Focus Visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html)

---

#### 2.4.11 Focus Not Obscured (Minimum) (Level AA, WCAG 2.2) — **Risk**

Fixed app bar, overlay header, timeline card, and legends may obscure focused elements.

**Suggested change:** Ensure `scroll-margin` on focusable controls; avoid `overflow: hidden` clipping focus ring.

**Standard:** [2.4.11 Focus Not Obscured (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html)

---

#### 2.5.1 Pointer Gestures (Level A) — **N/A unless multi-finger**

Compare/slider uses single-pointer drag when active.

**Standard:** [2.5.1 Pointer Gestures](https://www.w3.org/WAI/WCAG22/Understanding/pointer-gestures.html)

---

#### 2.5.7 Dragging Movements (Level AA, WCAG 2.2) — **Not met if compare drag is required**

Map compare divider requires dragging (`maplibre-gl-compare.js`).

**Suggested change:** Single-pointer alternative (buttons to set split %) or disable drag-only path.

**Standard:** [2.5.7 Dragging Movements](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)

---

#### 2.5.2 Pointer Cancellation (Level A) — **Assumed OK**

Standard click handlers; no audit of down-event-only actions.

---

### 3. Understandable

#### 3.1.1 Language of Page (Level A) — **Met**

`lang="en"` on `index.html`.

---

#### 3.2.1 On Focus (Level A) / 3.2.2 On Input (Level A) — **Review**

Map hover triggers panel without explicit user setting change; ensure focus does not auto-change context unexpectedly.

---

#### 3.3.1 Error Identification (Level A) — **Partial**

`ConfigEditor.vue` uses inline errors for JSON fields; map/timeline errors often `console.error` only (`TimelineVisualization.vue` CSV download L189–191).

**Standard:** [3.3.1 Error Identification](https://www.w3.org/WAI/WCAG22/Understanding/error-identification.html)

---

#### 3.3.2 Labels or Instructions (Level A) — **Gaps**

| Control | Issue | Location |
|---------|-------|----------|
| Indicator select | No visible `label`; `hide-details` | `IndicatorSelector.vue` L2–5 |
| ArcGIS search | No app-level label/landmark | `LocationSearch.vue` |
| Year select | Has `label="Year"` | `TimelineVisualization.vue` L6–8 ✓ |

**Standard:** [3.3.2 Labels or Instructions](https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html)

---

#### 3.3.3 Error Suggestion (Level AA) — **Config editor**

Validation via `alert()` (`ConfigEditor.vue` ~L270–326) is announced but not linked to fields.

**Suggested change:** Inline `v-alert` / field `error-messages`.

**Standard:** [3.3.3 Error Suggestion](https://www.w3.org/WAI/WCAG22/Understanding/error-suggestion.html)

---

### 4. Robust

#### 4.1.2 Name, Role, Value (Level A) — **Major gaps**

No `aria-*` / `role` in application Vue/TS (grep across `src/`). Custom widgets (menu icon, D3 chart, feature panel, compare handle) lack names/roles/states.

**Suggested change:** Systematic pass: every interactive control gets accessible name; regions `role="region"` + `aria-label` for left/right map.

**Standard:** [4.1.2 Name, Role, Value](https://www.w3.org/WAI/WCAG22/Understanding/name-role-value.html)

---

#### 4.1.3 Status Messages (Level AA) — **Not met**

Loading screen (`App.vue` L3–32) has no `aria-live` region; theme load failures silent on map route; solo/view mode changes not announced.

**Suggested change:** `aria-live="polite"` on loading text; `role="status"` when map data ready.

**Standard:** [4.1.3 Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)

---

### Motion and animation

#### 2.3.3 Animation from Interactions (Level AAA) / best practice for AA sites

No `@media (prefers-reduced-motion: reduce)` anywhere.

| Animation | Location |
|-----------|----------|
| Loading bounce/pulse | `App.vue` |
| Landing hover lift | `Landing.vue` |
| Map `flyTo` on search | `ComparisonMap.vue` |
| D3 transitions | `TimelineVisualization.vue` |
| Carousel `cycle` | `Landing.vue` |

**Suggested change:** Respect `prefers-reduced-motion: reduce` — disable carousel autoplay, shorten/remove `flyTo`, disable D3 transitions.

**Related:** [2.3.3 Animation from Interactions (AAA)](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html) — often adopted as best practice for public health tools.

---

## Map-specific note (W3C guidance)

Interactive web maps are a known challenge. W3C’s [Maps for HTML and web mapping accessibility](https://www.w3.org/community/maps4html/) and [Making content usable for people with cognitive and learning disabilities](https://www.w3.org/TR/coga-usable/) recommend **textual alternatives**, keyboard paths, and clear instructions. WCAG does not exempt maps from **2.1.1** or **1.1.1**; a **supplementary data/navigation panel** is the pragmatic way to conform without replacing MapLibre.

---

## Left map controls hidden

```385:387:src/components/ComparisonMap.vue
.left-panel .maplibregl-ctrl-top-right {
  display: none;
}
```

Side-by-side users relying on keyboard may only reach controls on the right map — **2.1.1** equity issue between panels.

**Suggested change:** Duplicate zoom controls in app chrome per side, or unhide with accessible labels.

---

## Priority remediation roadmap

| Priority | WCAG SC | Item |
|----------|---------|------|
| P0 | 2.1.1, 1.1.1, 4.1.2 | Keyboard geography selection + feature panel as dialog; labeled menu button |
| P0 | 1.4.1, 1.3.3 | Non-color cues for data; text values in popup/table |
| P1 | 1.1.1, 2.4.6, 2.4.2 | Alt text; `<h1>` per route; dynamic `document.title` |
| P1 | 2.4.1, 2.4.7, 2.4.11 | Skip link; focus visible; focus not obscured |
| P1 | 1.4.3, 1.4.11 | Contrast audit on branding + theme headers + legends |
| P2 | 1.4.13, 4.1.3 | Hover/focus panel behavior; live regions |
| P2 | 2.5.7, compare | Drag alternative for compare slider |
| P2 | Motion | `prefers-reduced-motion` |
| P3 | 1.4.4 | Remove `body.style.zoom` |
| P3 | 3.3.x | Config editor alerts → inline errors |

---

## Suggested implementation phases (default design)

### Phase 1 — Quick wins (1–2 days)
- Skip link; menu `v-btn` with `aria-label`
- Alt text on logos/icons; carousel alts from config
- `<h1>` on Landing and MapPage; update `document.title` on map
- Feature panel: `role="dialog"`, labeled close, Escape to dismiss
- `prefers-reduced-motion` CSS + disable carousel autoplay when set
- External link new-tab text
- Indicator `v-select` `label` / `aria-label`

### Phase 2 — Map accessibility (larger)
- “Explore by geography” searchable list (keyboard) synced with map selection and `Popup` data
- Announce selection/freeze via `aria-live`
- Timeline: keyboard-focusable years; text legend for series
- Contrast-safe theme header (min contrast check in `MapPage` / config)

### Phase 3 — Data visualization (config + code)
- Optional patterns for area classes; value labels at high zoom
- Branding palette documentation: which colors are allowed for text vs fills
- Optional full-screen “Data table” view (export CSV already exists — surface in UI as accessible alternative)

---

## Testing checklist (post-fix)

- [ ] Keyboard-only pass: home → map → indicator → year → feature details → back
- [ ] NVDA/VoiceOver: landmarks, headings, dialog, live regions
- [ ] axe DevTools on Landing, Map, ConfigEditor
- [ ] Contrast checker on each theme header color (all categories in `main.json`)
- [ ] 200% zoom / 320px width reflow
- [ ] `prefers-reduced-motion: reduce` in OS settings
- [ ] Embed iframe: parent page title + iframe `title` still accurate

---

## References

- [WCAG 2.2](https://www.w3.org/TR/WCAG22/)
- [Understanding WCAG 2.2](https://www.w3.org/WAI/WCAG22/Understanding/)
- [How to Meet WCAG (Quick Reference)](https://www.w3.org/WAI/WCAG22/quickref/)
- [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [Web Accessibility Initiative — Maps](https://www.w3.org/WAI/perspective-videos/customizable/)

---

*This document reflects the codebase as of the audit date. Re-run review after major UI or map interaction changes.*
