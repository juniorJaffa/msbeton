const API_BASE = "/api/admin";
const CLIENT_API = "/api/client";

async function apiFetch<T>(base: string, path: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${base}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

export const adminApi = {
  getCategories: () => apiFetch<{ data: unknown }>(API_BASE, "/categories"),
  saveCategories: (data: unknown) => apiFetch(API_BASE, "/categories", { method: "PUT", body: JSON.stringify(data) }),

  getDelivery: () => apiFetch<{ data: unknown }>(API_BASE, "/delivery"),
  saveDelivery: (data: unknown) => apiFetch(API_BASE, "/delivery", { method: "PUT", body: JSON.stringify(data) }),

  getServices: () => apiFetch<{ data: unknown }>(API_BASE, "/services"),
  saveServices: (data: unknown) => apiFetch(API_BASE, "/services", { method: "PUT", body: JSON.stringify(data) }),

  getClients: () => apiFetch<{ data: unknown }>(API_BASE, "/clients"),
  saveClients: (data: unknown) => apiFetch(API_BASE, "/clients", { method: "PUT", body: JSON.stringify(data) }),

  getTransportZones: () => apiFetch<{ data: unknown }>(API_BASE, "/transport-zones"),
  saveTransportZones: (data: unknown) => apiFetch(API_BASE, "/transport-zones", { method: "PUT", body: JSON.stringify(data) }),

  getTransportSettings: () => apiFetch<{ data: unknown }>(API_BASE, "/transport-settings"),
  saveTransportSettings: (data: unknown) => apiFetch(API_BASE, "/transport-settings", { method: "PUT", body: JSON.stringify(data) }),

  getClientAccounts: () => apiFetch<{ data: unknown }>(API_BASE, "/client-accounts"),
  saveClientAccounts: (data: unknown) => apiFetch(API_BASE, "/client-accounts", { method: "PUT", body: JSON.stringify(data) }),
};

export interface LoggedClient {
  id: string;
  clientId: string;
  name: string;
  discountPct: number;
  discountGroup: string;
}

export const clientApi = {
  login: (clientId: string, password: string) =>
    apiFetch<{ ok: boolean; client?: LoggedClient; error?: string }>(CLIENT_API, "/login", {
      method: "POST",
      body: JSON.stringify({ clientId, password }),
    }),
};
