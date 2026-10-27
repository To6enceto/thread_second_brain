import { sampleNote } from "../settings/setup.ts";
import { noteName, starterNotes, type NewNote } from "../vault/workspace.ts";
import { VaultWriter } from "./vault-writer.ts";
import { DesktopError } from "./security.ts";
import type { DesktopChanges, ChangesSnapshot } from "./changes.ts";
import type { DesktopStorage } from "./storage.ts";
import type { VaultReader } from "./vault-reader.ts";

/** Prepares shared starter or sample notes as one exact create-only proposal for Review changes. */
export class DesktopNewProject {
  private reader: VaultReader;
  private storage: DesktopStorage;
  private changes: DesktopChanges;
  private writer: VaultWriter;
  constructor(reader: VaultReader, storage: DesktopStorage, changes: DesktopChanges) { this.reader = reader; this.storage = storage; this.changes = changes; this.writer = new VaultWriter(reader); }
  async prepare(kind: unknown, name: unknown, revision: unknown): Promise<ChangesSnapshot> {
    if (kind !== "project" && kind !== "sample") throw new DesktopError("Choose a sample project or a new project.");
    const info = this.reader.getInfo();
    if (!info || info.revision !== revision || !info.scope.roots.length) throw new DesktopError("Choose your notes folder and approve read access first.");
    const roles = this.storage.status(revision).preferences.roles, excluded = info.scope.excluded;
    let notes: NewNote[];
    if (kind === "sample") {
      if (!roles.projects) throw new DesktopError("Set a Projects folder under Saving notes > Where Thread saves each kind of note first.");
      notes = [this.shared(() => sampleNote(roles.projects, excluded))];
    } else {
      if (typeof name !== "string" || !name.trim() || name.length > 100) throw new DesktopError("Enter a project name of 1 to 100 characters.");
      try { noteName(name); } catch { throw new DesktopError("Use a project name without / \\ : * ? \" < > | [ ] # ^, and not starting with a dot."); }
      if (!roles.projects || !roles.templates) throw new DesktopError("Set Projects and Templates folders under Saving notes > Where Thread saves each kind of note first.");
      const all = this.shared(() => starterNotes(roles, name, excluded));
      const project = all[0]!.path.slice(0, all[0]!.path.lastIndexOf("/") + 1);
      // Refuse any existing project folder, including one with no note Thread can read.
      const overview = await this.writer.inspect(all[0]!.path, revision);
      if (overview.parents.length === all[0]!.path.split("/").length) throw new DesktopError(`A project folder named ${project.slice(0, -1)} already exists. Choose another name.`);
      // Templates are shared by every project; existing ones are kept. Each is checked on disk, not in the bounded listing.
      notes = [];
      for (const note of all) if (note.path.startsWith(project) || (await this.writer.inspect(note.path, revision)).file === null) notes.push(note);
    }
    return this.changes.propose(notes.map(note => ({ path: note.path, before: null, after: note.content })), [], revision);
  }
  private shared<T>(build: () => T): T {
    try { return build(); }
    catch (error) { throw error instanceof DesktopError ? error : new DesktopError(`${error instanceof Error ? error.message : "The notes could not be prepared."} Check the folders under Saving notes.`); }
  }
}
