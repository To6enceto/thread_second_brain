import { randomUUID } from "node:crypto";
import { OllamaClient } from "../intelligence/ollama.ts";
import { briefingPrompt, validateBriefing } from "../intelligence/briefing.ts";
import { composeBriefing } from "../intelligence/recorded.ts";
import { defaultSettings, localEndpoint } from "../settings/settings.ts";
import type { DesktopProjects } from "./projects.ts";
import type { EvidenceIndex } from "./evidence-index.ts";
import type { AIConfig, AIInterpretation, PreparedResume } from "./contracts.ts";
import { DesktopError } from "./security.ts";

const RESPONSE_LIMIT = 2 * 1024 * 1024;
function endpoint(value: unknown): string {
  if (typeof value !== "string" || value.length > 200) throw new DesktopError("Enter a local Ollama loopback URL.");
  try { return localEndpoint(value); } catch { throw new DesktopError("Use an HTTP loopback URL such as http://127.0.0.1:11434, without paths or credentials."); }
}
function config(value: unknown): AIConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new DesktopError("Review the local AI settings.");
  const data = value as Record<string, unknown>;
  if (Object.keys(data).sort().join(",") !== "endpoint,model" || typeof data.model !== "string" || data.model.length > 200 || /[\s\u0000-\u001f]/.test(data.model)) throw new DesktopError("Choose an exact downloaded text model name, or leave it empty for recorded-only Resume.");
  if (/(?:[:/-])cloud(?:$|[:/])/i.test(data.model)) throw new DesktopError("Cloud models are outside Thread's local-only mode.");
  return { endpoint: endpoint(data.endpoint), model: data.model };
}

/** One volatile prepared briefing; renderer cannot supply context or prompts. */
export class DesktopAI {
  private projects: DesktopProjects;
  private evidence: EvidenceIndex;
  private fetcher: typeof fetch;
  private timeoutMs: number;
  private configuration: AIConfig = { endpoint: defaultSettings().endpoint, model: "" };
  private controller: AbortController | null = null;
  private epoch = 0;
  private configurationVersion = 0;
  get version(): number { return this.configurationVersion; }
  private prepared: PreparedResume | null = null;
  constructor(projects: DesktopProjects, evidence: EvidenceIndex, fetcher: typeof fetch = fetch, timeoutMs = defaultSettings().timeoutMs) {
    this.projects = projects; this.evidence = evidence; this.fetcher = fetcher; this.timeoutMs = timeoutMs;
  }
  cancel(): void { this.epoch++; this.controller?.abort(); this.controller = null; }
  forget(): void { this.cancel(); this.prepared = null; }
  reset(): void { this.forget(); this.configurationVersion++; this.configuration = { endpoint: defaultSettings().endpoint, model: "" }; }
  configure(input: unknown): AIConfig { const next = config(input); this.cancel(); this.configurationVersion++; this.configuration = next; return { ...next }; }
  /** Main-process workflows share the bounded, cancelable local transport. Never exposed over IPC. */
  async run<T>(work: (settings: AIConfig, signal: AbortSignal, current: () => void, client: (verify: () => Promise<void>) => OllamaClient) => Promise<T>): Promise<T> {
    const settings = { ...this.configuration };
    return this.operation((signal, current) => work(settings, signal, current, verify => this.client(settings.endpoint, signal, current, verify)));
  }
  private async operation<T>(work: (signal: AbortSignal, current: () => void) => Promise<T>): Promise<T> {
    this.cancel(); const epoch = this.epoch, controller = new AbortController(); this.controller = controller;
    const timeout = AbortSignal.timeout(this.timeoutMs), signal = AbortSignal.any([controller.signal, timeout]);
    const current = (): void => { signal.throwIfAborted(); if (epoch !== this.epoch) throw new DOMException("Canceled", "AbortError"); };
    try { const result = await work(signal, current); current(); return result; }
    catch (error) {
      if (timeout.aborted) throw new DesktopError("Local AI took too long. Try a smaller downloaded model and retry.");
      if (signal.aborted || epoch !== this.epoch) throw new DesktopError("Local AI canceled.");
      if (error instanceof SyntaxError) throw new DesktopError("Ollama returned malformed JSON. Check its local version or choose another model.");
      throw error instanceof DesktopError ? error : new DesktopError(error instanceof Error ? error.message : "Local AI could not finish. Check the local connection and model.");
    } finally { if (this.controller === controller) this.controller = null; }
  }
  private client(url: string, signal: AbortSignal, current: () => void, beforeContext?: () => Promise<void>): OllamaClient {
    return new OllamaClient(url, this.timeoutMs, async (input, options) => {
      current();
      if (/\/api\/(chat|embed)$/.test(String(input))) { await beforeContext?.(); current(); }
      const response = await this.fetcher(input, { ...options, signal: AbortSignal.any([signal, ...(options?.signal ? [options.signal] : [])]) });
      current();
      if (!response.ok) { await response.body?.cancel(); return new Response(null, { status: response.status }); }
      const reader = response.body?.getReader(); if (!reader) throw new DesktopError("Ollama returned an empty response.");
      const parts: Uint8Array[] = []; let bytes = 0;
      try {
        while (true) {
          current(); const chunk = await reader.read(); current(); if (chunk.done) break;
          bytes += chunk.value.byteLength;
          if (bytes > RESPONSE_LIMIT) throw new DesktopError("Ollama response exceeded the 2 MiB local limit. Choose another model or narrow the context.");
          parts.push(chunk.value);
        }
      } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
      const body = new Uint8Array(bytes); let at = 0; for (const part of parts) { body.set(part, at); at += part.byteLength; }
      return new Response(body, { status: response.status, headers: { "Content-Type": "application/json" } });
    });
  }
  async discover(input: unknown) {
    const url = endpoint(input);
    return this.operation(async (signal, current) => this.client(url, signal, current).downloadedModels(signal));
  }
  async check(): Promise<string> {
    const settings = { ...this.configuration };
    return this.operation(async (signal, current) => { await this.client(settings.endpoint, signal, current).check(settings.model, signal); return "Text model available; local completion capability confirmed and cloud features disabled."; });
  }
  async prepare(input: unknown, revision: unknown): Promise<PreparedResume> {
    this.forget();
    return this.operation(async (_signal, current) => {
      const recorded = await this.projects.resume(input, revision); current(); this.evidence.assertCurrent(recorded.index);
      const result = { ...recorded, briefingId: randomUUID() }; this.prepared = result; return result;
    });
  }
  async interpret(identity: unknown, revision: unknown): Promise<AIInterpretation> {
    const recorded = this.prepared, settings = { ...this.configuration };
    if (typeof identity !== "string" || !recorded || identity !== recorded.briefingId || revision !== recorded.revision) throw new DesktopError("Recorded briefing changed. Resume the project again.");
    if (!settings.model) throw new DesktopError("Choose a downloaded text model for optional AI interpretation.");
    return this.operation(async (signal, current) => {
      const guard = (): void => { current(); this.evidence.assertCurrent(recorded.index); if (this.prepared !== recorded) throw new DesktopError("Recorded briefing changed. Resume again."); };
      const verify = async (): Promise<void> => { guard(); await this.projects.assertCurrent(recorded); guard(); };
      await verify();
      if (!recorded.bundle.sources.length) throw new DesktopError("No eligible project passages. Recorded gaps remain available; check your notes and read access.");
      const raw = await this.client(settings.endpoint, signal, guard, verify).generate(settings.model, briefingPrompt(recorded.home!.project, recorded.bundle), signal);
      guard(); const model = validateBriefing(raw, recorded.bundle); await verify();
      const result = composeBriefing(recorded.recorded, model);
      return { briefingId: recorded.briefingId, revision: recorded.revision, generation: recorded.generation, model: settings.model, generatedAt: Date.now(),
        interpretations: result.interpretations, nextActions: result.briefing.sections.nextActions, modelGaps: result.modelGaps };
    });
  }
}
