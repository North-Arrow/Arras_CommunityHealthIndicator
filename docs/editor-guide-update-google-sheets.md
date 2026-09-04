# How to update Google Sheets data (with a staging / “dev” copy)

This guide is for **editors and project partners** who need to change **indicator numbers** in Google Sheets and safely test them before the public site updates.

You will:

1. Find the correct production sheet tab
2. **Duplicate** it to create a **dev** (staging) tab
3. Edit **only** the dev tab
4. **Publish** the dev tab correctly as CSV
5. Put the new publish URL into the config as `dev_google_sheets_url` (if it is not there yet)
6. Check the **staging** website and validation page
7. When ready, **copy values into the production tab** so the live site updates

**Live (production) site:** [https://arras.north-arrow.org/](https://arras.north-arrow.org/)  
**Staging (test) site:** [https://arras.north-arrow.org/dev/](https://arras.north-arrow.org/dev/)  
**Validation (staging):** [https://arras.north-arrow.org/dev/validate](https://arras.north-arrow.org/dev/validate)

Config editing on GitHub (for adding the staging URL) is covered in detail here:  
[How to update a config file on GitHub](./editor-guide-update-config-on-github.md)

---

## Before you start

### What you need

- Access to the correct **Google Spreadsheet** for your indicator
- Permission to use **File → Share → Publish to web**
- GitHub access (or a teammate) if you must add a new `dev_google_sheets_url` the first time
- Roughly **30–45 minutes** the first time you set up a staging tab; later data updates are faster

### Two websites, two sheet tabs

| | Production (live) | Staging (test) |
|--|-------------------|----------------|
| **Website** | arras.north-arrow.org | arras.north-arrow.org/**dev**/ |
| **Sheet tab** | e.g. `prek (prod)` | e.g. `prek (dev)` |
| **Config field** | `google_sheets_url` | `dev_google_sheets_url` |
| **Who sees it** | The public | Your team testing changes |

**Golden rules**

1. Edit numbers on the **dev tab** first.  
2. Do **not** change the production publish URL while testing.  
3. Only copy data into the **prod tab** when staging looks correct.  
4. Never put commas inside numbers (write `1058`, not `1,058`) — commas break the app’s CSV reader.

---

## Part A — Find the production sheet and understand its structure

### Step 1 — Identify which indicator you are updating

Ask your project lead for:

- The **theme** (Economy, Education, Health, Natural Environment, Social & Cultural)
- The indicator’s everyday name (e.g. “Preschool Enrollment”)
- Optionally the technical id called **`short_name`** (e.g. `prek`)

### Step 2 — Find the production Google Sheet link (from config)

1. Open the GitHub repo:  
   [https://github.com/North-Arrow/Arras_CommunityHealthIndicator](https://github.com/North-Arrow/Arras_CommunityHealthIndicator)
2. Switch the branch dropdown to **`dev`** (recommended) or **`main`**.
3. Go to **`public` → `config` →** the theme file (e.g. `education.json`).
4. Use the browser find feature (**Ctrl+F** / **Cmd+F**) and search for part of the indicator title or `short_name`.
5. Find the line **`"google_sheets_url"`**.  
   It looks like a long Google link ending with **`output=csv`**.
6. **Copy that entire URL** into a new browser tab.

**Note:** The published CSV link often does **not** open the editable spreadsheet. It may download a file or show raw text. That is normal. You still need the **editable** Google Sheet from your team’s Drive (or from a bookmark your lead shared). Use the publish URL later for checking; use the editable spreadsheet for editing.

If you cannot find the editable sheet, ask your technical contact: “Please share the Google Sheet for `short_name` = …”.

### Step 3 — Learn the required layout (do not rearrange casually)

Each published sheet should have:

1. **Two header rows** near the top:
   - One row of **human-readable labels** (long titles)
   - One row of **short names** the app reads (must include **`geoid`**)
2. Data rows underneath (one geography per row)

Short-name columns usually look like:

- `geoid` (required)
- `name` (often present)
- Year metrics such as `pct_2020`, `count_2020`, `pop_2020`, or `rate_2020`

The prefix (`pct_`, `count_`, `pop_`, `rate_`) must match what the config’s `timeline.yearValuePrefix` expects.

**Do not:**

- Insert extra blank header rows above the two headers
- Rename short-name headers unless a developer asks you to
- Merge cells in the data area
- Use thousands separators (`,`) inside numeric cells

---

## Part B — Create a staging (“dev”) copy of the tab

### Step 4 — Rename the production tab clearly (optional but recommended)

In the editable Google Sheet, at the bottom:

1. Find the tab that feeds production.
2. Right-click the tab name → **Rename**.
3. Use a clear name such as **`prek (prod)`** or **`Poverty Rate (prod)`**.

This avoids editing the wrong tab later.

### Step 5 — Duplicate the tab

1. Right-click the **prod** tab.
2. Click **Duplicate**.
3. Rename the copy to something like **`prek (dev)`** or **`Poverty Rate (dev)`**.

You should now have **two tabs** with the same structure and the same starting numbers.

### Step 6 — Edit only the `(dev)` tab

1. Click the **`(dev)`** tab.
2. Change the numbers you need to update.
3. Double-check:
   - No `1,058`-style commas in numbers → use `1058`
   - Empty cells are OK when data is missing; do not type the word `null`
   - You did not alter the short-name header row by accident

Leave the **`(prod)`** tab unchanged until the final promotion step.

---

## Part C — Publish the dev tab correctly

Publishing creates a public CSV link the website can download. Each **tab** has its own `gid=` number in the URL.

### Step 7 — Publish the **dev** tab to the web

1. In Google Sheets: **File → Share → Publish to web**.
2. In the dialog:
   - In the dropdown that lists sheets/tabs, select your **`(dev)`** tab (not prod, not “Entire document” unless instructed).
   - Format: **Comma-separated values (.csv)**
3. Click **Publish** (confirm if asked).
4. **Copy the link** Google shows you.

### Step 8 — Confirm the publish URL looks right

A good URL usually looks like:

`https://docs.google.com/spreadsheets/d/e/2PACX-.../pub?gid=123456789&single=true&output=csv`

Checklist:

- [ ] Contains **`output=csv`**
- [ ] Contains **`gid=`** (identifies the tab)
- [ ] Preferably contains **`single=true`**
- [ ] Opening the link downloads/shows CSV text, **not** a Google login HTML page

**Paste the URL into a private/incognito window** to confirm it works without your Google login.

### Step 9 — Keep the production publish link unchanged

Do **not** re-point production’s old link unless a developer asks you to.  
The live site should keep using the existing **`google_sheets_url`** until you copy final values into the prod tab.

---

## Part D — Put the staging URL into the config (first time only)

If this indicator **already has** a `dev_google_sheets_url` in its config, skip to Part E and just edit/republish the same dev tab (same `gid`).

If it does **not** have one yet, add it once.

### Step 10 — Open the theme config on the `dev` branch

Follow [the GitHub config guide](./editor-guide-update-config-on-github.md) for the UI details. Summary:

1. GitHub repo → branch dropdown → **`dev`**
2. Open `public/config/<theme>.json`
3. Find your indicator block (`short_name` / title)
4. Click the pencil to edit

### Step 11 — Add `dev_google_sheets_url` next to `google_sheets_url`

Find:

```json
"google_sheets_url": "https://docs.google.com/spreadsheets/d/e/.../pub?gid=OLDPROD&single=true&output=csv",
"short_name": "prek",
```

Change it to (keep your real URLs; note the comma after the first URL line):

```json
"google_sheets_url": "https://docs.google.com/spreadsheets/d/e/.../pub?gid=OLDPROD&single=true&output=csv",
"dev_google_sheets_url": "https://docs.google.com/spreadsheets/d/e/.../pub?gid=NEWDEV&single=true&output=csv",
"short_name": "prek",
```

Rules:

- **Do not** replace `google_sheets_url` with the dev link.
- Paste the **dev** publish URL into **`dev_google_sheets_url`** only.
- Keep commas and quotes exactly as in neighboring lines.
- `short_name` stays the same.

### Step 12 — Commit on `dev`

1. **Commit changes** with a message like:  
   `Add staging sheet URL for prek`
2. Wait for the **dev** deploy in the **Actions** tab (green check).

After this commit exists on `dev`, the staging website will load the **dev** sheet for that indicator. Production still uses `google_sheets_url`.

---

## Part E — Validate and check staging

### Step 13 — Validation page

1. Open [https://arras.north-arrow.org/dev/validate](https://arras.north-arrow.org/dev/validate)
2. Wait for results.
3. Expand the theme file you touched (e.g. `education.json`).
4. Find your indicator under **Sheet data**.
5. If staging is active, the label may include **`[staging sheet]`**.
6. Fix any **FAIL** items:
   - Config typos → edit JSON on `dev` again
   - Sheet problems (bad headers, commas in numbers, wrong URL) → fix the **dev** tab and/or republish

### Step 14 — Manually check the staging map

1. Open [https://arras.north-arrow.org/dev/](https://arras.north-arrow.org/dev/)
2. Open the correct theme (e.g. Education).
3. Select your indicator from the dropdown.
4. Confirm:
   - Map colors/values look plausible
   - Timeline chart updates when you change year / geography
   - **Download CSV Data** shows your new numbers (this download uses the staging sheet on `/dev/`)
5. Hard-refresh if values look stale (**Ctrl+Shift+R** / **Cmd+Shift+R**).  
   Also try switching away from the theme and back so data reloads.

If anything looks wrong, fix the **dev** Google tab (and wait a moment for publish to refresh), then re-check. You do **not** need a GitHub deploy for pure cell-value changes on an already-published URL.

---

## Part F — Promote to production (when staging looks good)

### Step 15 — Copy data from the dev tab into the prod tab

1. Open the editable Google Spreadsheet.
2. Select the **`(dev)`** tab.
3. Select the data region you changed (or the whole data block if instructed).
4. Copy (**Ctrl+C** / **Cmd+C**).
5. Switch to the **`(prod)`** tab.
6. Paste values carefully so columns still line up with the short-name headers.  
   Prefer **Paste special → Values only** if you use formatting.
7. Spot-check a few rows against staging.

Because production’s **`google_sheets_url`** already points at the **prod** tab’s publish link, the **live site** will pick up the new numbers after a refresh (no config change required for values-only updates).

### Step 16 — Confirm production

1. Open [https://arras.north-arrow.org/](https://arras.north-arrow.org/) (**not** `/dev/`).
2. Open the theme and indicator.
3. Hard-refresh / switch themes to reload data.
4. Confirm values match what you approved on staging.

### Step 17 — Merge the config change to production (only if you added/changed `dev_google_sheets_url`)

If Part D required a GitHub config edit, merge **`dev` → `main`** using the GitHub UI so production also has the staging URL field for next time:

Follow Steps 9–12 in [How to update a config file on GitHub](./editor-guide-update-config-on-github.md).

If you **only** changed cell values and `dev_google_sheets_url` was already on `main`, you may **not** need a merge.

---

## Ongoing updates (after staging is set up once)

Next time you update the same indicator:

1. Edit the **`(dev)`** tab only.  
2. (Publish is usually already on; wait a minute if values don’t appear.)  
3. Check [staging](https://arras.north-arrow.org/dev/) + [/dev/validate](https://arras.north-arrow.org/dev/validate).  
4. Copy into **`(prod)`** when ready.  
5. Confirm [production](https://arras.north-arrow.org/).

No new publish URL and no config edit unless Google forces you to create a new link.

---

## Troubleshooting

| Problem | Likely cause | What to try |
|---------|--------------|-------------|
| Staging still shows old numbers | Cache or theme data not reloaded | Hard-refresh; leave theme and return; wait 1–2 minutes after Sheets edits |
| Staging shows production numbers | Missing/incorrect `dev_google_sheets_url`, or URL points at prod tab | Check config on `dev`; confirm publish `gid` is the **dev** tab |
| Validate says unexpected token / `""1"` / `058""` | Thousands comma in a cell (e.g. `1,058`) | Remove commas from numbers on the **dev** tab |
| Validate: sheet looks like HTML / sign-in | Sheet not published publicly, or wrong link | Re-publish CSV; test URL in incognito |
| Map blank / no timeline | Wrong column short names or prefix | Compare headers to a known-good indicator; ask a developer |
| Live site changed while I was only testing | You edited the **prod** tab or production URL | Stop; restore prod from backup/version history if needed; use **dev** tab for tests |

### Google Sheet version history (emergency)

In the editable spreadsheet: **File → Version history → See version history** can restore an earlier version if you overwrote production by mistake. Tell a technical contact if you are unsure.

---

## Safety checklist

- [ ] I edited the **`(dev)`** tab, not prod, while testing
- [ ] Dev tab published as **CSV** with `output=csv` and correct `gid`
- [ ] Config has `dev_google_sheets_url` (when needed) and **unchanged** `google_sheets_url`
- [ ] Config commit was on branch **`dev`**
- [ ] [/dev/validate](https://arras.north-arrow.org/dev/validate) looks acceptable
- [ ] Staging map + Download CSV look correct
- [ ] I copied final values into **`(prod)`** only when ready
- [ ] Production site confirms the update
- [ ] If I added a new config field, I merged **`dev` → `main`**

---

## Related guides

- [How to update a config file on GitHub](./editor-guide-update-config-on-github.md)
- [Main README](../README.md)
- [Config field reference](./INDICATOR_CONFIG_SPECIFICATION.md) (technical)
