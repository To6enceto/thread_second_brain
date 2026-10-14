import { localEndpoint, object } from "../settings/settings.ts";
import { BRIEFING_SCHEMA } from "./briefing.ts";

const hostFetch: typeof fetch = (input, options) => fetch(input, options);

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

  async check(model: string, signal: AbortSignal): Promise<void> {
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
    if (!Array.isArray(details.capabilities) || !details.capabilities.includes("completion")) {
      throw new Error("The selected model must support local text completion.");
    }
    if (Object.keys(object(details.model_info)).length === 0) throw new Error("Ollama did not confirm a local model. Choose a downloaded model.");
  }

  async generate(model: string, prompt: string, signal: AbortSignal): Promise<string> {
    await this.check(model, signal);
    const data = await this.request("/api/chat", {
      model, stream: false, think: false, truncate: false, format: BRIEFING_SCHEMA,
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
