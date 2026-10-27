import { randomUUID } from "node:crypto";
import { WriterOwnership } from "../local/writer-ownership.ts";
import { DesktopProfile, hashText, preferences, type ProfileState } from "./profile.ts";
import { inspectCompatibility, type PluginCompatibility } from "./compatibility.ts";
import type { VaultReader } from "./vault-reader.ts";
import { DesktopError, permitted } from "./security.ts";
import { ChangeJournal } from "./change-journal.ts";
import { ImportJournal } from "./import-journal.ts";
export interface StorageStatus {
  preferences: ProfileState["preferences"]; warning: string; writing: boolean;
  saves: { id: string; path: string; status: string }[]; importedCopies: number; changesPending: boolean; changesRecovery: boolean;
}
export interface CompatibilityPreview extends PluginCompatibility { id: string; folder: string; }

export class DesktopStorage {
  private reader: VaultReader;
  private profileDirectory: string;
  private profile: DesktopProfile | null = null;
  private journal: ChangeJournal | null = null;
  private imports: ImportJournal | null = null;
  private identity = "";
  private warning = "";
  private owner: WriterOwnership | null = null;
  private preview: { value: CompatibilityPreview; revision: number } | null = null;
  private epoch = 0;
  private active: Promise<unknown> | null = null;
  constructor(reader: VaultReader, profileDirectory: string) { this.reader = reader; this.profileDirectory = profileDirectory; }
  async close(): Promise<void> {
    this.epoch++; this.preview = null;
    const owner = this.owner; this.owner = null;
    await this.active?.catch(() => {}); await owner?.release();
    this.profile = null; this.journal = null; this.imports = null; this.identity = ""; this.warning = "";
  }
  async initialize(revision: unknown): Promise<StorageStatus> {
    await this.close(); const epoch = this.epoch;
    const identity = await this.reader.identity(revision);
    if (epoch !== this.epoch) throw new DesktopError("Vault changed during profile loading.");
    const profile = new DesktopProfile(this.profileDirectory, identity);
    const journal = new ChangeJournal(this.profileDirectory, identity), imports = new ImportJournal(this.profileDirectory, identity);
    try { await profile.load(); await journal.load(); await imports.load(); } catch (error) { this.warning = error instanceof Error ? error.message : "Desktop history unavailable. Preserve the profile."; }
    if (epoch !== this.epoch || identity !== await this.reader.identity(revision)) throw new DesktopError("Vault changed during profile loading.");
    this.identity = identity; this.profile = profile; this.journal = journal; this.imports = imports; return this.status(revision);
  }
  status(revision: unknown): StorageStatus {
    if (!this.profile || revision !== this.reader.getInfo()?.revision) throw new DesktopError("Select a vault before opening desktop storage.");
    return { preferences: structuredClone(this.profile.state.preferences), warning: this.warning, writing: !!this.owner,
      saves: this.profile.state.saves.map(({ id, path, status }) => ({ id, path: permitted(path, this.reader.getInfo()!.scope) ? path : "Unavailable path (outside read scope)", status })), importedCopies: this.profile.state.imports.length,
      changesPending: !!this.journal?.state.pending, changesRecovery: !!this.journal?.state.recovery };
  }
  async inspect(folder: unknown, revision: unknown): Promise<CompatibilityPreview> {
    this.status(revision); this.preview = null; const epoch = ++this.epoch;
    const files = await this.reader.pluginFiles(folder, revision), compatibility = await inspectCompatibility(files);
    if (epoch !== this.epoch) throw new DesktopError("Compatibility inspection changed. Inspect again.");
    const value = { ...compatibility, id: randomUUID(), folder: folder as string };
    this.preview = { value, revision: revision as number }; return structuredClone(value);
  }
  private inspection(id: unknown, revision: unknown): CompatibilityPreview {
    const preview = this.preview;
    if (typeof id !== "string" || !preview || id !== preview.value.id || preview.revision !== revision || revision !== this.reader.getInfo()?.revision) throw new DesktopError("Compatibility preview changed. Inspect again.");
    if (!preview.value.compatible) throw new DesktopError(preview.value.reasons.join(" "));
    return preview.value;
  }
  private async compatible(revision: unknown): Promise<void> {
    const preview = this.preview; if (!preview) throw new DesktopError("Inspect plugin compatibility before enabling writes.");
    const expected = this.inspection(preview.value.id, revision);
    const actual = await inspectCompatibility(await this.reader.pluginFiles(expected.folder, revision));
    if (actual.hash !== expected.hash || !actual.compatible) throw new DesktopError("Plugin metadata changed. Release writing and inspect compatibility again.");
  }
  async enable(id: unknown, revision: unknown): Promise<StorageStatus> {
    this.inspection(id, revision);
    if (this.warning || !this.profile) throw new DesktopError(this.warning || "Desktop history unavailable.");
    if (this.active) throw new DesktopError("A storage operation is running. Wait for it to finish.");
    const epoch = this.epoch, identity = await this.reader.identity(revision);
    if (identity !== this.identity) throw new DesktopError("Vault identity changed. Select it again.");
    if (this.owner) { await this.compatible(revision); return this.status(revision); }
    const owner = await WriterOwnership.acquire(identity);
    try {
      await this.compatible(revision);
      if (epoch !== this.epoch || revision !== this.reader.getInfo()?.revision) throw new DesktopError("Storage setup changed. Inspect again.");
      this.owner = owner; return this.status(revision);
    } catch (error) { await owner.release(); throw error; }
  }
  async release(): Promise<void> {
    this.epoch++; this.preview = null; const owner = this.owner; this.owner = null;
    await this.active?.catch(() => {}); await owner?.release();
  }
  async owned<T>(revision: unknown, work: (profile: DesktopProfile, current: () => void) => Promise<T>, changes = false): Promise<T> {
    if (this.active || !this.owner || !this.profile || this.warning) throw new DesktopError(this.warning || "Enable writing after compatibility review; wait for any current save to finish.");
    const owner = this.owner, profile = this.profile, epoch = this.epoch;
    const current = (): void => { owner.assert(); if (this.owner !== owner || epoch !== this.epoch || revision !== this.reader.getInfo()?.revision) throw new DesktopError("Write access or vault changed. Review a new preview."); };
    const run = async (): Promise<T> => {
      current(); await this.compatible(revision); current();
      if (!changes && (this.journal?.state.pending || this.journal?.state.recovery)) throw new DesktopError("Resolve pending changes and recovery in Review changes before other saves.");
      if (await this.reader.identity(revision) !== this.identity) throw new DesktopError("Vault identity changed.");
      current(); return work(profile, current);
    };
    const promise = run(); this.active = promise;
    try { return await promise; } finally { if (this.active === promise) this.active = null; }
  }
  changeState(revision: unknown): ChangeJournal["state"] {
    this.status(revision);
    if (this.warning || !this.journal) throw new DesktopError(this.warning || "Change journal unavailable. Preserve the profile.");
    return structuredClone(this.journal.state);
  }
  async changeWork<T>(revision: unknown, work: (journal: ChangeJournal, current: () => void) => Promise<T>): Promise<T> {
    return this.owned(revision, async (profile, current) => {
      if (profile.state.saves.some(s => s.status === "pending")) throw new DesktopError("Resolve pending new-note saves in Desktop storage before changing notes.");
      if (!this.journal) throw new DesktopError("Change journal unavailable.");
      return work(this.journal, current);
    }, true);
  }
  importState(revision: unknown): ImportJournal["state"] {
    this.status(revision);
    if (this.warning || !this.imports) throw new DesktopError(this.warning || "Project import history unavailable. Preserve the profile.");
    return structuredClone(this.imports.state);
  }
  /** Writer-owned project import work; the journal state object is mutated and persisted by the shared importer. */
  async importWork<T>(revision: unknown, work: (journal: ImportJournal, current: () => void) => Promise<T>): Promise<T> {
    return this.owned(revision, async (_profile, current) => {
      if (!this.imports) throw new DesktopError("Project import history unavailable.");
      return work(this.imports, current);
    });
  }
  /** Writer-owned vault work that needs no journal, such as create-only package exports. */
  async exclusiveWrite<T>(revision: unknown, work: (current: () => void) => Promise<T>): Promise<T> { return this.owned(revision, async (_profile, current) => work(current)); }
  async savePreferences(input: unknown, revision: unknown): Promise<StorageStatus> {
    const next = preferences(input);
    await this.owned(revision, async (profile, current) => profile.store({ ...profile.state, preferences: next }, current)); return this.status(revision);
  }
  async importCopy(id: unknown, revision: unknown): Promise<StorageStatus> {
    const preview = this.inspection(id, revision);
    await this.owned(revision, async (profile, current) => {
      if (profile.state.imports.length >= 5) throw new DesktopError("Five history copies are already retained. No copy was removed; preserve the profile.");
      await profile.store({ ...profile.state, preferences: preview.preferences, imports: [...profile.state.imports, { id: randomUUID(), importedAt: new Date().toISOString(), content: preview.history, hash: hashText(preview.history) }] }, current);
    });
    return this.status(revision);
  }
}
