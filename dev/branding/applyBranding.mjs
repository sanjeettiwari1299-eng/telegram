#!/usr/bin/env node
/**
 * Applies the branding defined in `branding.json` to the static shell of the app:
 *   - public/site*.webmanifest (PWA name, short name, description, colors)
 *   - index.html (descriptions, tile color, noscript heading)
 *   - public/browserconfig.xml (tile color)
 *   - .env (app title / base url used by the Vite build)
 *
 * Run: node dev/branding/applyBranding.mjs
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const branding = JSON.parse(readFileSync(resolve(rootDir, 'branding.json'), 'utf8'));

const {
  name, shortName, description, themeColor, backgroundColor, baseUrl,
} = branding;

function updateJson(filePath, updater) {
  const absPath = resolve(rootDir, filePath);
  if (!existsSync(absPath)) return;
  const data = JSON.parse(readFileSync(absPath, 'utf8'));
  updater(data);
  writeFileSync(absPath, `${JSON.stringify(data, null, 4)}\n`);
  console.log(`✓ ${filePath}`);
}

const manifests = [
  'public/site.webmanifest',
  'public/site_dev.webmanifest',
  'public/site_apple.webmanifest',
  'public/site_apple_dev.webmanifest',
];

manifests.forEach((filePath) => updateJson(filePath, (data) => {
  data.name = name;
  data.short_name = shortName;
  data.description = description;
  data.theme_color = themeColor;
  data.background_color = backgroundColor;
}));

const indexHtmlPath = resolve(rootDir, 'index.html');
if (existsSync(indexHtmlPath)) {
  let html = readFileSync(indexHtmlPath, 'utf8');
  html = html.replace(/(<meta name="description"\s+content=")[^"]*(")/, `$1${description}$2`);
  html = html.replace(/(<meta property="og:description"\s+content=")[^"]*(")/, `$1${description}$2`);
  html = html.replace(/(<meta property="twitter:description"\s+content=")[^"]*(")/, `$1${description}$2`);
  html = html.replace(/(<h1>)[^<]*(<\/h1>)/, `$1${name}$2`);
  html = html.replace(/(<meta name="theme-color" content=")[^"]*(")/, `$1${themeColor}$2`);
  html = html.replace(/(<meta name="msapplication-TileColor" content=")[^"]*(")/, `$1${themeColor}$2`);
  writeFileSync(indexHtmlPath, html);
  console.log('✓ index.html');
}

const browserConfigPath = resolve(rootDir, 'public/browserconfig.xml');
if (existsSync(browserConfigPath)) {
  let xml = readFileSync(browserConfigPath, 'utf8');
  xml = xml.replace(/(<TileColor>)[^<]*(<\/TileColor>)/, `$1${themeColor}$2`);
  writeFileSync(browserConfigPath, xml);
  console.log('✓ public/browserconfig.xml');
}

const envPath = resolve(rootDir, '.env');
const envExamplePath = resolve(rootDir, '.env.example');
if (existsSync(envPath) || existsSync(envExamplePath)) {
  const target = existsSync(envPath) ? envPath : envExamplePath;
  const lines = readFileSync(target, 'utf8').split('\n');
  const managed = {
    APP_TITLE: name,
    APP_NAME: name,
    BASE_URL: baseUrl,
  };
  const seen = new Set();
  const nextLines = lines.map((line) => {
    const match = /^([A-Z_]+)=/.exec(line);
    if (match && managed[match[1]] !== undefined) {
      seen.add(match[1]);
      return `${match[1]}=${managed[match[1]]}`;
    }
    return line;
  });
  Object.entries(managed).forEach(([key, value]) => {
    if (!seen.has(key)) nextLines.push(`${key}=${value}`);
  });
  writeFileSync(target, `${nextLines.join('\n').replace(/\n+$/, '')}\n`);
  console.log(`✓ ${target === envPath ? '.env' : '.env.example'}`);
}

// ---------------------------------------------------------------------------
// In-app branding (login / auth shell).
//
// The Telegram logo and the "Log in to Telegram by QR Code" heading are baked
// into upstream components and language packs. They are overridden from two
// fork-owned files that the upstream sync never touches:
//   - src/fork/branding.scss    (logo + accent + tagline, high specificity)
//   - src/fork/strings.ts       (heading text, wins over every language pack)
// This step keeps the wordmark in the tagline in sync with branding.json.
// ---------------------------------------------------------------------------
const forkScssPath = resolve(rootDir, 'src/fork/branding.scss');
if (existsSync(forkScssPath)) {
  const tagline = `${name.toUpperCase()} // encrypted \u00b7 private \u00b7 no ads`;
  const scss = readFileSync(forkScssPath, 'utf8');
  const nextScss = scss.replace(/(content: ")[^"]*(";)/, `$1${tagline}$2`);
  if (nextScss !== scss) {
    writeFileSync(forkScssPath, nextScss);
    console.log('\u2713 src/fork/branding.scss');
  }
}

const forkStringsPath = resolve(rootDir, 'src/fork/strings.ts');
if (existsSync(forkStringsPath)) {
  const strings = readFileSync(forkStringsPath, 'utf8');
  const nextStrings = strings.replace(
    /(LoginQRTitle: ')[^']*(')/,
    `$1Welcome to ${name}$2`,
  );
  if (nextStrings !== strings) {
    writeFileSync(forkStringsPath, nextStrings);
    console.log('\u2713 src/fork/strings.ts');
  }
}

const forkLogoPath = resolve(rootDir, 'src/assets/telegrow-logo.svg');
if (!existsSync(forkLogoPath)) {
  console.warn('! src/assets/telegrow-logo.svg is missing (login screen falls back to the Telegram mark)');
}

console.log(`\nBranding applied: ${name}`);
