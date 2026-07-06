# Acacia Seedboard — Hosting on Vercel (via GitHub)

Host the live, shared Seedboard on Vercel. Deploy is Git-based: you put these files in a
GitHub repo, connect it to Vercel, and every future change auto-deploys.

**No CLI needed** — the GitHub → Vercel connection does the deploying for you.

### What's in this folder (`vercel\`)
```
index.html                 ← the board (served at /)
api/state.js               ← GET/POST /api/state  (shared board, via Upstash Redis)
api/import-transcript.js   ← POST /api/import-transcript (Claude extracts tasks)
package.json               ← dependencies (Vercel installs them automatically)
.gitignore
```
> There is **no `node_modules`** here on purpose — Vercel installs dependencies during
> deploy, so the repo stays small.

### ⚠️ No login (for now)
This version has **no staff login** — anyone with the URL can view and edit the board.
Fine for getting started, but if tasks reference client work, add the password gate before
sharing widely (ask me — it's built to drop in).

---

## Prerequisites (done ✓)
- A **GitHub** account.
- A **Vercel** account, signed in **with GitHub**.

---

## Step 1 — Put the files in a GitHub repo (browser only, no git install)
1. Go to **https://github.com/new**.
2. **Repository name:** `acacia-seedboard` · set it to **Private** · **Create repository**.
3. On the empty repo page, click **"uploading an existing file"** (a link in the middle).
4. Open your `...\Seedboard Hosting\vercel\` folder in File Explorer, select **everything inside it**
   (`index.html`, the `api` folder, `package.json`, `.gitignore`) and **drag it onto the
   GitHub upload area**. The `api` folder keeps its structure.
5. Scroll down → **Commit changes**.

You should now see `index.html`, `api/`, and `package.json` listed in the repo.

---

## Step 2 — Import the repo into Vercel
1. Go to **https://vercel.com/new**.
2. Under **Import Git Repository**, find `acacia-seedboard` → **Import**.
   (If it's not listed, click **Adjust GitHub App Permissions** and grant Vercel access to the repo.)
3. **Framework Preset:** leave as **Other** · leave build settings default.
4. Click **Deploy**. Wait ~1 minute.
5. You'll get a live URL like `acacia-seedboard.vercel.app`. It loads, but the board won't
   sync yet — we add the database next.

---

## Step 3 — Add the shared database (Upstash Redis, free)
1. In your Vercel project → **Storage** tab → **Create Database** → choose **Upstash → Redis**
   (via the Marketplace) → pick the **Free** plan → a region near the UK (e.g. `eu-west-1`) →
   **Create**, then **Connect** it to this project.
2. This automatically adds the connection secrets to your project's environment variables
   (`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`, and/or `KV_REST_API_URL` /
   `KV_REST_API_TOKEN`). You don't need to copy anything by hand.

---

## Step 4 — Add your Claude API key (for transcript import)
1. Get a key at **https://console.anthropic.com → API Keys → Create Key** (`sk-ant-…`).
   Pay-as-you-go, ~pennies per transcript. *(Optional: set a spend cap under Billing → Limits.)*
2. Vercel project → **Settings → Environment Variables → Add**:
   - **Key:** `ANTHROPIC_API_KEY` · **Value:** your `sk-ant-…` key · **Environments:** all → **Save**.
   - *(Optional)* `ANTHROPIC_MODEL` = `claude-sonnet-4-6` for a cheaper model (default is `claude-opus-4-8`).

---

## Step 5 — Redeploy so the new settings take effect
1. Vercel project → **Deployments** tab → open the latest → **⋯ → Redeploy** (or just push any
   change to GitHub, which redeploys automatically).
2. Once it finishes, open your `…vercel.app` URL.

---

## Step 6 — Test
1. Open the site, tick a task, add one manually.
2. Open it in a **second browser / incognito** — changes should cross over within ~3s (the
   "🔄 a teammate updated the board" pill).
3. Click **📥 Import transcript**, paste a real transcript, review the suggested assignees,
   **Add selected to board**.
4. Quick check: visit `https://<your-app>.vercel.app/api/state` — should show JSON.

Then share the `…vercel.app` link with the team (open it yourself first so your board seeds
the shared version).

---

## Step 7 — Custom domain (later, optional)
Your main site already runs on Vercel, so `tasks.acaciawealth.co.uk` should be added by
**whoever manages that Vercel account / your GoDaddy DNS**:
1. In this Vercel project → **Settings → Domains → Add** → `tasks.acaciawealth.co.uk`.
2. Vercel shows a **CNAME** target → add it in **GoDaddy DNS** (Name `tasks` → the Vercel value).
3. Vercel issues HTTPS automatically once DNS resolves.

Until then, the free `…vercel.app` URL works fine.

---

## Updating the board later
- Staff ticks / reassignments / imported tasks sync automatically — nothing to redeploy.
- To publish a **new baseline board** (regenerated HTML): replace `index.html` in the GitHub
  repo (edit → upload new file) and Vercel auto-deploys. Keep the live-sync + import
  `<script>` blocks at the bottom. Shared data (in Redis) survives.

## Cost
- **Vercel Hobby:** £0. **Upstash Redis Free:** £0 (10k commands/day — plenty).
- **Claude API:** pay-as-you-go, ~pennies per transcript; nothing when unused.

## Troubleshooting
| Symptom | Fix |
|---|---|
| Board loads but ticks don't sync | `/api/state` returns a Redis error → confirm Upstash is **Connected** to the project (Step 3), then redeploy. |
| Import says "not configured" | Add `ANTHROPIC_API_KEY` (Step 4) and redeploy. |
| Import errors out | Check the key is valid / has credit; see the deployment's **Functions logs** in Vercel. |
| Repo not shown in Vercel | Vercel → import → **Adjust GitHub App Permissions** → grant access to `acacia-seedboard`. |
