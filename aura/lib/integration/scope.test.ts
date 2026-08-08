import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DEVICE_SCOPES,
  normalizeRequestedScopes,
} from './contracts';

describe('normalizeRequestedScopes — no silent escalation', () => {
  it('defaults to the full device scope set when none requested', () => {
    expect(normalizeRequestedScopes(undefined)).toEqual([...DEFAULT_DEVICE_SCOPES]);
    expect(normalizeRequestedScopes('')).toEqual([...DEFAULT_DEVICE_SCOPES]);
  });

  it('returns exactly the requested subset (canonical order), not all defaults', () => {
    expect(normalizeRequestedScopes('station:assets:read station:read')).toEqual([
      'station:read',
      'station:assets:read',
    ]);
    expect(normalizeRequestedScopes('station:read')).toEqual(['station:read']);
  });

  it('rejects any scope outside the allowed set', () => {
    expect(normalizeRequestedScopes('station:read station:admin')).toBeNull();
    expect(normalizeRequestedScopes('station:content:write')).toBeNull();
    expect(normalizeRequestedScopes('bogus')).toBeNull();
  });
});
