/** Browser helper for JSON API calls; surfaces the server's user-safe message. */
export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export async function postJson<T>(url: string, body: unknown, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      ...init,
    });
  } catch {
    throw new ApiClientError("Connexion impossible. Vérifie ta connexion internet.", "network", 0);
  }
  const json = (await res.json().catch(() => null)) as
    | (T & { error?: { code: string; message: string } })
    | null;
  if (!res.ok) {
    throw new ApiClientError(
      json?.error?.message ?? "Une erreur est survenue. Réessaie.",
      json?.error?.code ?? "internal",
      res.status,
    );
  }
  return json as T;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Une erreur est survenue. Réessaie.";
}
