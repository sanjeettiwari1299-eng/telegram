#!/usr/bin/env node
/**
 * Telegrow upstream sync.
 *
 * This fork does not share git history with upstream (the source was imported as
 * a single snapshot and then patched), so a normal `git merge upstream/master`
 * is not possible. Instead we diff the upstream *trees* between the last synced
 * commit and the newest commit, and apply the delta file by file:
 *
 *   - files we own (branding, fork patches, workflows, generated assets) are skipped
 *   - files we never touched are replaced with the upstream version
 *   - files we patched are 3-way merged (`git merge-file`, base = upstream at last sync)
 *   - anything that really conflicts is reported instead of being mangled
 *
 * Usage:
 *   node dev/upstream-sync.mjs            # apply changes to the working tree
 *   node dev/upstream-sync.mjs --dry-run  # only report what would happen
 *
 * Environment:
 *   GITHUB_TOKEN   optional, raises the GitHub API rate limit
 *   GITHUB_OUTPUT  set by Actions, receives `changed` / `conflicts` outputs
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const STATE_PATH = join(ROOT, '.github/upstream-sync.json');
const DRY_RUN = process.argv.includes('--dry-run');

/** Paths this fork owns completely — upstream must never overwrite them. */
const OWNED_PATTERNS = [
  /^README\.md$/,
  /^branding\.json$/,
  /^\.env\.example$/,
  /^\.gitignore$/,
  /^\.github\//,
  /^docs\//,
  /^dev\/branding\//,
  /^dev\/upstream-sync\.mjs$/,
  /^src\/fork\//,
  /^src\/components\/fork\//,
  // Generated / vendored build noise that we deliberately do not ship
  /^dist\//,
  /^public\/build-stats\.json$/,
  /^public\/statoscope-report\.html$/,
  /^public\/google[0-9a-f]+\.html$/,
  // Branding assets (regenerated from dev/branding/logo-source.png)
  /^public\/icon-/,
  /^public\/favicon/,
  /^public\/apple-touch-icon/,
  /^public\/mstile-/,
  /^public\/site(_apple)?(_dev)?\.webmanifest$/,
  /^public\/site\.webmanifest$/,
  /^public\/browserconfig\.xml$/,
  /^public\/404\.html$/,
];

const MAX_CONFLICT_REPORT = 40;

function log(message) {
  process.stdout.write(`${message}\n`);
}

function gitBlobSha(buffer) {
  return createHash('sha1')
    .update(`blob ${buffer.length}\0`)
    .update(buffer)
    .digest('hex');
}

function isOwned(path) {
  return OWNED_PATTERNS.some((pattern) => pattern.test(path));
}

async function github(path) {
  const headers = { Accept: 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  const response = await fetch(`https://api.github.com${path}`, { headers });
  if (!response.ok) {
    throw new Error(`GitHub API ${path} failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

async function fetchBlob(repo, sha) {
  const blob = await github(`/repos/${repo}/git/blobs/${sha}`);
  return Buffer.from(blob.content, blob.encoding === 'base64' ? 'base64' : 'utf8');
}

async function fetchTree(repo, sha) {
  const result = await github(`/repos/${repo}/git/trees/${sha}?recursive=1`);
  if (result.truncated) {
    throw new Error('Upstream tree is truncated — cannot diff safely');
  }

  return new Map(result.tree.filter((entry) => entry.type === 'blob').map((entry) => [entry.path, entry]));
}

/** 3-way merge of ours / base / theirs. Returns merged text, or undefined on conflict. */
function mergeThreeWay(ours, base, theirs) {
  const tempDir = join(ROOT, '.cache/upstream-sync');
  rmSync(tempDir, { recursive: true, force: true });
  mkdirSync(tempDir, { recursive: true });

  const oursPath = join(tempDir, 'ours');
  const basePath = join(tempDir, 'base');
  const theirsPath = join(tempDir, 'theirs');

  writeFileSync(oursPath, ours);
  writeFileSync(basePath, base);
  writeFileSync(theirsPath, theirs);

  try {
    const merged = execFileSync('git', ['merge-file', '-p', '--diff3', oursPath, basePath, theirsPath], {
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
    });

    return { merged };
  } catch (error) {
    if (error.status === 1) return { conflicted: true };

    throw error;
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function writeOutput(key, value) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) return;

  writeFileSync(outputPath, `${key}=${value}\n`, { flag: 'a' });
}

function writeSummary(lines) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  const text = `${lines.join('\n')}\n`;
  log(text);

  if (summaryPath) writeFileSync(summaryPath, text, { flag: 'a' });
}

async function main() {
  const state = JSON.parse(readFileSync(STATE_PATH, 'utf8'));
  const { upstream: repo, branch } = state;
  const lastSyncedSha = state.lastSyncedSha;

  const head = await github(`/repos/${repo}/commits/${branch}`);
  const newSha = head.sha;

  if (newSha === lastSyncedSha) {
    writeSummary([
      '### Upstream sync',
      '',
      `Already up to date with \`${repo}@${branch}\` (\`${newSha.slice(0, 10)}\`).`,
    ]);
    writeOutput('changed', 'false');
    writeOutput('conflicts', '0');
    return;
  }

  log(`Syncing ${repo}: ${lastSyncedSha.slice(0, 10)} → ${newSha.slice(0, 10)}`);

  const [oldTree, newTree] = await Promise.all([
    fetchTree(repo, lastSyncedSha),
    fetchTree(repo, newSha),
  ]);

  const paths = [...new Set([...oldTree.keys(), ...newTree.keys()])].sort();

  const updated = [];
  const added = [];
  const removed = [];
  const skipped = [];
  const conflicts = [];

  for (const path of paths) {
    const oldEntry = oldTree.get(path);
    const newEntry = newTree.get(path);
    if (oldEntry?.sha === newEntry?.sha) continue;

    if (isOwned(path)) {
      skipped.push(path);
      continue;
    }

    const localPath = join(ROOT, path);
    const localExists = existsSync(localPath);
    const localContent = localExists ? readFileSync(localPath) : undefined;

    // Added upstream
    if (!oldEntry) {
      if (!localExists) {
        if (!DRY_RUN) {
          mkdirSync(dirname(localPath), { recursive: true });
          writeFileSync(localPath, await fetchBlob(repo, newEntry.sha));
        }
        added.push(path);
        continue;
      }
      if (gitBlobSha(localContent) === newEntry.sha) continue;

      conflicts.push(`${path} (added upstream, already exists locally with different content)`);
      continue;
    }

    // Removed upstream
    if (!newEntry) {
      if (!localExists) continue;
      if (gitBlobSha(localContent) === oldEntry.sha) {
        if (!DRY_RUN) rmSync(localPath, { force: true });
        removed.push(path);
        continue;
      }

      conflicts.push(`${path} (deleted upstream, modified locally)`);
      continue;
    }

    // Modified upstream
    const localSha = localExists ? gitBlobSha(localContent) : undefined;
    if (localSha === newEntry.sha) continue;

    if (localSha === oldEntry.sha) {
      if (!DRY_RUN) writeFileSync(localPath, await fetchBlob(repo, newEntry.sha));
      updated.push(path);
      continue;
    }

    if (!localExists) {
      conflicts.push(`${path} (changed upstream, deleted locally)`);
      continue;
    }

    // Both sides changed the file → 3-way merge
    const [base, theirs] = await Promise.all([
      fetchBlob(repo, oldEntry.sha),
      fetchBlob(repo, newEntry.sha),
    ]);

    const result = mergeThreeWay(localContent, base, theirs);
    if (result.conflicted) {
      conflicts.push(`${path} (3-way merge conflict)`);
      continue;
    }

    if (gitBlobSha(result.merged) !== localSha) {
      if (!DRY_RUN) writeFileSync(localPath, result.merged);
      updated.push(`${path} (auto-merged)`);
    }
  }

  const changed = updated.length + added.length + removed.length;

  if (!DRY_RUN && conflicts.length === 0 && changed > 0) {
    state.lastSyncedSha = newSha;
    writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`);
  }

  const summary = [
    '### Upstream sync',
    '',
    `\`${repo}@${branch}\`: \`${lastSyncedSha.slice(0, 10)}\` → \`${newSha.slice(0, 10)}\``,
    '',
    `- updated: **${updated.length}**`,
    `- added: **${added.length}**`,
    `- removed: **${removed.length}**`,
    `- skipped (fork-owned): **${skipped.length}**`,
    `- conflicts: **${conflicts.length}**`,
  ];

  if (conflicts.length) {
    summary.push('', '#### Conflicts', ...conflicts.slice(0, MAX_CONFLICT_REPORT).map((line) => `- \`${line}\``));
    if (conflicts.length > MAX_CONFLICT_REPORT) summary.push(`- …and ${conflicts.length - MAX_CONFLICT_REPORT} more`);
  }

  if (updated.length) summary.push('', '#### Updated', ...updated.slice(0, MAX_CONFLICT_REPORT).map((line) => `- \`${line}\``));
  if (added.length) summary.push('', '#### Added', ...added.slice(0, MAX_CONFLICT_REPORT).map((line) => `- \`${line}\``));
  if (removed.length) summary.push('', '#### Removed', ...removed.slice(0, MAX_CONFLICT_REPORT).map((line) => `- \`${line}\``));

  if (DRY_RUN) summary.push('', '_Dry run — nothing was written._');

  writeSummary(summary);
  writeOutput('changed', changed > 0 && conflicts.length === 0 ? 'true' : 'false');
  writeOutput('conflicts', String(conflicts.length));
  writeOutput('upstream_sha', newSha);
  writeOutput('from_sha', lastSyncedSha);

  if (conflicts.length) process.exitCode = 2;
}

main().catch((error) => {
  console.error(error);
  writeSummary(['### Upstream sync failed', '', '```', String(error?.message || error), '```']);
  process.exitCode = 1;
});
