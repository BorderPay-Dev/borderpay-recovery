/** Internal, sandbox-only transport. Not an authenticated customer API. */
const ORIGIN = "https://sandbox.api.caas.reap.global";
export class ReapSandboxError extends Error {
  constructor(public readonly code: string, public readonly status = 0) {
    super(code);
    this.name = "ReapSandboxError";
  }
}
export class ReapSandboxClient {
  #key: string;
  #fetch: typeof fetch;
  constructor(key: string, fetcher: typeof fetch = fetch) {
    if (!key || /\s/.test(key)) {
      throw new ReapSandboxError("sandbox_key_missing_or_invalid");
    }
    this.#key = key;
    this.#fetch = fetcher;
  }
  async #get(path: string): Promise<unknown> {
    try {
      const response = await this.#fetch(ORIGIN + path, {
        method: "GET",
        redirect: "error",
        signal: AbortSignal.timeout(8000),
        headers: {
          "x-reap-api-key": this.#key,
          "Accept-Version": "v2.0",
          Accept: "application/json",
        },
      });
      if (!response.ok) {
        // Provider bodies can contain identity data. Never attach them to exceptions.
        await response.body?.cancel();
        throw new ReapSandboxError("sandbox_request_failed", response.status);
      }
      return await response.json();
    } catch (error) {
      if (error instanceof ReapSandboxError) throw error;
      throw new ReapSandboxError("sandbox_transport_or_response_failed");
    }
  }
  listDesigns(): Promise<unknown> {
    return this.#get("/card-design/");
  }
  listCards(page = 1, limit = 10): Promise<unknown> {
    if (
      !Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) ||
      limit < 1 || limit > 100
    ) {
      throw new ReapSandboxError("invalid_pagination");
    }
    return this.#get(`/cards?page=${page}&limit=${limit}`);
  }
  getCard(cardId: string): Promise<unknown> {
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        cardId,
      )
    ) {
      throw new ReapSandboxError("invalid_card_id");
    }
    return this.#get(`/cards/${cardId}`);
  }
}
