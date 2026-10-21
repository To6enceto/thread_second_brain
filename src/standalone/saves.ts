import { randomUUID } from "node:crypto";
import type { DesktopAsk } from "./ask.ts";
import type { DesktopStorage } from "./storage.ts";
import { hashText, type SaveReceipt } from "./profile.ts";
import { DesktopError, relativePath } from "./security.ts";
import { VaultWriter, type DestinationState } from "./vault-writer.ts";
import type { VaultReader } from "./vault-reader.ts";

export interface SavePreview { id: string; path: string; content: string; hash: string; }
export interface RecoveryPreview extends SavePreview { receiptId: string; matches: boolean; present: boolean; }
export class DesktopSaves {
  private storage: DesktopStorage;
  private ask: DesktopAsk;
  private writer: VaultWriter;
  private epoch = 0;
  applying = false;
  private preview: { value: SavePreview; revision: unknown; preferences: string; destination: DestinationState; artifact: ReturnType<DesktopAsk["artifact"]> } | null = null;
  private recovery: { value: RecoveryPreview; revision: unknown; destination: DestinationState } | null = null;
  constructor(reader: VaultReader, storage: DesktopStorage, ask: DesktopAsk) { this.writer = new VaultWriter(reader); this.storage = storage; this.ask = ask; }
  revoke(): void { this.epoch++; this.preview = null; this.recovery = null; }
  async prepare(identity: unknown, kind: unknown, title: unknown, selected: unknown, revision: unknown): Promise<SavePreview> {
    if (this.applying) throw new DesktopError("A save is running. Wait for its receipt.");
    this.revoke(); const epoch = this.epoch, state = this.storage.status(revision);
    if (!state.writing || state.warning || state.saves.some(s => s.status === "pending")) throw new DesktopError("Enable desktop writing and resolve pending saves in Desktop storage before saving another note.");
    if (state.saves.length >= 20) throw new DesktopError("Twenty save receipts are retained. History is full; preserve it. No receipt was removed.");
    let artifact: ReturnType<DesktopAsk["artifact"]>;
    try { artifact = this.ask.artifact(identity, kind, title, selected, revision); }
    catch (error) { if (error instanceof DesktopError) throw error; throw new DesktopError("This answer or selection cannot form a valid note. Check its name and selected turns; reduce the selection if too large."); }
    const folder = artifact.project || state.preferences.roles.knowledge;
    if (!folder) throw new DesktopError("Map an existing Knowledge folder in Desktop storage for all-permitted-notes answers. Mapping grants no read access.");
    const path = relativePath(`${folder}/${kind === "answer" ? "Answers" : "Conversations"}/${title}.md`);
    await artifact.validate(); const destination = await this.writer.inspect(path, revision); artifact.assert();
    if (destination.file) throw new DesktopError("This note already exists. Choose a new name; no overwrite is allowed.");
    if (epoch !== this.epoch) throw new DesktopError("Save inputs changed. Preview again.");
    const value = { id: randomUUID(), path, content: artifact.content, hash: hashText(artifact.content) };
    this.preview = { value, revision, preferences: JSON.stringify(state.preferences), destination, artifact }; return structuredClone(value);
  }
  async save(id: unknown, revision: unknown): Promise<{ path: string }> {
    const preview = this.preview, epoch = this.epoch;
    if (!preview || id !== preview.value.id || revision !== preview.revision || this.applying) throw new DesktopError("Exact preview changed. Preview again before saving.");
    const currentPreview = (): void => {
      if (epoch !== this.epoch || this.preview !== preview || JSON.stringify(this.storage.status(revision).preferences) !== preview.preferences) throw new DesktopError("Save inputs or preferences changed. Preview again.");
      preview.artifact.assert();
    };
    this.applying = true;
    let receiptRecorded = false;
    try {
      await this.storage.owned(revision, async (profile, owned) => {
        const current = (): void => { owned(); currentPreview(); };
        current();
        if (profile.state.saves.some(s => s.status === "pending") || profile.state.saves.length >= 20) throw new DesktopError("Pending or full save history blocks this save. Inspect Desktop storage.");
        await preview.artifact.validate(); current();
        if (JSON.stringify(await this.writer.inspect(preview.value.path, revision)) !== JSON.stringify(preview.destination)) throw new DesktopError("Destination changed since preview. Inspect it and choose a new name.");
        const receipt: SaveReceipt = { ...preview.value, createdAt: new Date().toISOString(), status: "pending" };
        await profile.store({ ...profile.state, saves: [...profile.state.saves, receipt] }, current); receiptRecorded = true;
        await this.writer.create(receipt.path, receipt.content, preview.destination, revision, preview.artifact.validate, current);
        current(); await profile.store({ ...profile.state, saves: profile.state.saves.map(s => s.id === receipt.id ? { ...s, status: "complete" } : s) }, current);
      });
      return { path: preview.value.path };
    } catch (error) {
      if (receiptRecorded) throw new DesktopError("Save did not finish with a confirmed receipt. Preserve any created note and folders. Open Desktop storage, refresh receipts and inspect pending recovery before another save. If history is unavailable, reopen Thread without resetting the profile.");
      if (error instanceof DesktopError) throw error;
      throw new DesktopError("Save could not begin. Inspect folder permissions and Desktop storage; no overwrite was attempted. Preserve the profile if history is unavailable.");
    } finally { this.applying = false; this.revoke(); }
  }
  async inspectRecovery(id: unknown, revision: unknown): Promise<RecoveryPreview> {
    this.revoke(); const epoch = this.epoch;
    return this.storage.owned(revision, async (profile, current) => {
      const receipt = profile.state.saves.find(s => s.id === id && s.status === "pending");
      if (!receipt) throw new DesktopError("Choose a current pending receipt.");
      const destination = await this.writer.inspect(receipt.path, revision); current();
      if (epoch !== this.epoch) throw new DesktopError("Recovery inspection changed. Inspect again.");
      const value = { id: randomUUID(), receiptId: receipt.id, path: receipt.path, content: receipt.content, hash: receipt.hash, matches: destination.file?.hash === receipt.hash, present: !!destination.file };
      this.recovery = { value, revision, destination }; return structuredClone(value);
    });
  }
  async resolveRecovery(id: unknown, action: unknown, revision: unknown): Promise<void> {
    const recovery = this.recovery, epoch = this.epoch;
    if (!recovery || id !== recovery.value.id || revision !== recovery.revision || action !== "confirm" && action !== "leave" || action === "confirm" && !recovery.value.matches) throw new DesktopError("Inspect the current receipt and choose an available recovery action.");
    await this.storage.owned(revision, async (profile, owned) => {
      const current = (): void => { owned(); if (epoch !== this.epoch || this.recovery !== recovery) throw new DesktopError("Recovery preview changed. Inspect again."); };
      current();
      if (!profile.state.saves.some(s => s.id === recovery.value.receiptId && s.status === "pending") || JSON.stringify(await this.writer.inspect(recovery.value.path, revision)) !== JSON.stringify(recovery.destination)) throw new DesktopError("Recovery target changed. Inspect it again; no files were changed.");
      current(); await profile.store({ ...profile.state, saves: profile.state.saves.map(s => s.id === recovery.value.receiptId ? { ...s, status: action === "confirm" ? "complete" : "left" } : s) }, current);
    });
    this.revoke();
  }
}
