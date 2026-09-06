import { describe, expect, it } from 'vitest';

import { isSafeToDeleteAgentBranch } from '../../scripts/cleanup-agent-branches.mjs';

describe('isSafeToDeleteAgentBranch', () => {
  it('deletes an agent/* branch with a PR merged into agent/develop', () => {
    const pr = { state: 'MERGED', baseRefName: 'agent/develop', number: 234 };
    expect(isSafeToDeleteAgentBranch('agent/T-65', pr)).toBe(true);
  });

  it('never deletes agent/develop itself', () => {
    const pr = { state: 'MERGED', baseRefName: 'agent/develop', number: 234 };
    expect(isSafeToDeleteAgentBranch('agent/develop', pr)).toBe(false);
  });

  it('leaves non-agent branches alone, no matter their PR state', () => {
    const pr = { state: 'MERGED', baseRefName: 'main', number: 10 };
    expect(isSafeToDeleteAgentBranch('game', pr)).toBe(false);
    expect(isSafeToDeleteAgentBranch('refactor', pr)).toBe(false);
  });

  it('leaves an agent/* branch alone when its PR is still open', () => {
    const pr = { state: 'OPEN', baseRefName: 'agent/develop', number: 240 };
    expect(isSafeToDeleteAgentBranch('agent/T-60', pr)).toBe(false);
  });

  it('leaves an agent/* branch alone when its PR was closed without merging', () => {
    const pr = { state: 'CLOSED', baseRefName: 'agent/develop', number: 241 };
    expect(isSafeToDeleteAgentBranch('agent/T-abandoned', pr)).toBe(false);
  });

  it('leaves an agent/* branch alone when it merged somewhere other than agent/develop', () => {
    // Shouldn't happen given the rule in CLAUDE.md that agent PRs only ever
    // target agent/develop, but the base is checked explicitly rather than
    // assumed.
    const pr = { state: 'MERGED', baseRefName: 'develop', number: 242 };
    expect(isSafeToDeleteAgentBranch('agent/T-weird', pr)).toBe(false);
  });

  it('leaves an agent/* branch alone when it has no PR at all', () => {
    expect(isSafeToDeleteAgentBranch('agent/T-no-pr', null)).toBe(false);
    expect(isSafeToDeleteAgentBranch('agent/T-no-pr', undefined)).toBe(false);
  });
});
