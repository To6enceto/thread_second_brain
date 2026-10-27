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
    this.endpoint.addEventListener("input", () => { this.edit(); this.choices.replaceChildren(new Option("Find models first", "")); this.choices.disabled = true; this.embeddings.replaceChildren(new Option("Find models first", "")); this.embeddings.disabled = true; });
    this.embeddings.addEventListener("change", () => this.edit());
    this.choices.addEventListener("change", () => this.edit());
    this.cancelButton.addEventListener("click", () => { this.epoch++; this.revert(); this.changed(); void this.bridge.cancelAI(); this.busy(false); this.feedback.textContent = "Check canceled."; });
    this.discover.addEventListener("click", () => { void this.run(async current => {
      this.dirty = true;
      const result = this.value(await this.bridge.discoverModels(this.endpoint.value)); if (!current()) return;
      const textModels = this.populate(result.models);
      this.feedback.textContent = `Found ${textModels.length} text models you can use (${result.omitted} of ${result.total} listed were skipped because they are online-only, could not be checked, or come after the first 40 listed). Pick one, then choose Use this model. Working does not guarantee good answers.`;
    }, "Looking for downloaded models on this computer..."); });
    this.apply.addEventListener("click", () => { void this.run(async current => {
      this.configurations++; this.unconfirmed = null;
      const settings = this.value(await this.bridge.configureAI({ endpoint: this.endpoint.value, model: this.choices.value })); if (!current()) return;
      this.saved = settings; this.dirty = false;
      this.feedback.textContent = settings.model ? `Using ${settings.model} for now. Choose Test connection, then Resume project.` : "No model selected. Resume shows what your notes say, without AI.";
    }, "Setting up the model..."); });
    this.check.addEventListener("click", () => { void this.run(async current => {
      const result = this.value(await this.bridge.checkAI()); if (current()) this.feedback.textContent = result;
    }, "Testing the model and checking that cloud features are off..."); });
  }
  /** Rechecks remembered settings; the model becomes usable only after discovery, apply and the connection test pass. */
  restore(input: { endpoint: string; model: string; embeddingModel: string }): Promise<void> {
    this.endpoint.value = input.endpoint;
    return this.run(async current => {
      try {
        const result = this.value(await this.bridge.discoverModels(input.endpoint)); if (!current()) return;
        const textModels = this.populate(result.models);
        if (input.model && !textModels.some(model => model.name === input.model)) throw Error(`The saved model ${input.model} is no longer downloaded on this computer.`);
        const embedding = !input.embeddingModel || result.models.some(model => model.embedding && model.name === input.embeddingModel);
        this.choices.value = input.model; this.embeddings.value = embedding ? input.embeddingModel : "";
        const serial = ++this.configurations, settings = this.value(await this.bridge.configureAI({ endpoint: input.endpoint, model: input.model }));
        if (serial === this.configurations) this.unconfirmed = { endpoint: input.endpoint, serial };
        if (!current()) return this.revert();
        const check = settings.model ? this.value(await this.bridge.checkAI()) : ""; if (!current()) return this.revert();
        this.unconfirmed = null; this.saved = settings; this.dirty = false;
        this.feedback.textContent = `${settings.model ? `Saved AI rechecked: ${settings.model}. ${check}` : "Saved setting: no AI model."}${embedding ? "" : ` The saved search model ${input.embeddingModel} is not available, so Ask searches by keywords.`}`;
      } catch (error) {
        // Main must not keep a model the recheck rejected; other workflows read its configuration.
        this.revert();
        throw Error(`${error instanceof Error ? error.message : "The AI model could not be checked."} Thread is working without AI until you set it up again.`);
      }
    }, "Checking your saved AI model again...");
  }
  draft(): { endpoint: string; model: string; embeddingModel: string } { return { endpoint: this.endpoint.value, model: this.choices.value, embeddingModel: this.embeddings.value }; }
  restoreDraft(input: { endpoint: string; model: string; embeddingModel: string }): void {
    this.reset(); this.changed(); this.endpoint.value = input.endpoint;
    this.choices.replaceChildren(new Option("No model (notes only)", ""), ...(input.model ? [new Option(input.model, input.model)] : []));
    this.embeddings.replaceChildren(new Option("Keyword only", ""), ...(input.embeddingModel ? [new Option(input.embeddingModel, input.embeddingModel)] : []));
    this.choices.value = input.model; this.embeddings.value = input.embeddingModel; this.choices.disabled = false; this.embeddings.disabled = false;
    this.feedback.textContent = "Saved settings filled in. Choose Find downloaded models, pick the model and choose Use this model. Nothing else started.";
  }
  embeddingModel(): string { return this.dirty ? "" : this.embeddings.value; }
  model(): string { return this.dirty ? "" : this.saved.model; }
  reset(): void {
    this.epoch++; this.configurations++; this.unconfirmed = null; this.saved = { endpoint: "http://127.0.0.1:11434", model: "" }; this.dirty = true;
    this.endpoint.value = this.saved.endpoint; this.choices.replaceChildren(new Option("Find models first", "")); this.choices.disabled = true;
    this.embeddings.replaceChildren(new Option("Find models first", "")); this.embeddings.disabled = true;
    this.busy(false); this.feedback.textContent = "Optional. Everything else works without AI.";
  }
  private populate(models: { name: string; completion: boolean; embedding: boolean }[]): { name: string }[] {
    const textModels = models.filter(model => model.completion);
    this.choices.replaceChildren(new Option("No model (notes only)", ""), ...textModels.map(model => new Option(model.name, model.name)));
    this.choices.disabled = false;
    this.embeddings.replaceChildren(new Option("None (keyword search only)", ""), ...models.filter(model => model.embedding).map(model => new Option(model.name, model.name)));
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
    this.feedback.textContent = "Settings changed. Choose Use this model before using it. Resume still works without AI.";
  }
  private async run(work: (current: () => boolean) => Promise<void>, message: string): Promise<void> {
    const epoch = ++this.epoch; this.changed(); this.busy(true); this.feedback.textContent = message;
    try { await work(() => epoch === this.epoch); }
    catch (error) { if (epoch === this.epoch) this.feedback.textContent = error instanceof Error ? error.message : "AI setup did not finish. Check that Ollama is running and try again."; }
    finally { if (epoch === this.epoch) this.busy(false); }
  }
}
