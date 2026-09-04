# Arras Community Health Indicator

Interactive dashboard for exploring community health indicators across Lancaster and Chester Counties (side-by-side maps, timelines, and comparisons by theme).

**Live site:** [https://arras.north-arrow.org/](https://arras.north-arrow.org/)  
**Staging site:** [https://arras.north-arrow.org/dev/](https://arras.north-arrow.org/dev/)

**For developers:** see [DEVELOPER.md](./DEVELOPER.md) (architecture, deployment, maintenance).

### Editor how-tos (start here)

Step-by-step guides for non-technical users (GitHub website + Google Sheets only):

1. **[Update a config file on GitHub](./docs/editor-guide-update-config-on-github.md)** — edit JSON in the browser on the `dev` branch, validate, check staging, then merge to production with a pull request.  
2. **[Update Google Sheets data (with a staging copy)](./docs/editor-guide-update-google-sheets.md)** — duplicate a sheet tab, publish the dev CSV, wire `dev_google_sheets_url`, test on `/dev/`, then copy into the production tab when ready.

---

## Who this guide is for

This README is written for **project managers, content editors, and partners** who need to update data and content **without writing application code**. Technical JSON editing is sometimes required for new indicators; day-to-day **data updates** happen in Google Sheets.

---

## How the app gets its content

| Content | Where it lives | Updates go live when… |
|---------|----------------|------------------------|
| **Indicator numbers** | Google Sheets (linked by URL) | User opens/refreshes a theme on the site (fetched live) |
| **Which indicators exist & labels** | `public/config/*.json` | Changes are **deployed** (see below) |
| **Landing page paragraph** | `public/config/main.json` → `landing_text` | Deployed |
| **Landing carousel photos** | `public/slideshow/` folder | Deployed (images are picked up at build time) |
| **Theme names, icons, enable/disable** | `public/config/main.json` → `categories` | Deployed |
| **User guide PDF** | `public/user_guide.pdf` | Deployed (replace file, keep same name) |

The app does **not** read Google Docs directly. Data workflows use **Google Sheets**, published to the web as CSV.

---

## Publishing changes (non-developers)

Prefer the detailed guides above. Short version:

1. Make changes on the **`dev`** branch (configs via [GitHub UI guide](./docs/editor-guide-update-config-on-github.md); numbers via [Google Sheets guide](./docs/editor-guide-update-google-sheets.md)).
2. Check [staging](https://arras.north-arrow.org/dev/) and [validation](https://arras.north-arrow.org/dev/validate).
3. Merge **`dev` → `main`** with a GitHub pull request when ready (required for config/deployable files; sheet *values* on an existing production publish URL update live after you paste into the prod tab).

GitHub Actions builds automatically after pushes to **`dev`** (staging) and **`main`** (production).

If you do not have GitHub access, send updated config files or spreadsheets to your technical contact with clear instructions.

---

## Task: Update indicator data (Google Sheets)

**Full walkthrough:** [docs/editor-guide-update-google-sheets.md](./docs/editor-guide-update-google-sheets.md)

Summary: keep the sheet structure (`geoid`, year columns like `pct_2020` / `rate_2020`, no thousands commas), edit a **dev** tab first, publish it as CSV, optionally set `dev_google_sheets_url`, verify on `/dev/`, then copy into the **prod** tab for the live site.

See also [docs/INDICATOR_CONFIG_SPECIFICATION.md](./docs/INDICATOR_CONFIG_SPECIFICATION.md) → *Data Column Naming Convention*.

---

## Task: Add a new indicator

Adding an indicator requires **both** a Google Sheet **and** a new entry in the theme’s config JSON.

### A. Prepare the Google Sheet

Same rules as [Update indicator data](#task-update-indicator-data-google-sheets): `geoid`, optional `name`, and year columns (`pct_YYYY`, `rate_YYYY`, etc.).

### B. Add configuration

**Option 1 — Config Editor (recommended for editors comfortable with forms)**

1. Run the app locally (ask a developer) or open `/config-editor` on a dev build.
2. Open the correct **category** tab (Economy, Education, Health, etc.).
3. Add a new object to the `indicators` array (Form view or JSON view).
4. Download the updated JSON and give it to someone who can commit to `public/config/<theme>.json`.

**Option 2 — Copy an existing indicator**

1. Open `public/config/<theme>.json` (e.g. `economy.json`).
2. Duplicate an indicator with a similar map type (`geotype`: `tract` = areas, `school` / `facility` = points).
3. Change `short_name`, `title`, `short_title`, `google_sheets_url`, `popup`, `legend`, and `default` as needed.
4. Ensure `short_name` is unique within that file.

Full field reference: **[docs/INDICATOR_CONFIG_SPECIFICATION.md](./docs/INDICATOR_CONFIG_SPECIFICATION.md)**

Required fields (summary):

| Field | Purpose |
|-------|---------|
| `title` / `short_title` | Names shown in UI |
| `short_name` | Unique ID (no spaces; use underscores) |
| `geotype` | `tract`, `county`, `school`, `facility`, etc. (see `main.json` → `geo`) |
| `google_sheets_url` | Published CSV URL (production) |
| `dev_google_sheets_url` | Optional staging CSV URL (used on `/dev/` when set) |
| `default` | `"left"`, `"right"`, or `false` |
| `timeline` | `yearValuePrefix`, `yearValueShortFormat`, `filterOut` |
| `popup` | `format` (+ optional `popup_legend`) |
| `legend` | `title` / `title-column` |
| `data_source` | Optional; key for “Data source” link in legend |

### C. Deploy

Commit, push to `main`, wait for GitHub Actions. Confirm the new indicator appears in the dropdown on the map.

---

## Task: Edit landing page copy

**Prefer:** [Update a config file on GitHub](./docs/editor-guide-update-config-on-github.md) (edit `main.json` on `dev`, validate, merge).

Short version:

1. On branch **`dev`**, open **`public/config/main.json`**.
2. Find **`landing_text`** (one long string).
3. Edit the text. You may use **`<br><br>`** for paragraph breaks.
4. Commit on `dev`, check staging, then merge to `main`.

**Do not** remove the `categories` array or other keys unless a developer instructs you.

---

## Task: Edit landing page images (carousel)

Photos are **not** stored in Google Drive for the carousel. They are image files in the project.

1. Add or replace images in **`public/slideshow/`**  
   - Supported formats: **`.jpg`**, **`.jpeg`**, **`.png`** (any case, e.g. `.JPG`).
   - Use descriptive filenames; they are used for accessibility alt text.
2. To **remove** a slide, delete its file from that folder.
3. **Deploy** — the build scans this folder; new images are not listed on the live site until after deploy.

Order on the carousel follows the filenames (sorted alphabetically by the build).

**Image tips:** Landscape, roughly 1600×900 or similar; avoid huge file sizes for faster loading.

---

## Task: Edit theme areas (home page buttons & map themes)

In **`public/config/main.json`**, each item under **`categories`** controls a theme:

| Field | What it does |
|-------|----------------|
| `title` | Button label (e.g. “Economic Vitality”) |
| `query_str` | URL key (e.g. `econ` → `/map?theme=econ`) — **do not change** without developer help |
| `enabled` | `true` to show; `false` to hide |
| `description` | Short text (used in some contexts) |
| `config` | Path to indicator file (e.g. `/config/economy.json`) |
| `icon` | Path to icon image under `public/` (e.g. `assets/theme_icons/econ_blue.png`) |
| `style` | Theme colors for header/legend (uses keys from `arras_branding.json`, not raw hex) |

Replace theme icons by updating PNG files in **`public/assets/theme_icons/`** (keep filenames matched in JSON, or update JSON paths).

---

## Task: Update popup / legend wording for an indicator

Edit the indicator block in the theme JSON (`popup`, `legend`, `tooltip-info`). Placeholders: `{{pct}}`, `{{count}}`, `{{pop}}`, `{{value}}` (timeline).

Deploy after JSON changes. Sheet data does not control these strings.

---

## Task: Replace the User Guide PDF

1. Replace **`public/user_guide.pdf`** with the new PDF (same filename).
2. Deploy.

Linked from the navigation menu and landing page.

---

## Config Editor (browser tool)

URL (on a running site): **`/config-editor`**

- View/edit **`main.json`** and each category config.
- **Form view** or **JSON view**; validate and **download** files.
- The editor does **not** push to production by itself — downloaded files must be copied into `public/config/` in GitHub and deployed.

Use this to preview structure; always validate JSON before deploy.

---

## Accessibility (content editors)

- Landing carousel images: use meaningful filenames.
- Indicator `tooltip-info`: plain-language definitions help all users (shown in the info icon on the legend).
- See **[docs/accessibility-features.md](./docs/accessibility-features.md)** for the in-app accessibility button and defaults.

---

## Other documentation

| Document | Audience |
|----------|----------|
| [DEVELOPER.md](./DEVELOPER.md) | Developers & coding agents |
| [docs/INDICATOR_CONFIG_SPECIFICATION.md](./docs/INDICATOR_CONFIG_SPECIFICATION.md) | Indicator JSON reference |
| [docs/accessibility-audit.md](./docs/accessibility-audit.md) | WCAG gap analysis |
| [docs/accessibility-features.md](./docs/accessibility-features.md) | How accessibility features work |
| [docs/updates/](./docs/updates/) | Historical project update notes |

---

## Getting help

| Need | Contact |
|------|---------|
| GitHub deploy / broken site | Developer with repo access |
| New map layer or geotype | Developer |
| Google Sheet ↔ map mismatch | Check `geoid` and column names; then developer |
| ArcGIS API usage / billing | Arras ESRI account owners (basemap & location search use an API key) |

---

## Quick reference: theme URL keys

| Theme | `?theme=` value | Config file |
|-------|-----------------|-------------|
| Economic Vitality | `econ` | `economy.json` |
| Education | `edu` | `education.json` |
| Health | `health` | `health.json` |
| Natural Environment | `nat_env` | `natural_env.json` |
| Social & Cultural Wellbeing | `social_cultural` | `social_cultural.json` |

Example map link: `https://arras.north-arrow.org/map?theme=health`
