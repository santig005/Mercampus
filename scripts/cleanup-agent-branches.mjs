#!/usr/bin/env node
// T-62. Deletes agent/<task-id> branches once their PR into agent/develop
// has merged.
//
// Scoped deliberately narrow: only branches under agent/*, and only when a
// merged PR targeting agent/develop exists for them. Never touches main,
// develop, agent/develop itself, or any of the many non-agent branches in
// this repo (feature branches, old contributor work) — those need a human
// to judge, not a script. Closing inactive PRs and the monthly roadmap
// review (the other two parts of T-62) are deliberately left
// for T-62b/T-62c: closing someone else's PR is a different kind of call
// than deleting a branch this pipeline created and already merged.
//
// Dry-run by default, same guard as seed.mjs / migrate-product-section.mjs:
//   node scripts/cleanup-agent-branches.mjs          # shows only
//   node scripts/cleanup-agent-branches.mjs --yes    # actually deletes

import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const PROTECTED = new Set(['agent/develop']);

/**
 * Decides whether an agent/* branch is safe to delete.
 *
 * `pr` is the result of `gh pr list --head <branch>` (or null/undefined if
 * there is none): { state, baseRefName, number }.
 */
export function isSafeToDeleteAgentBranch(branchName, pr) {
  if (!branchName.startsWith('agent/')) return false;
  if (PROTECTED.has(branchName)) return false;
  if (!pr) return false;
  if (pr.state !== 'MERGED') return false;
  if (pr.baseRefName !== 'agent/develop') return false;
  return true;
}

function gh(args) {
  return execFileSync('gh', args, { encoding: 'utf8' });
}

function listAgentBranches() {
  const raw = gh(['api', 'repos/{owner}/{repo}/branches', '--paginate', '--jq', '.[].name']);
  return raw
    .split('\n')
    .map(name => name.trim())
    .filter(name => name.startsWith('agent/') && !PROTECTED.has(name));
}

function findMergedPr(branch) {
  const raw = gh([
    'pr', 'list',
    '--head', branch,
    '--state', 'all',
    '--json', 'state,baseRefName,number',
    '--limit', '1',
  ]);
  const [pr] = JSON.parse(raw);
  return pr ?? null;
}

function deleteBranch(branch) {
  gh(['api', '-X', 'DELETE', `repos/{owner}/{repo}/git/refs/heads/${branch}`]);
}

async function main() {
  const dryRun = !process.argv.includes('--yes');

  const branches = listAgentBranches();
  if (branches.length === 0) {
    console.log('cleanup-agent-branches: no hay ramas agent/* aparte de agent/develop.');
    return;
  }

  const candidates = branches
    .map(branch => ({ branch, pr: findMergedPr(branch) }))
    .filter(({ branch, pr }) => isSafeToDeleteAgentBranch(branch, pr));

  if (candidates.length === 0) {
    console.log('cleanup-agent-branches: nada que borrar.');
    return;
  }

  for (const { branch, pr } of candidates) {
    const prefix = dryRun ? '[dry-run] ' : '';
    console.log(`${prefix}borrando ${branch} (PR #${pr.number} mergeado a ${pr.baseRefName})`);
    if (!dryRun) {
      deleteBranch(branch);
    }
  }

  if (dryRun) {
    console.log('\ncleanup-agent-branches: repite con --yes para borrar de verdad.');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
