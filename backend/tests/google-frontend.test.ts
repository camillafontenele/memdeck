import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { createHash } from 'node:crypto';

vi.mock('../../frontend/src/services/api', () => ({
  API_URL: 'https://api.example.com',
  storeSessionToken: (token: string) => localStorage.setItem('token', token),
}));
function storage() {
  const entries = new Map<string, string>();
  return { getItem: (key: string) => entries.get(key) ?? null, setItem: (key: string, value: string) => entries.set(key, value), removeItem: (key: string) => entries.delete(key) };
}
beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal('sessionStorage', storage()); vi.stubGlobal('localStorage', storage());
  vi.stubGlobal('window', { location: { assign: vi.fn() } });
});
afterEach(() => vi.unstubAllGlobals());

it('creates a browser verifier and sends only its SHA256 challenge', async () => {
  const { startGoogleLogin } = await import('../../frontend/src/services/google-auth');
  await startGoogleLogin();
  const verifier = JSON.parse(sessionStorage.getItem('memdeck.google.verifier')!).verifier;
  const url = new URL(vi.mocked(window.location.assign).mock.calls[0][0] as string);
  expect(url.searchParams.get('challenge')).toBe(createHash('sha256').update(verifier).digest('base64url'));
  expect(url.href).not.toContain(verifier);
});
it('clears the fragment before any application asset can load', () => {
  const html = readFileSync(new URL('../../frontend/index.html', import.meta.url), 'utf8');
  const script = html.match(/<script>([\s\S]*?)<\/script>/)![1];
  const events: string[] = [];
  const saved = storage();
  runInNewContext(script, {
    location: { pathname: '/auth/google/return', hash: '#code=temporary-secret' },
    history: { replaceState: (_state: unknown, _title: string, url: string) => events.push(url) },
    sessionStorage: { removeItem: saved.removeItem, setItem: (key: string, value: string) => { events.push('saved'); saved.setItem(key, value); } },
  });
  expect(events).toEqual(['/auth/google/return', 'saved']);
  expect(saved.getItem('memdeck.google.return')).toBe('code=temporary-secret');
  expect(html.indexOf('<script>')).toBeLessThan(html.indexOf('<link'));
  expect(html).toContain('name="referrer" content="no-referrer"');
});
it('exchanges only once under StrictMode and preserves the JWT storage contract', async () => {
  const code = 'a'.repeat(43); const verifier = 'b'.repeat(43);
  sessionStorage.setItem('memdeck.google.return', `code=${code}`);
  sessionStorage.setItem('memdeck.google.verifier', JSON.stringify({ verifier, createdAt: Date.now() }));
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ token: 'memdeck-jwt' }) });
  vi.stubGlobal('fetch', fetcher);
  const { completeGoogleLogin } = await import('../../frontend/src/services/google-auth');
  await Promise.all([completeGoogleLogin(), completeGoogleLogin()]);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher).toHaveBeenCalledWith('https://api.example.com/auth/google/exchange', expect.objectContaining({ method: 'POST', credentials: 'omit', referrerPolicy: 'no-referrer', body: JSON.stringify({ code, verifier }) }));
  expect(localStorage.getItem('token')).toBe('memdeck-jwt');
  expect(sessionStorage.getItem('memdeck.google.verifier')).toBeNull();
  expect(sessionStorage.getItem('memdeck.google.return')).toBeNull();
});
it('shows cancellation without fetching or replacing a previous session', async () => {
  sessionStorage.setItem('memdeck.google.return', 'error=cancelled');
  localStorage.setItem('token', 'previous-session');
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  const { completeGoogleLogin } = await import('../../frontend/src/services/google-auth');
  await expect(completeGoogleLogin()).rejects.toThrow('cancelou');
  expect(fetcher).not.toHaveBeenCalled(); expect(localStorage.getItem('token')).toBe('previous-session');
});
it('rejects an expired frontend verifier without contacting the backend', async () => {
  sessionStorage.setItem('memdeck.google.return', `code=${'a'.repeat(43)}`);
  sessionStorage.setItem('memdeck.google.verifier', JSON.stringify({ verifier: 'b'.repeat(43), createdAt: Date.now() - 400_000 }));
  const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
  const { completeGoogleLogin } = await import('../../frontend/src/services/google-auth');
  await expect(completeGoogleLogin()).rejects.toThrow('expirou'); expect(fetcher).not.toHaveBeenCalled();
});
