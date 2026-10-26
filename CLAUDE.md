# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## House rules

- `main` = production (https://arras.north-arrow.org/). `dev` = staging (https://arras.north-arrow.org/dev/). **Never push directly to `main`.**
- Routine: feature branch → PR into `dev` → the maintainer checks staging → PR `dev` into `main`.
- Never deploy with `git subtree push` or `npm run deploy-gh`. Deploys happen only through CI on merge.
- Edit configs in `public/config/`. Never hand-edit `dist/`.
- Before committing, run `npm run validate-config` (every JSON file in `public/config/`) and `npm run build`.
- Explain each change in plain language before committing.

## Overview

Vue 3 + TypeScript + Vite + Vuetify 3 + Pinia + MapLibre GL + D3 dashboard of community health indicators for Chester and Lancaster Counties, SC. Static site on GitHub Pages: no backend. **DEVELOPER.md is the full technical reference** (architecture diagram, data pipeline, deploy details, an "agent-oriented quick map" for bug triage). README.md covers editor and content workflows. Read DEVELOPER.md before you make non-trivial changes.

## Commands

```bash
npm ci
npm run dev              # Vite dev server, base "/"
npm run validate-config  # fail if any public/config/*.json is invalid JSON
npm run build            # vue-tsc -b (type check) && vite build -> dist/
npm run preview          # serve dist/
npm run verify-dist      # fail if dist/index.html or 404.html reference missing /assets/* hashes
```

There is no test suite and no linter. `validate-config` and `npm run build` (the `vue-tsc` type check) are the only automated checks. The in-app `/validate` route checks configs and sheets at runtime (see below). `npm run deploy-gh` exists but is off-limits (see House rules).

## Branches and deploy

- `.github/workflows/deploy.yml` runs on every push to `dev` or `main`: `npm ci` → `validate-config` → build (`--base=/dev/` or `--base=/`) → `verify-dist` → publish to the `gh-pages` branch (`dev/` folder or root) with `keep_files: true`, so a `main` deploy keeps `/dev/`. A failing step leaves the live site unchanged.
- The `@claude` GitHub workflow (`.github/workflows/claude.yml`) uses `dev` as its base branch.
- `git subtree push --prefix dist` ships a new `index.html` without its gitignored hashed assets, and the live site 404s.
- `dist/` is listed in `.gitignore` but some of its files are tracked anyway (there are "build" commits). CI rebuilds it.
- Paths must work under both bases. Use `import.meta.env.BASE_URL` (or relative paths) and never hard-code a leading `/`.
- The build needs no secrets or env values. `VITE_BASE` is optional; CI passes `--base` instead.

## Indicator data (Google Sheets)

Each indicator is its own Google Sheet, fetched live by the browser as CSV. Sheet edits need no deploy.

**Tabs:** `staging`, `production`, `QC`, `QC_Errors`, `QC_Log`, `_setup`. The QC tab sets per-column rules (type, required, min/max, allowed exceptions). The QC Apps Script is **not in this repo**, so the tabs and menu below can't be checked from here.

**Workflow:** edits go into `staging` only. The sheet's "CHID Data QC" menu has "Validate Staging" (check only) and "Validate & Publish to Production" (check, then copy `staging` → `production` only if it passes). Errors go to `QC_Errors`. Every run is logged in `QC_Log`, with `published = TRUE` only for publish runs. Never edit `production` directly.

**Layout** (parsed by `formatGoogleSheetData` in `src/utils/data-transformations.ts`):
- Row 1: human-readable labels.
- Row 2: machine headers. Always `geoid`, then per-year columns: `pop_YYYY`, `count_YYYY`, `pct_YYYY`, `moe_count_YYYY`, `moe_pct_YYYY`. Some sheets also use `name`, `rate_YYYY`, `ci_low_YYYY` / `ci_high_YYYY`, or point fields (`lat`, `lng`, `more_info`).
- Row 3 onward: data, either 11-digit tract geoids or 5-digit county geoids, plus `overall` and `statewide` summary rows.
- **No commas in any cell, in any row.** The parser splits every line on `,` and ignores CSV quoting.

Header names must match across the sheet, the QC rules, and the indicator config in `public/config/`.

**Which tab the site reads.** `google_sheets_url` is used on production. On `/dev/`, `dev_google_sheets_url` is used when it is set (`src/utils/resolveGoogleSheetsUrl.ts`). As of 2026-10-25 the URLs come in two forms:
- **`gid` URLs** (all 12 education indicators and `no_health_insurance`): `…/export?format=csv&gid=<N>`, or a `/pub?gid=` link. The prod and dev URLs carry different `gid`s, so `/dev/` really does read a different tab.
- **`sheet=` URLs (broken; the other 30 indicators)**: `…/export?format=csv&sheet=production` and `…&sheet=staging`. Google's `/export` endpoint ignores `sheet=` and always returns the **first tab**. Both URLs return identical bytes for all 30, so the live site and `/dev/` show the same data, and `/dev/` does not preview staging.
  - To fix one, switch it to `&gid=<that tab's gid>`.
  - Don't switch to `gviz/tq?…&sheet=`. That endpoint merges rows 1–2 into a single header and blanks text cells (such as `overall`) in numeric columns, which breaks the parser.

## ArcGIS API key

The key is **hard-coded** and ships to the browser. It is not a build secret. It appears in two places:
- `src/utils/arcgisConfig.ts` (`ARCGIS_TOKEN`), used by `LocationSearch.vue` and by the remote-style path in `createArcGISStyle.ts`.
- `public/assets/localStyle.json`, embedded in the basemap tile and source URLs. This is the basemap in use, because `USE_LOCAL_STYLE = true` in `createArcGISStyle.ts`.

If the key is rotated, update **both** files, or the basemap tiles and location search stop loading. Keep the key restricted to the site's referrer in the Arras ESRI account, and never paste its value into commits, PRs or chat.

## Architecture essentials

- **Configs are runtime JSON** in `public/config/`: `main.json` holds categories/themes, `geo{}` per geotype, `data_sources`, and `landing_text`. There is one `{theme}.json` per theme, with an `indicators[]` array. `arras_branding.json` holds named colors, which categories reference by key and never as raw hex. `src/main.ts` fetches these at startup, merges `main.geo[geotype]` into each indicator, and `provide`s `mainConfig`, `categoryConfigs`, `arrasBranding`, and a `mitt` event bus.
- **Indicator schema**: `src/types/IndicatorConfig.ts` and `docs/INDICATOR_CONFIG_SPECIFICATION.md`. `short_name` must be unique within a theme file.
- **Stores**: `themeLevelStore` holds the active `?theme=`, loads every indicator CSV, and merges category style onto indicators. `indicatorLevelStore` has two instances, keyed `left`/`right`, one per map side. `accessibilityStore` handles the enhanced-visuals toggle and aria-live announcements.
- **Map**: `ComparisonMap.vue` runs two MapLibre maps through a vendored `maplibre-gl-compare` (`src/assets/`), with side-by-side and solo modes. `DataToMap` (`src/utils/dataToMap.ts`) is the base class: `AreaDataToMap` draws tract/county choropleths and `PointDataToMap` draws school/facility points. Popups are the custom `Popup.vue`, not MapLibre popups. Cross-component events go over `mitt` and are suffixed by side (`popup-left-changed`, `indicator-changed-right`, …). Basemap styles and location search use ArcGIS, through `createArcGISStyle.ts`, `mapRequestTransform.ts`, and `arcgisConfig.ts`.
- **Routes** (`src/main.ts`): `/` (Landing), `/map?theme=<query_str>`, `/config-editor` (client-side JSON editor; downloads files, never commits them), and `/validate`.
- **Validation** (`src/utils/validation/`): `runValidation.ts` loads every config file, checks it with `validateConfigJson.ts`, then fetches each referenced sheet and checks its CSV structure with `validateSheetCsv.ts`. `Validate.vue` displays the results. Update these validators when you change the config schema or sheet conventions.
- **Landing slideshow**: `vite/slideshowImagesPlugin.ts` builds the `virtual:slideshow-images` module from `public/slideshow/` at build time. New images show up only after a rebuild.
- **Embed mode**: `src/composables/useEmbedSync.ts` and `src/utils/embedMessages.ts` keep the iframe URL in sync with the parent page. `embed-test/` has an example host page.
