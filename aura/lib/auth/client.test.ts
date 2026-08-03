import { beforeEach, describe, expect, it, vi } from 'vitest';

const createAuthClient = vi.fn(() => ({
  signIn: {},
  signUp: {},
  signOut: vi.fn(),
  useSession: vi.fn(),
}));

vi.mock('better-auth/react', () => ({
  createAuthClient,
}));

describe('AURA auth client', () => {
  beforeEach(() => {
    vi.resetModules();
    createAuthClient.mockClear();
  });

  it('uses the current origin instead of a build-time host', async () => {
    await import('./client');

    expect(createAuthClient).toHaveBeenCalledOnce();
    expect(createAuthClient).toHaveBeenCalledWith();
  });
});
