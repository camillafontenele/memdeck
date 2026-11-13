import { API_URL, storeSessionToken } from './api';

const VERIFIER_KEY = 'memdeck.google.verifier';
const RETURN_KEY = 'memdeck.google.return';
const secretPattern = /^[A-Za-z0-9_-]{43}$/;
const base64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');

export async function startGoogleLogin() {
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
  sessionStorage.removeItem(RETURN_KEY);
  sessionStorage.setItem(VERIFIER_KEY, JSON.stringify({ verifier, createdAt: Date.now() }));
  const url = new URL(`${API_URL}/auth/google`);
  url.searchParams.set('challenge', challenge);
  window.location.assign(url.href);
}

const messages: Record<string, string> = {
  cancelled: 'Você cancelou o login com Google. Pode tentar novamente ou entrar com e-mail e senha.',
  account_conflict: 'Este e-mail já possui uma conta. Entre pelo método usado originalmente. As contas não foram vinculadas.',
  invalid_flow: 'Esta tentativa expirou ou é inválida. Inicie o login com Google novamente.',
  failed: 'Não foi possível entrar com Google. Tente novamente.',
};

// Share the in-flight request across React StrictMode effect replays.
let pending: Promise<void> | undefined;
export function completeGoogleLogin(): Promise<void> {
  return pending ??= finishGoogleLogin();
}
async function finishGoogleLogin() {
  const result = sessionStorage.getItem(RETURN_KEY);
  const stored = sessionStorage.getItem(VERIFIER_KEY);
  sessionStorage.removeItem(RETURN_KEY);
  sessionStorage.removeItem(VERIFIER_KEY);
  const params = new URLSearchParams(result ?? '');
  const error = params.get('error');
  if (error) throw new Error(messages[error] ?? messages.failed);
  let flow: { verifier?: string; createdAt?: number };
  try { flow = JSON.parse(stored ?? '{}'); } catch { throw new Error(messages.invalid_flow); }
  const code = params.get('code');
  if (!code || !secretPattern.test(code) || !flow?.verifier || !secretPattern.test(flow.verifier) ||
      typeof flow.createdAt !== 'number' || Date.now() - flow.createdAt > 6 * 60_000) throw new Error(messages.invalid_flow);
  let response: Response;
  try {
    response = await fetch(`${API_URL}/auth/google/exchange`, {
      method: 'POST', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, verifier: flow.verifier }),
    });
  } catch { throw new Error('Não foi possível conectar. Inicie o login novamente.'); }
  if (!response.ok) throw new Error(response.status === 429 ? 'Muitas tentativas. Aguarde e tente novamente.' : messages.invalid_flow);
  const data = await response.json();
  if (typeof data.token !== 'string' || !data.token) throw new Error(messages.failed);
  storeSessionToken(data.token);
}
