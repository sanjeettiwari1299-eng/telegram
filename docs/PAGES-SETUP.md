# Enabling the live site on GitHub Pages

The repository ships with `.github/workflows/deploy-pages.yml`, which builds the client and publishes
`dist/` to GitHub Pages. Two repository settings have to be switched on **once** (they need
repository-admin rights, which a bot/integration token usually does not have).

## 1. Allow the workflow to write

**Settings → Actions → General → Workflow permissions**

- select **Read and write permissions**
- Save

Without this the deploy job fails with
`Resource not accessible by integration - .../pages#create-a-apiname-pages-site`.

## 2. Enable Pages with GitHub Actions as the source

**Settings → Pages → Build and deployment**

- **Source:** *GitHub Actions*

## 3. Add your Telegram API credentials

**Settings → Secrets and variables → Actions → New repository secret**

| Name | Value |
| --- | --- |
| `TELEGRAM_API_ID` | numeric API ID from https://my.telegram.org |
| `TELEGRAM_API_HASH` | API hash from https://my.telegram.org |

While these secrets are missing the workflow still publishes the site, but with a placeholder API ID,
so signing in will fail. Re-run the workflow after adding them.

## 4. Deploy

Push a commit to `main` (or any `arena/**` branch), or run
**Actions → Deploy to GitHub Pages → Run workflow**.

The site appears at `https://<owner>.github.io/<repo>/`.
The workflow derives that URL automatically and passes it to the build as `BASE_URL`.

## Optional: change the app title without touching code

**Settings → Secrets and variables → Actions → Variables → New repository variable** named
`APP_TITLE` (e.g. `My TG Client`). It overrides the title baked into the build.
