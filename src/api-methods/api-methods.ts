import { ApiError } from "@/lib/exception";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8081";

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  const res = await fetch(`${API_BASE}/${normalizedPath}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(
      (body as { message?: string })?.message ?? res.statusText,
      res.status,
      body
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
