## Project Summary: Arras Community Health Indicator

**Period:** February 2026
---

### Map and Indicator System

#### Outline Data-to-Map Worker
- New `OutlineDataToMap` class in `outlineDataToMap.ts` for outline-only (line) visualization
- Line color driven by indicator config via `style.lineColorExpression` instead of programmatic expressions
- Same data-merge and hover/click behavior as area indicators; ColorLegend supported for outline geolevel
- Wired into `dataToMapWorkerFactory`, `indicatorLevelStore`, and `ComparisonMap.vue` (ColorLegend for `geolevel === 'outline'`)

#### 3 Hours
---

#### Child Layers and Geo Config
- Child layer workers no longer return null: factory uses `geolevel ?? geotype` so configs with only `geotype` (e.g. `"outline"`) still get the correct worker type
- Added `"outline"` entry to `main.json` geo (geolevel, source_name, layers) for outline-on-tract use cases
- In `main.ts`, child_layers are now merged with `geoConfigs[child.geotype]` so each child gets `geolevel`, `source_name`, and `layers`

#### 3 Hours
---

#### Worker Constructor and Factory
- All data-to-map workers (Area, Outline, Point) accept optional 7th parameter `isChildLayer` and pass it to base `DataToMap` for use in constructors
- Factory uses `DataToMapWorkerCtor<T>` type so 7-argument constructor calls type-check without errors
- Removed redundant debug logging in child layer creation

#### 3 Hour
---

### Configuration and Types

#### IndicatorConfig and Data Merge
- `IndicatorConfig`: added `style.lineColorExpression` (optional) for outline line-color expressions; added `legend.extra_layers.data_merge` with `source` and `google_sheets_url`
- `dataToMap.ts`: `generateExtraGeojson` now receives `data_merge` from `legend.extra_layers` with proper typing (variable + cast where needed)
- Fixed `extra_layers`/data-merge access so `generateGeojson` and `generateExtraGeojson` use the correct config shape

#### 2 Hour
---

### Bug Fixes and Compatibility

#### TypeScript and Runtime
- Replaced `String.replaceAll` with `String.replace(/\{\{pct\}\}/g, ...)` in `dataToMap.ts` for ES target compatibility (avoid "replaceAll does not exist" on older lib)
- Resolved "Property 'source' does not exist on type 'string[]'" in generateGeojson by typing `extra_layers` access for data-merge
- Resolved "Property 'data_merge' does not exist" via type definition and call-site typing for `legend.extra_layers.data_merge`

#### 1.5 Hours
---

#### Store and CSV Export
- Exposed `csvData` from `indicatorLevelStore` by adding it to the store’s return object so `TimelineVisualization.vue` can use it
- CSV download in timeline (e.g. `indicatorStore.csvData.value`) now works without "Property 'csvData' does not exist" errors

#### 1.5 Hours
---

### Documentation

- Added February 2026 project updates (this document).

---
