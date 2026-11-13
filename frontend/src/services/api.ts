const configuredApiUrl = import.meta.env.VITE_API_URL;

if (import.meta.env.PROD && !configuredApiUrl) {
  throw new Error("VITE_API_URL deve ser definida em produção.");
}

export const API_URL = (configuredApiUrl ?? "http://localhost:3333").replace(
  /\/$/,
  "",
);

const TOKEN_STORAGE_KEY = "token";

export type AuthenticatedUser = {
  name: string;
  email: string;
};

let cachedUser: AuthenticatedUser | null = null;
let userRequest: Promise<AuthenticatedUser> | null = null;

function resetUserCache() {
  cachedUser = null;
  userRequest = null;
}

export function clearSession() {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  resetUserCache();
}

export function storeSessionToken(token: string) {
  resetUserCache();
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export async function authenticatedFetch(
  path: string,
  options: RequestInit = {},
) {
  const headers = new Headers(options.headers);
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearSession();

    if (window.location.pathname !== "/login") {
      window.location.replace("/login");
    }
  }

  return response;
}

export async function getAuthenticatedUser(): Promise<AuthenticatedUser> {
  if (cachedUser) return Promise.resolve(cachedUser);

  userRequest ??= (async () => {
    const response = await authenticatedFetch("/auth/me");

    if (!response.ok) throw new Error("authenticated-user");

    const data: unknown = await response.json();

    if (
      !data ||
      typeof data !== "object" ||
      !("name" in data) ||
      !("email" in data) ||
      typeof data.name !== "string" ||
      typeof data.email !== "string"
    ) {
      throw new Error("invalid-authenticated-user-payload");
    }

    cachedUser = data as AuthenticatedUser;
    return cachedUser;
  })();

  try {
    return await userRequest;
  } finally {
    userRequest = null;
  }
}
