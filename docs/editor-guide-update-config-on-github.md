# How to update a config file on GitHub (no coding required)

This guide is for **editors and project partners** who need to change labels, titles, landing page text, or other settings in the Arras Community Health Indicator app **without using a code editor on your computer**.

You will:

1. Edit a config file **directly on GitHub**
2. Save your change to the **`dev`** (staging) branch
3. Wait for the staging site to update
4. **Validate** and **manually check** the staging site
5. **Merge** into production when ready (using GitHub’s website)

**Live (production) site:** [https://arras.north-arrow.org/](https://arras.north-arrow.org/)  
**Staging (test) site:** [https://arras.north-arrow.org/dev/](https://arras.north-arrow.org/dev/)  
**Validation page (staging):** [https://arras.north-arrow.org/dev/validate](https://arras.north-arrow.org/dev/validate)

---

## Before you start

### What you need

- A **GitHub account** that can edit this repository
- Permission to change configs
- About **15–30 minutes** the first time (later updates are faster)
- A modern browser (Chrome, Firefox, Edge, or Safari)

### Important ideas (plain language)

| Term | What it means |
|------|----------------|
| **Repository (repo)** | The project’s folder on GitHub that stores all files |
| **Config file** | A settings file (ends in `.json`) that tells the app what indicators exist, their titles, which Google Sheet to use, etc. |
| **Branch** | A parallel copy of the project. We use **`dev`** for testing and **`main`** for the live site |
| **Commit** | Saving a snapshot of your edit with a short note explaining what you changed |
| **Pull request (PR)** | A request on GitHub to copy changes from `dev` into `main` (staging → production) |
| **Merge** | Approving that pull request so production gets your changes |
| **Deploy** | GitHub automatically rebuilds the website after a push; wait a few minutes |

### Golden rule

> **Never edit `main` first for experimental changes.**  
> Edit and test on **`dev`**, then merge to **`main`** when everything looks good.

Editing `main` directly updates the **live public site**. Prefer the `dev` → merge workflow below.

---

## Which config file should I open?

Configs live under **`public/config/`**:

| File | What it controls |
|------|------------------|
| `main.json` | Landing page welcome text, which themes are on/off, theme names |
| `economy.json` | Economic Vitality indicators |
| `education.json` | Education indicators |
| `health.json` | Health indicators |
| `natural_env.json` | Natural Environment indicators |
| `social_cultural.json` | Social & Cultural indicators |
| `arras_branding.json` | Brand colors (usually leave alone) |

**Tip:** If you only need to change **numbers**, use Google Sheets instead — see [How to update Google Sheets data](./editor-guide-update-google-sheets.md). Config files are for **names, structure, and links**, not day-to-day data values.

---

## Step-by-step: Edit a config on the `dev` branch

### Step 1 — Open the repository on GitHub

1. Open this URL in your browser (bookmark it):  
   [https://github.com/North-Arrow/Arras_CommunityHealthIndicator](https://github.com/North-Arrow/Arras_CommunityHealthIndicator)
2. Sign in to GitHub if asked.

### Step 2 — Switch to the `dev` branch

Near the top left of the file list, you will see a branch dropdown (it often says **`main`**).

1. Click the branch dropdown.
2. Choose **`dev`**.
3. Confirm the dropdown now shows **`dev`** before continuing.

Everything you edit from here should be on **`dev`**, not `main`.

### Step 3 — Navigate to the config folder

1. Click the **`public`** folder.
2. Click the **`config`** folder.
3. Click the file you need (for example **`education.json`**).

You should see the file contents.

### Step 4 — Start editing

1. Click the **pencil icon** near the top right of the file view (tooltip often says **Edit this file**).
2. GitHub opens an editor in the browser.

**Be careful:**

- Do **not** delete commas `,` between items unless you know why.
- Do **not** delete curly braces `{` `}` or square brackets `[` `]`.
- Text must stay inside **double quotes** `"like this"`.
- If you only change a title, change **only** the words inside the quotes.

#### Example: change an indicator’s display title

Find a block that looks similar to:

```json
"title": "Percent of 3 and 4 year olds enrolled in preschool",
"short_title": "Preschool Enrollment",
```

Change the text **inside** the quotes only, for example:

```json
"title": "Percent of 3- and 4-year-olds enrolled in preschool",
"short_title": "Preschool",
```

#### Example: change landing page welcome text

1. Open **`main.json`** (still on branch **`dev`**).
2. Find **`"landing_text"`**.
3. Edit the long string after it.  
   You may use `<br><br>` to create paragraph breaks on the landing page.

### Step 5 — Commit (save) your change to `dev`

1. Scroll to the top or look for the **Commit changes** button (top right).
2. Click **Commit changes**.
3. In the dialog:
   - **Commit message:** Write a short plain-English note, e.g.  
     `Update preschool short title on education config`
   - Leave the option to commit **directly to the `dev` branch** selected (do **not** create a new branch unless a developer asked you to).
4. Confirm **Commit changes**.

GitHub now has your edit on **`dev`**. GitHub Actions will rebuild the **staging** site automatically.

### Step 6 — Wait for staging to update

1. Open the **Actions** tab at the top of the repository page.
2. Look for a recent workflow run named something like **Deploy to GitHub Pages** for the **`dev`** branch.
3. Wait until it shows a **green check mark** (usually a few minutes).  
   If it shows a **red X**, stop and contact a technical person — do not merge to production.

Optional: hard-refresh the staging site after it succeeds (**Ctrl+Shift+R** on Windows/Linux, **Cmd+Shift+R** on Mac).

---

## Step-by-step: Validate and manually check on staging

### Step 7 — Run the validation page

1. Open: [https://arras.north-arrow.org/dev/validate](https://arras.north-arrow.org/dev/validate)
2. Wait for validation to finish (loading spinner).
3. Review the summary chips at the top:
   - **Passed** / **Failed** for each config file
   - Warnings are yellow; failures are red
4. Expand any file marked **FAIL** and read the messages.  
   Common causes: a missing comma, an unclosed quote, or a typo in a required field name.
5. If something failed because of your edit:
   - Go back to GitHub
   - Edit the same file on **`dev`** again
   - Fix the issue and commit again
   - Re-check `/dev/validate`

**Goal before merging:** your changed config file should **PASS** (warnings may be OK if a technical person says so; **fails** should be fixed).

### Step 8 — Manually check the staging website

1. Open [https://arras.north-arrow.org/dev/](https://arras.north-arrow.org/dev/).
2. Depending on what you changed:

| If you changed… | Check this |
|-----------------|------------|
| Landing text | Home page paragraph |
| Theme name / enabled flag in `main.json` | Landing theme cards |
| Indicator `title` / `short_title` | Open that theme’s map → indicator dropdown and map labels |
| `default` left/right | Which maps load when the theme opens |
| Sheet URL fields | Map colors/timeline for that indicator (see Google Sheets guide) |

3. Open the relevant theme (for example Education).
4. Confirm the text and behavior look right.
5. If something is wrong, fix it on **`dev`** again (Steps 2–6) and re-check. **Do not merge yet.**

---

## Step-by-step: Merge to production with the GitHub UI

Only do this when staging looks correct and validation is acceptable.

### Step 9 — Open a pull request from `dev` to `main`

1. On GitHub, open the repository home page.
2. If GitHub shows a banner like **“dev had recent pushes”** with a **Compare & pull request** button, click it.  
   Otherwise:
   - Click the **Pull requests** tab
   - Click **New pull request**
   - Set **base:** `main` ← **compare:** `dev`  
     (You want to bring `dev` **into** `main`.)
3. Add a clear title, e.g. `Update education preschool titles`.
4. In the description, briefly list what you changed and that you checked staging + `/dev/validate`.
5. Click **Create pull request**.

### Step 10 — Review the pull request

1. On the pull request page, open the **Files changed** tab.
2. Skim the highlighted lines (green = added, red = removed).
3. Confirm only the files/lines you intended appear.

If something unexpected appears, ask a technical contact before merging.

### Step 11 — Merge into `main`

1. If checks are required, wait for them to pass (green).
2. Click **Merge pull request** (or **Squash and merge** if that is your team’s habit — ask if unsure).
3. Confirm the merge.
4. You can delete the temporary PR branch if GitHub offers that — **do not delete the long-lived `dev` branch**.

### Step 12 — Confirm production

1. Wait a few minutes for the **main** deploy workflow to finish (Actions tab).
2. Open [https://arras.north-arrow.org/](https://arras.north-arrow.org/) (production — **not** `/dev/`).
3. Hard-refresh and confirm your change appears.

---

## What if I made a mistake?

| Situation | What to do |
|-----------|------------|
| Typo still only on `dev` | Edit the file on `dev` again and commit a fix |
| Bad change already merged to `main` | Contact a technical person immediately; do not “guess” with more merges |
| Validation fails with a JSON error | You likely broke a comma or quote — compare to a similar nearby block |
| I edited `main` by accident | Tell a technical contact; prefer not to keep editing `main` directly |

---

## Safety checklist (print or keep handy)

- [ ] Branch dropdown shows **`dev`** before editing
- [ ] I only changed the text I meant to change
- [ ] Commit message describes the change
- [ ] Actions deploy for `dev` succeeded (green)
- [ ] [https://arras.north-arrow.org/dev/validate](https://arras.north-arrow.org/dev/validate) is acceptable
- [ ] I manually checked the staging site
- [ ] Pull request is **`dev` → `main`**
- [ ] After merge, I verified the **production** site

---

## Related guides

- [How to update Google Sheets data (with staging)](./editor-guide-update-google-sheets.md)
- [Main README](../README.md)
- [Full config field reference](./INDICATOR_CONFIG_SPECIFICATION.md) (more technical)
