import type { AIConfig, DesktopBridge, DesktopResult } from "./contracts.ts";

/** Session-only setup UI. Edits pause automatic interpretation until applied. */
export class ModelSetup {
  private bridge: DesktopBridge;
  private changed: () => void;
  private epoch = 0;
  private dirty = true;
  // Counts configurations sent to main; a restored model not yet confirmed by the connection test is reverted only while it is still the latest.
  private configurations = 0;
  private unconfirmed: { endpoint: string; serial: number } | null = null;
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
    this.cancelButton.addEventListener("click", () => { this.epoch++; this.revert(); this.changed(); void this.bridge.cancelAI(); this.busy(false); this.feedback.textContent = "Local checks canceled."; });
    this.discover.addEventListener("click", () => { void this.run(async current => {
      this.dirty = true;
      const result = this.value(await this.bridge.discoverModels(this.endpoint.value)); if (!current()) return;
      const textModels = this.populate(result.models);
      this.feedback.textContent = `${textModels.length} downloaded text models from ${result.total} listed; ${result.omitted} remote, incompatible, uninspectable or over-limit entries omitted. Choose one explicitly, then Apply AI settings. Capability is not answer quality.`;
    }, "Checking cloud-disabled local model metadata..."); });
    this.apply.addEventListener("click", () => { void this.run(async current => {
      this.configurations++; this.unconfirmed = null;
      const settings = this.value(await this.bridge.configureAI({ endpoint: this.endpoint.value, model: this.choices.value })); if (!current()) return;
      this.saved = settings; this.dirty = false;
      this.feedback.textContent = settings.model ? `Applied ${settings.model} for this session. Test the local connection, then Resume project.` : "Recorded-only Resume selected. No model will be used.";
    }, "Applying local AI settings..."); });
    this.check.addEventListener("click", () => { void this.run(async current => {
      const result = this.value(await this.bridge.checkAI()); if (current()) this.feedback.textContent = result;
    }, "Testing local completion capability and cloud-disabled status..."); });
  }
  /** Rechecks remembered settings; the model becomes usable only after discovery, apply and the connection test pass. */
  restore(input: { endpoint: string; model: string; embeddingModel: string }): Promise<void> {
    this.endpoint.value = input.endpoint;
    return this.run(async current => {
      try {
        const result = this.value(await this.bridge.discoverModels(input.endpoint)); if (!current()) return;
        const textModels = this.populate(result.models);
        if (input.model && !textModels.some(model => model.name === input.model)) throw Error(`The saved model ${input.model} is not among the downloaded local text models.`);
        const embedding = !input.embeddingModel || result.models.some(model => model.embedding && model.name === input.embeddingModel);
        this.choices.value = input.model; this.embeddings.value = embedding ? input.embeddingModel : "";
        const serial = ++this.configurations, settings = this.value(await this.bridge.configureAI({ endpoint: input.endpoint, model: input.model }));
        if (serial === this.configurations) this.unconfirmed = { endpoint: input.endpoint, serial };
        if (!current()) return this.revert();
        const check = settings.model ? this.value(await this.bridge.checkAI()) : ""; if (!current()) return this.revert();
        this.unconfirmed = null; this.saved = settings; this.dirty = false;
        this.feedback.textContent = `${settings.model ? `Saved AI rechecked: ${settings.model}. ${check}` : "Saved setting: recorded-only Resume, no model."}${embedding ? "" : ` The saved embedding model ${input.embeddingModel} is unavailable, so Ask uses keyword search.`}`;
      } catch (error) {
        // Main must not keep a model the recheck rejected; other workflows read its configuration.
        this.revert();
        throw Error(`${error instanceof Error ? error.message : "Local AI could not be checked."} Thread is working without AI until you set it up again.`);
      }
    }, "Rechecking the saved local AI model...");
  }
  draft(): { endpoint: string; model: string; embeddingModel: string } { return { endpoint: this.endpoint.value, model: this.choices.value, embeddingModel: this.embeddings.value }; }
  restoreDraft(input: { endpoint: string; model: string; embeddingModel: string }): void {
    this.reset(); this.changed(); this.endpoint.value = input.endpoint;
    this.choices.replaceChildren(new Option("Recorded only (no model)", ""), ...(input.model ? [new Option(input.model, input.model)] : []));
    this.embeddings.replaceChildren(new Option("Keyword only", ""), ...(input.embeddingModel ? [new Option(input.embeddingModel, input.embeddingModel)] : []));
    this.choices.value = input.model; this.embeddings.value = input.embeddingModel; this.choices.disabled = false; this.embeddings.disabled = false;
    this.feedback.textContent = "Restored preference drafts only. Find downloaded models to check availability, then explicitly choose and Apply AI settings. No inference or read grant started.";
  }
  embeddingModel(): string { return this.dirty ? "" : this.embeddings.value; }
  model(): string { return this.dirty ? "" : this.saved.model; }
  reset(): void {
    this.epoch++; this.configurations++; this.unconfirmed = null; this.saved = { endpoint: "http://127.0.0.1:11434", model: "" }; this.dirty = true;
    this.endpoint.value = this.saved.endpoint; this.choices.replaceChildren(new Option("Discover models first", "")); this.choices.disabled = true;
    this.embeddings.replaceChildren(new Option("Discover models first", "")); this.embeddings.disabled = true;
    this.busy(false); this.feedback.textContent = "Optional. Recorded context works without an AI model.";
  }
  private populate(models: { name: string; completion: boolean; embedding: boolean }[]): { name: string }[] {
    const textModels = models.filter(model => model.completion);
    this.choices.replaceChildren(new Option("Recorded only (no model)", ""), ...textModels.map(model => new Option(model.name, model.name)));
    this.choices.disabled = false;
    this.embeddings.replaceChildren(new Option("Keyword only (no embedding model)", ""), ...models.filter(model => model.embedding).map(model => new Option(model.name, model.name)));
    this.embeddings.disabled = false;
    return textModels;
  }
  /** Returns main to recorded-only while an unconfirmed restored model is still the latest configuration. */
  private revert(): void {
    const pending = this.unconfirmed; if (!pending || pending.serial !== this.configurations) return;
    this.unconfirmed = null; this.configurations++; void this.bridge.configureAI({ endpoint: pending.endpoint, model: "" });
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
