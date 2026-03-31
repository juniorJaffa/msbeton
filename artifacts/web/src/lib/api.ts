const API_BASE = "/api/admin";

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
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
  getCategories: () => apiFetch<{ data: unknown }>("/categories"),
  saveCategories: (data: unknown) => apiFetch("/categories", { method: "PUT", body: JSON.stringify(data) }),

  getDelivery: () => apiFetch<{ data: unknown }>("/delivery"),
  saveDelivery: (data: unknown) => apiFetch("/delivery", { method: "PUT", body: JSON.stringify(data) }),

  getServices: () => apiFetch<{ data: unknown }>("/services"),
  saveServices: (data: unknown) => apiFetch("/services", { method: "PUT", body: JSON.stringify(data) }),

  getClients: () => apiFetch<{ data: unknown }>("/clients"),
  saveClients: (data: unknown) => apiFetch("/clients", { method: "PUT", body: JSON.stringify(data) }),

  getTransportZones: () => apiFetch<{ data: unknown }>("/transport-zones"),
  saveTransportZones: (data: unknown) => apiFetch("/transport-zones", { method: "PUT", body: JSON.stringify(data) }),

  getTransportSettings: () => apiFetch<{ data: unknown }>("/transport-settings"),
  saveTransportSettings: (data: unknown) => apiFetch("/transport-settings", { method: "PUT", body: JSON.stringify(data) }),
};
