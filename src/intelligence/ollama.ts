import { localEndpoint, object } from "../settings/settings.ts";
import { BRIEFING_SCHEMA } from "./briefing.ts";

const hostFetch: typeof fetch = (input, options) => fetch(input, options);
export interface EmbeddingIdentity { model: string; digest: string; }
function modelName(model: string): string { return model.slice(model.lastIndexOf("/") + 1).includes(":") ? model : `${model}:latest`; }
export function validateVectors(value: unknown, count: number): number[][] {
  if (!Array.isArray(value) || value.length !== count || !value.length) throw new Error("Ollama returned an invalid embedding count.");
  let dimensions = 0;
  return value.map(vector => {
    if (!Array.isArray(vector) || !vector.length || vector.length > 8192 || dimensions && dimensions !== vector.length
      || !vector.every(v => typeof v === "number" && Number.isFinite(v))
      || !Number.isFinite(Math.hypot(...vector)) || Math.hypot(...vector) === 0) throw new Error("Ollama returned invalid embedding vectors.");
    dimensions = vector.length;
    return vector as number[];
  });
}

export class OllamaClient {
  readonly endpoint: string;
  readonly timeoutMs: number;
  readonly fetcher: typeof fetch;

  constructor(endpoint: string, timeoutMs: number, fetcher: typeof fetch = hostFetch) {
    this.endpoint = localEndpoint(endpoint);
    this.timeoutMs = timeoutMs;
    this.fetcher = fetcher;
  }

  private async request(path: string, body: unknown, signal: AbortSignal): Promise<Record<string, unknown>> {
    const timeout = AbortSignal.timeout(this.timeoutMs);
    try {
      const response = await this.fetcher(`${this.endpoint}${path}`, {
        method: body === undefined ? "GET" : "POST", redirect: "error", credentials: "omit",
        headers: { "Content-Type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.any([signal, timeout])
      });
      if (!response.ok) throw new Error(response.status === 404
        ? "Ollama could not find the selected model or required API. Check the model name and update Ollama if needed."
        : "Ollama could not complete the request. Check its local status and available memory.");
      return object(await response.json());
    } catch (error) {
      if (signal.aborted) throw new DOMException("Generation canceled.", "AbortError");
      if (timeout.aborted) throw new Error("Ollama took too long. Try a smaller model or increase the request timeout.");
      if (error instanceof TypeError) throw new Error("Cannot reach local Ollama. Start it with OLLAMA_NO_CLOUD=1 and check the endpoint.");
      throw error;
    }
  }

  private async checkCapability(model: string, signal: AbortSignal, capability: string): Promise<void> {
    signal.throwIfAborted();
    if (!model.trim() || model.length > 200 || /[\s\u0000-\u001f]/.test(model)) {
      throw new Error("Select the exact name of a downloaded local model in Thread settings.");
    }
    if (/(?:[:/-])cloud(?:$|[:/])/i.test(model)) throw new Error("Cloud models are outside Thread's local-only mode.");
    const status = await this.request("/api/status", undefined, signal);
    if (object(status.cloud).disabled !== true) {
      throw new Error("Ollama cloud features must be disabled. Restart Ollama with OLLAMA_NO_CLOUD=1 before using Thread.");
    }
    const details = await this.request("/api/show", { model }, signal);
    if (details.remote_host || details.remote_model) throw new Error("Select a fully downloaded local model, not a remote model.");
    if (!Array.isArray(details.capabilities) || !details.capabilities.includes(capability)) {
      throw new Error(`The selected model must support local ${capability === "completion" ? "text completion" : "embeddings"}.`);
    }
    if (Object.keys(object(details.model_info)).length === 0) throw new Error("Ollama did not confirm a local model. Choose a downloaded model.");
  }

  async check(model: string, signal: AbortSignal): Promise<void> { await this.checkCapability(model, signal, "completion"); }

  async embeddingIdentity(model: string, signal: AbortSignal): Promise<EmbeddingIdentity> {
    await this.checkCapability(model, signal, "embedding");
    const tags = await this.request("/api/tags", undefined, signal);
    const selected = Array.isArray(tags.models) ? tags.models.map(object).find(item =>
      [item.name, item.model].some(name => typeof name === "string" && modelName(name) === modelName(model))) : undefined;
    if (!selected || typeof selected.digest !== "string" || !/^[a-f0-9]{64}$/.test(selected.digest)
      || selected.remote_host || selected.remote_model) throw new Error("Select an installed embedding model with a local digest.");
    return { model, digest: selected.digest };
  }

  async embed(identity: EmbeddingIdentity, input: string[], signal: AbortSignal, current: () => boolean = () => true): Promise<number[][]> {
    if (!input.length || input.length > 8 || input.some(text => !text.trim() || text.length > 2000)) throw new Error("Embedding batches need 1 to 8 nonempty passages of at most 2000 characters.");
    const assertCurrent = () => { signal.throwIfAborted(); if (!current()) throw new DOMException("Search sources changed. Search again.", "AbortError"); };
    const checkIdentity = async () => {
      if ((await this.embeddingIdentity(identity.model, signal)).digest !== identity.digest) throw new Error("The embedding model changed. Search again.");
      assertCurrent();
    };
    await checkIdentity();
    // Recheck after asynchronous metadata requests, immediately before sending note text.
    assertCurrent();
    const data = await this.request("/api/embed", { model: identity.model, input, truncate: false }, signal);
    assertCurrent();
    if (data.remote_host || data.remote_model || typeof data.model !== "string" || modelName(data.model) !== modelName(identity.model)) throw new Error("An unexpected embedding model response was rejected.");
    const vectors = validateVectors(data.embeddings, input.length);
    await checkIdentity();
    return vectors;
  }

  async generate(model: string, prompt: string, signal: AbortSignal, schema: unknown = BRIEFING_SCHEMA): Promise<string> {
    await this.check(model, signal);
    const data = await this.request("/api/chat", {
      model, stream: false, think: false, truncate: false, format: schema,
      options: { temperature: 0, num_ctx: 8192, num_predict: 1400 },
      messages: [
        { role: "system", content: "You are a careful project research assistant. Use only the supplied evidence, cite source IDs, distinguish suggestions from facts, and return the requested JSON schema." },
        { role: "user", content: prompt }
      ]
    }, signal);
    if (data.remote_host || data.remote_model) throw new Error("A remote response was rejected. Confirm Ollama local-only configuration.");
    const content = object(data.message).content;
    if (typeof content !== "string" || !content.trim()) throw new Error("The local model returned no usable text. Try another model.");
    return content;
  }
}
