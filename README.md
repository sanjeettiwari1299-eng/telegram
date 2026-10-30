# Telegrow — a hardened fork of Telegram Web A

A personal, self-hosted Telegram web client: the full [Telegram Web A](https://github.com/Ajaxy/telegram-tt)
code base (the official client behind [web.telegram.org/a](https://web.telegram.org/a)), re-branded as
**Telegrow**, with every purchase surface stripped out, deployed automatically to **GitHub Pages**.

- 🌐 Live site: **https://sanjeettiwari1299-eng.github.io/telegram/**
- 🖤 Brand: **Telegrow** — dark terminal look, custom logo, custom PWA metadata
- 🚫 **No Telegram Premium, no Stars, no gifts, no purchase buttons**
- 🛡️ **No ads, no sponsored posts, no third-party trackers or beacons**
- 💻 **Hacker HUD**: every send / delete / edit / forward / pin answers with a terminal chip
- 👋 Custom boot screen: `WELCOME BACK, LAKSHAY` on every open
- ⚙️ Deploy: GitHub Actions → GitHub Pages (`.github/workflows/deploy-pages.yml`)
- 📜 License: GPL-3.0-or-later (same as upstream)

---

## What this fork changes

Everything fork-specific lives in **`src/fork/`**, so upstream merges stay clean.

| Area | File | What it does |
| --- | --- | --- |
| Brand + toggles | `src/fork/config.ts` | App name, owner name, purchase kill-switch, welcome screen settings |
| Purchase guards | `src/fork/guards.ts` | Blocks Premium / gifts / Stars actions at the action layer |
| Boot screen | `src/components/fork/WelcomeOverlay.tsx` | Terminal-style “welcome back” animation |
| Brand strings | `branding.json` | PWA name, description, theme colors |
| Icons | `dev/branding/` | Logo source + generators for the whole icon set |

### Removed purchase surfaces

- Settings → **Telegram Premium**, **Stars**, **Gram**, **Send a gift** rows
- **Premium** upsell badges in privacy screens (`PremiumStatusItem`)
- **Gift** button in the chat header/footer and the profile menu
- Action-level hard guards: `openPremiumModal`, `openGiftModal`, `openStarsGiftingPickerModal`
  are rejected, so no hidden button, deep link or keyboard shortcut can open a payment flow
  (you get a `Purchases are disabled on Telegrow.` toast instead)

### Welcome screen

On every app open a terminal-style overlay types a boot sequence and shows
`WELCOME BACK, LAKSHAY` with an `access granted` line. It closes on its own after ~4 seconds,
or immediately on any key/click. Tune it in `src/fork/config.ts`:

```ts
export const FORK_OWNER_NAME = 'Lakshay';       // name in the greeting
export const FORK_SHOW_WELCOME = true;          // false to turn it off
export const FORK_WELCOME_DURATION = 4200;      // ms on screen
```

### Hacker HUD (action feedback)

Every core action answers with a terminal chip in the corner — `> PACKET DISPATCHED · mtproto · encrypted`,
`> PACKET PURGED · secure wipe`, and so on. Wired in `src/global/actions/api/messages.ts` via
`emitHackerFeedback()` (`src/fork/hackerFeedback.ts`), rendered by `src/components/fork/HackerHud.tsx`.

| Action | Chip |
| --- | --- |
| Send message | `packet dispatched · mtproto · encrypted` |
| Send many | `bulk dispatch · N packets` |
| Edit message | `payload rewritten · sync · in place` |
| Delete message | `packet purged · secure wipe` |
| Forward | `packet relayed · handoff · encrypted` |
| Pin / unpin | `packet pinned` / `pin released` |

Add more anywhere in the code base:

```ts
import { emitHackerFeedback } from '../../../fork/hackerFeedback';

emitHackerFeedback('channel opened', 'secure');
```

### Ads, trackers & telemetry removed

| Surface | What was done |
| --- | --- |
| Telegram Ads in chats | `loadSponsoredMessages` never fetches — no ad is requested, rendered or cached |
| Ad telemetry | `viewSponsored`, `clickSponsored`, `reportSponsored` are hard no-ops (no view/click pings) |
| Sponsored search slot | `fetchSponsoredPeer` is no longer called; results list is ads-free |
| t.me "websync" beacon | Cross-domain `<script>` ping disabled (`FORK_BLOCK_WEBSYNC`) |
| Foursquare icon CDN | Venue icons no longer hit `ss3.4sqi.net`; the host was also dropped from the CSP |
| Third-party analytics | None existed in the upstream client and none were added; no cookies/ETag beacons |

The only outbound connections left are the ones that make Telegram work: the MTProto WebSocket to
Telegram's data centers (and Telegram's own media CDNs), plus the `t.me` links you choose to open.

---

## Automatic updates (zero maintenance)

The fork keeps itself up to date. You should never need to touch it.

| Automation | What it does | Schedule |
| --- | --- | --- |
| **`Sync upstream`** (`.github/workflows/upstream-sync.yml`) | Pulls the newest `Ajaxy/telegram-tt`, applies the delta, typechecks + builds, commits, pushes and deploys | Daily, 03:17 UTC |
| **`Deploy to GitHub Pages`** | Publishes `dist/` — runs on every push to `main` and is also called by the sync workflow | On push / on sync |
| **`Auto-merge bot PRs`** | Merges Dependabot PRs for GitHub Actions versions (any bump, after validating the workflow YAML) and re-dispatches the Pages deploy to prove the bumped actions work | On PR |
| **Dependabot** (`.github/dependabot.yml`) | Opens one grouped PR per week for action updates | Weekly, Monday |

### How the sync works

This fork does not share git history with upstream (the code was imported as a snapshot and then
patched), so a plain `git merge upstream/master` is impossible. `dev/upstream-sync.mjs` instead diffs
the upstream **tree** between the last synced commit (`.github/upstream-sync.json`) and the newest
commit, then applies it file by file:

1. **Fork-owned paths** (branding, `src/fork/**`, `src/components/fork/**`, workflows, icons,
   generated assets) — never touched.
2. **Files you never modified** — replaced with the upstream version.
3. **Files you patched** (e.g. `src/global/actions/ui/stars.ts`) — real 3-way merge
   (`git merge-file`, base = upstream at the last sync), so upstream changes and the fork's patches
   both survive.
4. **Anything that genuinely conflicts** — nothing is pushed; an issue named **“Upstream sync needs a
   hand”** is opened with the run link. `main` and the live site stay exactly as they were.

After a successful sync the app is typechecked and production-built **before** the push, so a broken
upstream commit can never take the live site down — it just produces an issue instead.

### Manual controls

```sh
# Preview what a sync would change (no writes)
GITHUB_TOKEN=$(gh auth token) node dev/upstream-sync.mjs --dry-run

# Force a sync right now
gh workflow run upstream-sync.yml

# Re-point the baseline (e.g. after importing a brand new upstream snapshot)
# edit .github/upstream-sync.json → lastSyncedSha
```

### When would you actually need to do something?

Almost never. The only case is a real merge conflict with upstream in a file this fork also patches:

- You get an issue: **“Upstream sync needs a hand”** with the exact conflicting files
- Fix locally, push, and delete/close the issue — the next scheduled run picks up from there

Everything else (Telegram API changes, dependency bumps, action deprecations, deploys) is handled
automatically.

## 1. Local setup

Requirements: **Node.js 24+** (see `.node-version`), npm 11+.

```sh
cp .env.example .env
npm install
npm run dev          # http://localhost:1234
```

`.env` must contain your own Telegram API credentials:

```env
TELEGRAM_API_ID=123456
TELEGRAM_API_HASH=your_api_hash
BASE_URL=http://localhost:1234/
```

Get `api_id` / `api_hash` from <https://my.telegram.org> → *API development tools*
(step-by-step: [`docs/LOGIN.md`](docs/LOGIN.md)). **Never commit `.env`** — it is git-ignored.

### Logging in

Two flows, both unmodified Telegram: **QR code** (phone → Settings → Devices → Link Desktop Device)
or **phone number + OTP** (and the cloud password if 2FA is enabled).
Full walkthrough, screenshots-free troubleshooting and the API key guide: [`docs/LOGIN.md`](docs/LOGIN.md).

## 2. Going live on GitHub Pages

The workflow builds the app and publishes `dist/` on every push to `main` or an `arena/**` branch.

One-time setup (needs repository admin):

1. **Add Telegram credentials** — *Settings → Secrets and variables → Actions → New repository secret*
   - `TELEGRAM_API_ID`
   - `TELEGRAM_API_HASH`
2. **Enable Pages** — *Settings → Pages → Build and deployment → Source:* **GitHub Actions**
3. **Allow the workflow to deploy** — *Settings → Actions → General → Workflow permissions:*
   **Read and write permissions**

Then run **Actions → Deploy to GitHub Pages → Run workflow** (or just push).

Without the two secrets the site still deploys, but login fails because Telegram rejects the
placeholder API ID. Full walkthrough: [`docs/PAGES-SETUP.md`](docs/PAGES-SETUP.md).

## 3. Rebranding

All brand strings live in [`branding.json`](branding.json):

```json
{
  "name": "Telegrow",
  "shortName": "Telegrow",
  "title": "Telegrow",
  "description": "Telegrow — a private, self-hosted Telegram web client …",
  "themeColor": "#04140c",
  "backgroundColor": "#04070a",
  "baseUrl": "https://sanjeettiwari1299-eng.github.io/telegram/"
}
```

Apply it (PWA manifests, meta tags, tile color, `.env`):

```sh
node dev/branding/applyBranding.mjs
```

Rebuild the icon set from `dev/branding/logo-source.png`:

```sh
pip install pillow
python3 dev/branding/make_icons.py
```

For Pages builds, `APP_TITLE` can also be overridden with a repository *variable*
(*Settings → Secrets and variables → Actions → Variables*).

## 4. Upstream sync

```sh
git remote add upstream https://github.com/Ajaxy/telegram-tt.git   # already configured
git fetch upstream
git merge upstream/master
```

## 5. Project scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server on `:1234` with HMR |
| `npm run build:production` | Production build into `dist/` |
| `npm run check` | TypeScript + ESLint + Stylelint |
| `npm test` | Unit tests (Vitest) |
| `node dev/branding/applyBranding.mjs` | Apply `branding.json` to the app shell |
| `python3 dev/branding/make_icons.py` | Rebuild the icon set from the logo source |

## 6. Credits & license

Original work © Alexander Zinchuk and Telegram Web A contributors, GPL-3.0-or-later.
This fork keeps the same license; all modifications stay in this repository.
The Telegrow logo and brand assets are custom-made and are not official Telegram artwork.
