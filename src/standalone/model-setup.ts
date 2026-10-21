import type { AIConfig, DesktopBridge, DesktopResult } from "./contracts.ts";

/** Session-only setup UI. Edits pause automatic interpretation until applied. */
export class ModelSetup {
  private bridge: DesktopBridge;
  private changed: () => void;
  private epoch = 0;
  private dirty = true;
  private saved: AIConfig = { endpoint: "http://127.0.0.1:11434", model: "" };
  private endpoint = document.getElementById("ai-endpoint") as HTMLInputElement;
  private choices = document.getElementById("ai-model") as HTMLSelectElement;
  private embeddings = document.getElementById("ai-embedding") as HTMLSelectElement;
  private discover = document.getElementById("ai-discover") as HTMLButtonElement;
  private apply = document.getElementById("ai-apply") as HTMLButtonElement;
  private check = document.getElementById("ai-check") as HTMLButtonElement;
  private cancelButton = document.getElementById("ai-cancel-checks") as HTMLButtonElement;
  private feedback = document.getElementById("ai-setup-status")!;
  constructor(bridge: DesktopBridge, changed: () => void) {
    this.bridge = bridge; this.changed = changed;
    this.endpoint.addEventListener("input", () => { this.edit(); this.choices.replaceChildren(new Option("Discover models first", "")); this.choices.disabled = true; this.embeddings.replaceChildren(new Option("Discover models first", "")); this.embeddings.disabled = true; });
    this.embeddings.addEventListener("change", () => this.edit());
    this.choices.addEventListener("change", () => this.edit());
    this.cancelButton.addEventListener("click", () => { this.epoch++; this.changed(); void this.bridge.cancelAI(); this.busy(false); this.feedback.textContent = "Local checks canceled."; });
    this.discover.addEventListener("click", () => { void this.run(async current => {
      this.dirty = true;
      const result = this.value(await this.bridge.discoverModels(this.endpoint.value)); if (!current()) return;
      const textModels = result.models.filter(model => model.completion);
      this.choices.replaceChildren(new Option("Recorded only (no model)", ""), ...textModels.map(model => new Option(model.name, model.name)));
      this.choices.disabled = false;
      this.embeddings.replaceChildren(new Option("Keyword only (no embedding model)", ""), ...result.models.filter(model => model.embedding).map(model => new Option(model.name, model.name)));
      this.embeddings.disabled = false;
      this.feedback.textContent = `${textModels.length} downloaded text models from ${result.total} listed; ${result.omitted} remote, incompatible, uninspectable or over-limit entries omitted. Choose one explicitly, then Apply AI settings. Capability is not answer quality.`;
    }, "Checking cloud-disabled local model metadata..."); });
    this.apply.addEventListener("click", () => { void this.run(async current => {
      const settings = this.value(await this.bridge.configureAI({ endpoint: this.endpoint.value, model: this.choices.value })); if (!current()) return;
      this.saved = settings; this.dirty = false;
      this.feedback.textContent = settings.model ? `Applied ${settings.model} for this session. Test the local connection, then Resume project.` : "Recorded-only Resume selected. No model will be used.";
    }, "Applying local AI settings..."); });
    this.check.addEventListener("click", () => { void this.run(async current => {
      const result = this.value(await this.bridge.checkAI()); if (current()) this.feedback.textContent = result;
    }, "Testing local completion capability and cloud-disabled status..."); });
  }
  embeddingModel(): string { return this.dirty ? "" : this.embeddings.value; }
  model(): string { return this.dirty ? "" : this.saved.model; }
  reset(): void {
    this.epoch++; this.saved = { endpoint: "http://127.0.0.1:11434", model: "" }; this.dirty = true;
    this.endpoint.value = this.saved.endpoint; this.choices.replaceChildren(new Option("Discover models first", "")); this.choices.disabled = true;
    this.embeddings.replaceChildren(new Option("Discover models first", "")); this.embeddings.disabled = true;
    this.busy(false); this.feedback.textContent = "Optional. Recorded context works without an AI model.";
  }
  private value<T>(result: DesktopResult<T>): T { if (!result.ok) throw new Error(result.message); return result.value; }
  private busy(active: boolean): void { this.discover.disabled = active; this.apply.disabled = active; this.check.disabled = active || this.dirty || !this.saved.model; this.cancelButton.disabled = !active; }
  private edit(): void {
    this.epoch++; this.dirty = true; this.changed(); void this.bridge.cancelAI(); this.busy(false);
    this.feedback.textContent = "Draft changed. Apply AI settings before using the model. Recorded-only Resume remains available.";
  }
  private async run(work: (current: () => boolean) => Promise<void>, message: string): Promise<void> {
    const epoch = ++this.epoch; this.changed(); this.busy(true); this.feedback.textContent = message;
    try { await work(() => epoch === this.epoch); }
    catch (error) { if (epoch === this.epoch) this.feedback.textContent = error instanceof Error ? error.message : "Local setup failed. Check Ollama and retry."; }
    finally { if (epoch === this.epoch) this.busy(false); }
  }
}
