import { describe, expect, it } from 'vitest';
import { readGoogleConfig } from './google-provider.js';

const valid = {
  GOOGLE_CLIENT_ID: 'client', GOOGLE_CLIENT_SECRET: 'secret',
  GOOGLE_REDIRECT_URI: 'https://api.example.com/auth/google/callback',
  FRONTEND_URL: 'https://app.example.com', CORS_ORIGIN: 'https://app.example.com', NODE_ENV: 'production',
};
describe('Google production configuration', () => {
  it('allows disabling OAuth only when all its variables are absent', () => {
    expect(readGoogleConfig({})).toBeUndefined();
    expect(() => readGoogleConfig({ GOOGLE_CLIENT_ID: 'partial' })).toThrow();
  });
  it('supports different HTTPS domains', () => {
    expect(readGoogleConfig(valid)?.frontendOrigin).toBe('https://app.example.com');
  });
  it.each([
    { GOOGLE_REDIRECT_URI: 'http://api.example.com/auth/google/callback' },
    { GOOGLE_REDIRECT_URI: 'https://api.example.com/another/path' },
    { GOOGLE_REDIRECT_URI: 'https://api.example.com/auth/google/callback?next=evil' },
    { FRONTEND_URL: 'https://user:password@app.example.com' },
    { FRONTEND_URL: 'https://app.example.com/path' },
    { FRONTEND_URL: 'http://app.example.com' },
    { CORS_ORIGIN: 'https://other.example.com' },
  ])('rejects unsafe or inconsistent URLs %j', override => {
    expect(() => readGoogleConfig({ ...valid, ...override })).toThrow();
  });
});
