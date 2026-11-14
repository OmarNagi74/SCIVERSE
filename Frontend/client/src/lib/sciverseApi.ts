const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
export interface AgentReply {
  answer: string;
  mode?: string;
  picks?: Array<{ name: string; earth_id: string; score_pct?: number; lat?: number; lon?: number }>;
  trace?: unknown[];
}
export async function apiRequest<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${base}/api/v1${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body), signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(420000)]) : AbortSignal.timeout(420000),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const fieldError = Array.isArray(data?.errors) ? data.errors.find((item: { message?: unknown }) => typeof item.message === "string")?.message : undefined;
    const validation = fieldError || (Array.isArray(data?.detail) ? data.detail.find((item: { msg?: unknown }) => typeof item.msg === "string")?.msg : undefined);
    throw new Error(validation ? String(validation).replace(/^Value error, /, "") : typeof data?.detail === "string" ? data.detail : response.status === 429 ? "The research service is busy. Wait a moment and retry." : `Backend request failed (${response.status}). Please retry.`);
  }
  if (data === null) throw new Error("The backend returned an invalid response.");
  return data as T;
}
