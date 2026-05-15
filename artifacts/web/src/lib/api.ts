const API_BASE = "/api/admin";
const CLIENT_API = "/api/client";

async function apiFetch<T>(base: string, path: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${base}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    // Return JSON body even for non-ok responses (e.g. 401, 400) so callers get the error message
    const data = await res.json().catch(() => null);
    if (!res.ok) return data as T | null;
    return data as T;
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

  getOrders: () => apiFetch<{ data: unknown }>(API_BASE, "/orders"),
  saveOrders: (data: unknown) => apiFetch(API_BASE, "/orders", { method: "PUT", body: JSON.stringify(data) }),
};

export interface LoggedClient {
  id: string;
  clientId: string;
  name: string;
  company: string;
  email?: string;
  phone?: string;
  discountBeton: number;
  discountDoprava: number;
  discountSluzby: number;
  discountCelkovo: number;
  canHotovost: boolean;
  canPridatBeton: boolean;
  deliveryZoneId?: string;
  canZimneOpatrenia?: boolean;
  hotovostDph?: number;
  manualPrices?: Record<string, number>;
  sharedLink?: string;
}

export const clientApi = {
  login: (clientId: string, password: string) =>
    apiFetch<{ ok: boolean; client?: LoggedClient; error?: string }>(CLIENT_API, "/login", {
      method: "POST",
      body: JSON.stringify({ clientId, password }),
    }),
  me: (id: string) =>
    apiFetch<{ ok: boolean; client?: LoggedClient }>(CLIENT_API, `/me?id=${encodeURIComponent(id)}`),
  submitOrder: (order: unknown) =>
    apiFetch<{ ok: boolean; error?: string }>(CLIENT_API, "/order", {
      method: "POST",
      body: JSON.stringify(order),
    }),
  updateProfile: (id: string, currentPassword: string, newLoginId?: string, newEmail?: string) =>
    apiFetch<{ ok: boolean; client?: LoggedClient; error?: string }>(CLIENT_API, "/profile", {
      method: "PUT",
      body: JSON.stringify({ id, currentPassword, newLoginId, newEmail }),
    }),
  requestPasswordReset: (id: string) =>
    apiFetch<{ ok: boolean; error?: string }>(CLIENT_API, "/password-reset-request", {
      method: "POST",
      body: JSON.stringify({ id }),
    }),
  confirmPasswordReset: (token: string, newPassword: string) =>
    apiFetch<{ ok: boolean; error?: string }>(CLIENT_API, "/password-reset-confirm", {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
    }),
};
