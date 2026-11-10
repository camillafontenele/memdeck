const configuredApiUrl = import.meta.env.VITE_API_URL;

if (import.meta.env.PROD && !configuredApiUrl) {
  throw new Error("VITE_API_URL deve ser definida em produção.");
}

export const API_URL = (configuredApiUrl ?? "http://localhost:3333").replace(
  /\/$/,
  "",
);

const TOKEN_STORAGE_KEY = "token";

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
    localStorage.removeItem(TOKEN_STORAGE_KEY);

    if (window.location.pathname !== "/login") {
      window.location.replace("/login");
    }
  }

  return response;
}
