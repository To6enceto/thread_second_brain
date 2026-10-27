import { randomUUID } from "node:crypto";
import { ChangeManager, type ChangeBatch, type ChangePort } from "../vault/changes.ts";
import { draftContent, editableBody } from "../vault/change-draft.ts";
import type { ReadScope } from "./contracts.ts";
import type { FolderRoles } from "../settings/settings.ts";
import { hashText } from "./profile.ts";
import { DesktopError, permitted, relativePath, within } from "./security.ts";
import type { VaultReader } from "./vault-reader.ts";
import type { DesktopStorage } from "./storage.ts";
import { VaultWriter, type DestinationState } from "./vault-writer.ts";
import { catalogFingerprint } from "./catalog.ts";

interface ChangeContext { schemaVersion: 1 | 2; scope: ReadScope; roles: FolderRoles; sources: { path: string; hash: string }[]; targets: Record<string, DestinationState>; catalog?: string; }
export interface ChangeSummary { id: string; createdAt: string; paths: string[]; status: string; available: boolean; }
export interface ChangesSnapshot { pending: ChangeSummary | null; recovery: ChangeSummary | null; history: ChangeSummary[]; }
export type ChangeAction = "apply" | "undo" | "recover";
export interface ChangePreview { id: string; batchId: string; action: ChangeAction; ready: boolean; message: string; operations: { path: string; before: string | null; after: string | null; current: string | null }[]; }
export interface EditDraft { id: string; path: string; body: string; }
type Inputs = { path: string; before: string | null; after: string }[];

/** Finite main-owned proposal capabilities, separate from durable journal IDs. */
export class DesktopChanges {
  private reader: VaultReader;
  private storage: DesktopStorage;
  private writer: VaultWriter;
  private epoch = 0;
  applying = false;
  private edit: { value: EditDraft; before: string; state: DestinationState; revision: unknown; settings: string } | null = null;
  private approval: { value: ChangePreview; revision: unknown; states: Record<string, DestinationState>; journal: string; settings: string; dirty: boolean } | null = null;
  constructor(reader: VaultReader, storage: DesktopStorage) { this.reader = reader; this.storage = storage; this.writer = new VaultWriter(reader); }
  invalidate(): void { this.epoch++; this.edit = null; this.approval = null; }
  draftChanged(id: unknown): void { const approval = this.approval; if (approval && approval.value.id === id) { approval.dirty = true; this.epoch++; } }
  private settings(revision: unknown): string {
    const info = this.reader.getInfo();
    if (!info || info.revision !== revision) throw new DesktopError("Vault or access changed. Open Review changes again.");
    return JSON.stringify({ scope: info.scope, roles: this.storage.status(revision).preferences.roles });
  }
  private check(input: string, revision: unknown): string {
    const path = relativePath(input), info = this.reader.getInfo(); this.settings(revision);
    const roles = this.storage.status(revision).preferences.roles;
    if (!path.endsWith(".md") || !permitted(path, info!.scope) || !Object.values(roles).some(folder => folder && within(path, folder))) throw new DesktopError("The note is outside permitted writable folders. Review read access, exclusions and folder roles explicitly.");
    return path;
  }
  private context(batch: ChangeBatch, revision: unknown, requireScope = true): ChangeContext {
    let data: ChangeContext;
    try { data = JSON.parse(batch.context) as ChangeContext; } catch { throw new DesktopError("Unsupported desktop change context. Preserve the journal."); }
    if (!data || ![1, 2].includes(data.schemaVersion) || !Array.isArray(data.sources) || data.sources.length > 100 || !data.targets || typeof data.targets !== "object") throw new DesktopError("Unsupported desktop change context. Preserve the journal.");
    if (data.schemaVersion === 2 && (Object.keys(data).sort().join(",") !== "catalog,roles,schemaVersion,scope,sources,targets" || typeof data.catalog !== "string" || !/^[a-f0-9]{64}$/.test(data.catalog))) throw new DesktopError("Unsupported guarded review context. Preserve the journal.");
    if (requireScope && JSON.stringify({ scope: data.scope, roles: data.roles }) !== this.settings(revision)) throw new DesktopError("Read scope or writable folders changed. Restore explicit access or reject and regenerate.");
    for (const op of batch.operations) this.check(op.path, revision);
    for (const source of data.sources) {
      if (!source || typeof source.path !== "string" || typeof source.hash !== "string" || !/^[a-f0-9]{64}$/.test(source.hash) || !permitted(relativePath(source.path), this.reader.getInfo()!.scope)) throw new DesktopError("Supporting sources are unavailable under current access. No retained text was shown.");
    }
    return data;
  }
  snapshot(revision: unknown): ChangesSnapshot {
    const state = this.storage.changeState(revision);
    const summary = (batch: ChangeBatch, status: string): ChangeSummary => {
      let available = true; try { this.context(batch, revision, false); } catch { available = false; }
      return { id: batch.id, createdAt: batch.createdAt, paths: available ? batch.operations.map(op => op.path) : ["Unavailable under current read access or folder roles"], status, available };
    };
    return { pending: state.pending ? summary(state.pending, state.pending.status) : null, recovery: state.recovery ? summary(state.recovery.batch, `recovery-${state.recovery.action}`) : null, history: state.history.map(batch => summary(batch, batch.undone ? "undone" : "applied")) };
  }
  async beginEdit(path: unknown, stamp: unknown, revision: unknown): Promise<EditDraft> {
    this.invalidate(); const epoch = this.epoch;
    if (typeof path !== "string" || typeof stamp !== "string") throw new DesktopError("Open a current note before proposing a body change.");
    this.check(path, revision); const settings = this.settings(revision), note = await this.reader.read(path, revision, 1048576);
    if (note.stamp !== stamp) throw new DesktopError("Note changed. Open it again before editing.");
    const state = await this.writer.inspect(path, revision);
    if (epoch !== this.epoch || settings !== this.settings(revision) || state.file?.stamp !== stamp) throw new DesktopError("Note or access changed. Open it again.");
    const value = { id: randomUUID(), path, body: editableBody(note.text).body };
    this.edit = { value, before: note.text, state, revision, settings }; return value;
  }
  async proposeEdit(id: unknown, body: unknown, revision: unknown): Promise<ChangesSnapshot> {
    const edit = this.edit, epoch = this.epoch;
    if (!edit || id !== edit.value.id || revision !== edit.revision || typeof body !== "string" || Buffer.byteLength(body) > 1048576 || edit.settings !== this.settings(revision)) throw new DesktopError("The edit draft changed or exceeds 1 MiB. Open the note again.");
    if (JSON.stringify(await this.writer.inspect(edit.value.path, revision)) !== JSON.stringify(edit.state)) throw new DesktopError("Target changed. Reopen it; newer edits were preserved.");
    if (epoch !== this.epoch || this.edit !== edit) throw new DesktopError("Edit draft changed. Open the note again.");
    let after: string;
    try { after = draftContent(edit.before, body); } catch (error) { throw new DesktopError(error instanceof Error ? error.message : "Keep note properties and provenance unchanged."); }
    return this.propose([{ path: edit.value.path, before: edit.before, after }], [], revision);
  }
  private async sources(context: ChangeContext, revision: unknown): Promise<boolean> {
    for (const source of context.sources) {
      // Consented PDF originals are rechecked by binary hash; revoked consent makes the proposal not ready.
      if (/\.pdf$/i.test(source.path)) { let hash = ""; try { hash = (await this.reader.readPdf(source.path, revision)).hash; } catch { return false; } if (hash !== source.hash) return false; }
      else if (hashText((await this.reader.read(source.path, revision)).text) !== source.hash) return false;
    }
    if (context.schemaVersion === 2 && catalogFingerprint(await this.reader.list(revision), Object.keys(context.targets)) !== context.catalog) return false;
    return true;
  }
  private async run<T>(revision: unknown, work: (manager: ChangeManager, current: () => void) => Promise<T>, states: Record<string, DestinationState> = {}): Promise<T> {
    if (this.applying) throw new DesktopError("A change operation is running. Wait for its result.");
    const epoch = this.epoch, settings = this.settings(revision); this.applying = true;
    try {
      return await this.storage.changeWork(revision, async (journal, owned) => {
        const current = (): void => { owned(); if (epoch !== this.epoch || settings !== this.settings(revision)) throw new DesktopError("Change approval or access changed. Inspect recovery before retrying."); };
        const currentState = async (path: string): Promise<DestinationState> => {
          current(); this.check(path, revision); const actual = await this.writer.inspect(path, revision); current();
          if (states[path] && JSON.stringify(states[path]) !== JSON.stringify(actual)) throw new DesktopError("Target identity or bytes changed. Preserve newer work and inspect recovery.");
          states[path] = actual; return actual;
        };
        const port: ChangePort = {
          check: path => { current(); this.check(path, revision); },
          read: async path => { const state = await currentState(path); return state.file ? (await this.reader.read(path, revision, 1048576)).text : null; },
          prepare: async path => { await currentState(path); },
          create: async (path, content) => { await this.writer.create(path, content, await currentState(path), revision, async () => { current(); }, current); states[path] = await this.writer.inspect(path, revision); },
          replace: async (path, before, after, contextCurrent) => { await this.writer.replace(path, before, after, await currentState(path), revision, () => { current(); if (contextCurrent && !contextCurrent()) throw new DesktopError("Source context changed before writing."); }); states[path] = await this.writer.inspect(path, revision); },
          removeCreated: async (path, before) => { await this.writer.removeCreated(path, before, await currentState(path), revision, current); states[path] = await this.writer.inspect(path, revision); },
          persist: async (raw, isCurrent) => { current(); await journal.store(JSON.parse(raw), () => { current(); if (isCurrent && !isCurrent()) throw new DesktopError("Proposal canceled."); }); },
          validateContext: async raw => { current(); const context = this.context({ id: "", createdAt: "", context: raw, operations: [] }, revision); const valid = await this.sources(context, revision); current(); return valid; },
          contextCurrent: () => { try { current(); return true; } catch { return false; } }
        };
        const manager = new ChangeManager(port); await manager.load(journal.state); current(); return work(manager, current);
      });
    } catch (error) {
      if (this.reader.getInfo()?.revision !== revision) throw new DesktopError("Read access or vault changed. Recovery was preserved; approve access and inspect it explicitly.");
      throw new DesktopError(error instanceof Error ? error.message : "Change operation failed. Preserve the journal and inspect recovery.");
    } finally { this.applying = false; this.approval = null; }
  }
  /** Called by trusted main-process record generators; never exposed as generic IPC. */
  async propose(inputs: Inputs, sources: ChangeContext["sources"], revision: unknown, catalog?: string): Promise<ChangesSnapshot> {
    this.approval = null; const settings = this.settings(revision), targets: ChangeContext["targets"] = {};
    if (!inputs.length || inputs.length > 10 || sources.length > 100) throw new DesktopError("Keep proposals within ten notes and one hundred source references.");
    await this.run(revision, async (manager, current) => {
      for (const input of inputs) {
        this.check(input.path, revision); targets[input.path] = await this.writer.inspect(input.path, revision); current();
        if (targets[input.path]!.file?.hash !== (input.before === null ? undefined : hashText(input.before))) throw new DesktopError("Target changed before proposal. Reopen the source.");
      }
      const context: ChangeContext = { schemaVersion: catalog === undefined ? 1 : 2, ...JSON.parse(settings), sources: structuredClone(sources), targets, ...(catalog === undefined ? {} : { catalog }) };
      // A target has its own before/after checks; separate supporting sources
      // must remain unchanged throughout a multi-note application.
      if (sources.some(source => inputs.some(input => input.path === source.path))) throw new DesktopError("Keep supporting references separate from changed targets.");
      this.context({ id: "", createdAt: "", operations: inputs as ChangeBatch["operations"], context: JSON.stringify(context) }, revision);
      if (!await this.sources(context, revision)) throw new DesktopError("Supporting sources changed. Regenerate the proposal.");
      await manager.propose(inputs, JSON.stringify(context), () => { current(); return true; });
    });
    this.edit = null; return this.snapshot(revision);
  }
  private batch(action: ChangeAction, id: unknown, revision: unknown): ChangeBatch {
    const state = this.storage.changeState(revision);
    const batch = action === "apply" ? state.pending : action === "recover" ? state.recovery?.batch : state.history.find(batch => batch.id === id && !batch.undone);
    if (!batch || batch.id !== id) throw new DesktopError("The selected change is no longer current. Refresh Review changes.");
    return batch;
  }
  async preview(action: unknown, id: unknown, revision: unknown): Promise<ChangePreview> {
    if (typeof action !== "string" || !["apply", "undo", "recover"].includes(action) || this.applying) throw new DesktopError("Choose a current change action.");
    this.approval = null; const epoch = ++this.epoch, batch = this.batch(action as ChangeAction, id, revision), context = this.context(batch, revision, action === "apply"), settings = this.settings(revision);
    const state = this.storage.changeState(revision), journal = JSON.stringify(state), states: Record<string, DestinationState> = {};
    let ready = action === "apply" ? state.pending?.status === "pending" && !state.recovery : action === "undo" ? !state.pending && !state.recovery : !!state.recovery;
    const side = action === "undo" || action === "recover" && state.recovery?.action === "apply" ? "before" : "after";
    const operations: ChangePreview["operations"] = [];
    for (const op of batch.operations) {
      const target = await this.writer.inspect(op.path, revision); states[op.path] = target;
      const current = target.file ? (await this.reader.read(op.path, revision, 1048576)).text : null;
      const expected = side === "after" ? op.before : op.after;
      if (action !== "recover" && current !== expected || action === "recover" && current !== expected && current !== op[side]) ready = false;
      if (action === "apply" && JSON.stringify(context.targets[op.path]) !== JSON.stringify(target)) ready = false;
      operations.push({ path: op.path, before: expected, after: op[side], current });
    }
    if (action === "apply" && !await this.sources(context, revision)) ready = false;
    if (epoch !== this.epoch || settings !== this.settings(revision) || journal !== JSON.stringify(this.storage.changeState(revision))) throw new DesktopError("Review changed while loading. Preview again.");
    const value: ChangePreview = { id: randomUUID(), batchId: batch.id, action: action as ChangeAction, ready, message: ready ? "Inspect every exact change before confirming. Keep other editors closed." : "Stale or conflicting state. Later edits are preserved; compare originals, then resolve or reject explicitly.", operations };
    this.approval = { value, revision, states, journal, settings, dirty: false }; return structuredClone(value);
  }
  private approved(id: unknown, revision: unknown, editing = false): NonNullable<DesktopChanges["approval"]> {
    const approval = this.approval;
    if (!approval || !approval.value.ready || approval.dirty && !editing || id !== approval.value.id || revision !== approval.revision || approval.settings !== this.settings(revision) || approval.journal !== JSON.stringify(this.storage.changeState(revision))) throw new DesktopError("Exact change preview changed. Preview again before confirming.");
    return approval;
  }
  async confirm(id: unknown, revision: unknown): Promise<ChangesSnapshot> {
    const approval = this.approved(id, revision), { action, batchId } = approval.value;
    await this.run(revision, async manager => { if (action === "apply") await manager.apply(batchId); else if (action === "undo") await manager.undo(batchId); else await manager.recover(batchId); }, structuredClone(approval.states));
    return this.snapshot(revision);
  }
  async revise(id: unknown, bodies: unknown, revision: unknown): Promise<ChangesSnapshot> {
    const approval = this.approved(id, revision, true);
    if (approval.value.action !== "apply" || !Array.isArray(bodies) || bodies.length !== approval.value.operations.length || bodies.some(body => typeof body !== "string" || Buffer.byteLength(body) > 1048576)) throw new DesktopError("Edit the complete proposed body group within its text limit.");
    await this.run(revision, (manager, current) => manager.revise(approval.value.batchId, bodies, () => { current(); return true; }), structuredClone(approval.states));
    return this.snapshot(revision);
  }
  async reject(id: unknown, revision: unknown): Promise<ChangesSnapshot> {
    if (typeof id !== "string" || this.storage.changeState(revision).pending?.id !== id) throw new DesktopError("Pending proposal changed. Refresh before rejecting.");
    this.approval = null; await this.run(revision, manager => manager.reject(id)); return this.snapshot(revision);
  }
}
