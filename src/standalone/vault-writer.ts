import { constants, type Stats } from "node:fs";
import { mkdir, open, opendir, type FileHandle } from "node:fs/promises";
import { absoluteDirectory, fdPath, type VaultReader } from "./vault-reader.ts";
import { DesktopError, permitted, relativePath } from "./security.ts";
import { hashText } from "./profile.ts";

const flags = constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW;
const identity = (stat: Stats): string => `${stat.dev}:${stat.ino}`;
const missing = (error: unknown): boolean => (error as NodeJS.ErrnoException).code === "ENOENT";
export interface DestinationState { parents: string[]; file: { hash: string; stamp: string } | null; }

/** Main-only, exclusive new Markdown creation. A receipt must precede this call. */
export class VaultWriter {
  constructor(privateReader: VaultReader) { this.reader = privateReader; }
  private reader: VaultReader;
  private path(input: unknown, revision: unknown): string {
    const path = relativePath(input), info = this.reader.getInfo();
    if (!info || info.revision !== revision || !path.endsWith(".md") || !permitted(path, info.scope)) throw new DesktopError("Destination is outside current read access or excluded. Review access explicitly before saving.");
    return path;
  }
  private async root(revision: unknown): Promise<FileHandle> {
    const expected = await this.reader.identity(revision), info = this.reader.getInfo()!;
    const handle = await absoluteDirectory(info.path);
    if (hashText(identity(await handle.stat())) !== expected || this.reader.getInfo()?.revision !== revision) {
      await handle.close(); throw new DesktopError("Vault identity changed. Select it again.");
    }
    return handle;
  }
  private async collision(parent: FileHandle, name: string, allowExact: boolean): Promise<void> {
    const directory = await opendir(fdPath(parent)); let count = 0;
    for await (const entry of directory) {
      if (++count > 5000) throw new DesktopError("Destination folder exceeds the 5000-entry inspection limit. Choose a smaller folder.");
      if (entry.name.normalize("NFC").toLowerCase() === name.normalize("NFC").toLowerCase() && (!allowExact || entry.name !== name)) throw new DesktopError("A destination with this name already exists. Choose a new name; no overwrite is allowed.");
    }
  }
  async inspect(input: unknown, revision: unknown): Promise<DestinationState> {
    const path = this.path(input, revision), parts = path.split("/"), parents: string[] = [];
    let parent = await this.root(revision);
    try {
      parents.push(identity(await parent.stat()));
      for (const part of parts.slice(0, -1)) {
        await this.collision(parent, part, true);
        let next: FileHandle;
        try { next = await open(fdPath(parent, part), flags); }
        catch (error) { if (missing(error)) { await this.reader.identity(revision); this.path(path, revision); return { parents, file: null }; } throw new DesktopError("Destination parent is unavailable or uses a link. Preserve it and choose an ordinary folder."); }
        await parent.close(); parent = next; parents.push(identity(await parent.stat()));
      }
      await this.collision(parent, parts.at(-1)!, true);
      let file: DestinationState["file"] = null;
      try { const note = await this.reader.read(path, revision, 1048576); file = { hash: hashText(note.text), stamp: note.stamp }; }
      catch (error) { if (!missing(error)) throw error; }
      await this.reader.identity(revision); this.path(path, revision); return { parents, file };
    } finally { await parent.close(); }
  }
  async create(input: string, content: string, expected: DestinationState, revision: unknown, validate: () => Promise<void>, current: () => void): Promise<void> {
    const path = this.path(input, revision);
    if (Buffer.byteLength(content) > 1048576) throw new DesktopError("New note exceeds 1 MiB. Select fewer turns.");
    current();
    if (expected.file || JSON.stringify(await this.inspect(path, revision)) !== JSON.stringify(expected)) throw new DesktopError("Destination changed since preview. Inspect it and preview a new name.");
    const parts = path.split("/"); let parent = await this.root(revision);
    try {
      const chain = [identity(await parent.stat())];
      if (chain[0] !== expected.parents[0]) throw new DesktopError("Destination root changed since preview.");
      for (const part of parts.slice(0, -1)) {
        current(); this.path(path, revision); await this.collision(parent, part, true);
        const depth = chain.length;
        try { await mkdir(fdPath(parent, part)); await parent.sync(); }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; if (depth >= expected.parents.length) throw new DesktopError("A destination folder appeared since preview. Preview again."); }
        const next = await open(fdPath(parent, part), flags); await parent.close(); parent = next; chain.push(identity(await parent.stat()));
        if (depth < expected.parents.length && chain[depth] !== expected.parents[depth]) throw new DesktopError("Destination folder changed since preview.");
      }
      const check = async (): Promise<void> => {
        current(); const actual = await this.inspect(path, revision); current();
        if (JSON.stringify(actual.parents) !== JSON.stringify(chain)) throw new DesktopError("Destination folders moved during saving. Preserve the pending receipt and inspect recovery.");
      };
      await validate(); await check(); await this.collision(parent, parts.at(-1)!, false); current(); this.path(path, revision);
      const file = await open(fdPath(parent, parts.at(-1)!), constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
      try { current(); await file.writeFile(content, "utf8"); await file.sync(); }
      finally { await file.close(); }
      await parent.sync(); await check();
      if (hashText((await this.reader.read(path, revision, 1048576)).text) !== hashText(content)) throw new DesktopError("Saved bytes changed. Preserve the pending receipt and inspect recovery.");
      current();
    } finally { await parent.close(); }
  }
}
