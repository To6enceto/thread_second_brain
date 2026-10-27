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
    if (this.applying) throw new DesktopError("A save is in progress. Wait for it to finish.");
    this.revoke(); const epoch = this.epoch, state = this.storage.status(revision);
    if (!state.writing || state.warning || state.saves.some(s => s.status === "pending") || state.changesPending || state.changesRecovery) throw new DesktopError("Allow saving notes, and resolve unfinished saves or Review changes, before saving another note.");
    if (state.saves.length >= 20) throw new DesktopError("Thread already keeps twenty save records, so its save history is full. Nothing was removed; keep it as it is.");
    let artifact: ReturnType<DesktopAsk["artifact"]>;
    try { artifact = this.ask.artifact(identity, kind, title, selected, revision); }
    catch (error) { if (error instanceof DesktopError) throw error; throw new DesktopError("This answer or selection cannot form a valid note. Check its name and selected turns; reduce the selection if too large."); }
    const folder = artifact.project || state.preferences.roles.knowledge;
    if (!folder) throw new DesktopError("For answers from all your notes, set a Knowledge folder under Saving notes. This does not let Thread read anything new.");
    const path = relativePath(`${folder}/${kind === "answer" ? "Answers" : "Conversations"}/${title}.md`);
    await artifact.validate(); const destination = await this.writer.inspect(path, revision); artifact.assert();
    if (destination.file) throw new DesktopError("This note already exists. Choose a new name; no overwrite is allowed.");
    if (epoch !== this.epoch) throw new DesktopError("Something changed. Preview again.");
    const value = { id: randomUUID(), path, content: artifact.content, hash: hashText(artifact.content) };
    this.preview = { value, revision, preferences: JSON.stringify(state.preferences), destination, artifact }; return structuredClone(value);
  }
  async save(id: unknown, revision: unknown): Promise<{ path: string }> {
    const preview = this.preview, epoch = this.epoch;
    if (!preview || id !== preview.value.id || revision !== preview.revision || this.applying) throw new DesktopError("The preview changed. Preview again before saving.");
    const currentPreview = (): void => {
      if (epoch !== this.epoch || this.preview !== preview || JSON.stringify(this.storage.status(revision).preferences) !== preview.preferences) throw new DesktopError("Your choices or folder settings changed. Preview again.");
      preview.artifact.assert();
    };
    this.applying = true;
    let receiptRecorded = false;
    try {
      await this.storage.owned(revision, async (profile, owned) => {
        const current = (): void => { owned(); currentPreview(); };
        current();
        if (profile.state.saves.some(s => s.status === "pending") || profile.state.saves.length >= 20) throw new DesktopError("An unfinished save or a full save history blocks this save. Look under Saving notes.");
        await preview.artifact.validate(); current();
        if (JSON.stringify(await this.writer.inspect(preview.value.path, revision)) !== JSON.stringify(preview.destination)) throw new DesktopError("The destination changed since the preview. Look at it and choose a new name.");
        const receipt: SaveReceipt = { ...preview.value, createdAt: new Date().toISOString(), status: "pending" };
        await profile.store({ ...profile.state, saves: [...profile.state.saves, receipt] }, current); receiptRecorded = true;
        await this.writer.create(receipt.path, receipt.content, preview.destination, revision, preview.artifact.validate, current);
        current(); await profile.store({ ...profile.state, saves: profile.state.saves.map(s => s.id === receipt.id ? { ...s, status: "complete" } : s) }, current);
      });
      return { path: preview.value.path };
    } catch (error) {
      if (receiptRecorded) throw new DesktopError("The save was not confirmed. Keep any note or folders it created. Open Saving notes, choose Refresh and look at the unfinished save before another save. If history is unavailable, reopen Thread without resetting the profile.");
      if (error instanceof DesktopError) throw error;
      throw new DesktopError("Saving could not start. Check folder permissions and Saving notes; nothing was overwritten. If Thread's history is unavailable, keep its profile as it is.");
    } finally { this.applying = false; this.revoke(); }
  }
  async inspectRecovery(id: unknown, revision: unknown): Promise<RecoveryPreview> {
    this.revoke(); const epoch = this.epoch;
    return this.storage.owned(revision, async (profile, current) => {
      const receipt = profile.state.saves.find(s => s.id === id && s.status === "pending");
      if (!receipt) throw new DesktopError("Choose an unfinished save from the list.");
      const destination = await this.writer.inspect(receipt.path, revision); current();
      if (epoch !== this.epoch) throw new DesktopError("This changed while you looked at it. Look again.");
      const value = { id: randomUUID(), receiptId: receipt.id, path: receipt.path, content: receipt.content, hash: receipt.hash, matches: destination.file?.hash === receipt.hash, present: !!destination.file };
      this.recovery = { value, revision, destination }; return structuredClone(value);
    });
  }
  async resolveRecovery(id: unknown, action: unknown, revision: unknown): Promise<void> {
    const recovery = this.recovery, epoch = this.epoch;
    if (!recovery || id !== recovery.value.id || revision !== recovery.revision || action !== "confirm" && action !== "leave" || action === "confirm" && !recovery.value.matches) throw new DesktopError("Look at the unfinished save and choose one of the actions shown.");
    await this.storage.owned(revision, async (profile, owned) => {
      const current = (): void => { owned(); if (epoch !== this.epoch || this.recovery !== recovery) throw new DesktopError("This changed while you looked at it. Look again."); };
      current();
      if (!profile.state.saves.some(s => s.id === recovery.value.receiptId && s.status === "pending") || JSON.stringify(await this.writer.inspect(recovery.value.path, revision)) !== JSON.stringify(recovery.destination)) throw new DesktopError("The note changed. Look at it again; no files were changed.");
      current(); await profile.store({ ...profile.state, saves: profile.state.saves.map(s => s.id === recovery.value.receiptId ? { ...s, status: action === "confirm" ? "complete" : "left" } : s) }, current);
    });
    this.revoke();
  }
}
