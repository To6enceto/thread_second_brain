import { createHash } from "node:crypto";
import { stat } from "node:fs/promises";
import { createServer, type Server } from "node:net";

export const WRITER_PROTOCOL = 1;
export class WriterOwnershipError extends Error {}
export async function vaultIdentity(path: string): Promise<string> {
  const info = await stat(path);
  if (!info.isDirectory()) throw new WriterOwnershipError("Choose an ordinary vault directory.");
  return createHash("sha256").update(`${info.dev}:${info.ino}`).digest("hex");
}

/** Linux abstract sockets are kernel-owned locks: no note content or filesystem lock file. */
export class WriterOwnership {
  private server: Server;
  readonly identity: string;
  private constructor(server: Server, identity: string) { this.server = server; this.identity = identity; }
  static async acquire(identity: string): Promise<WriterOwnership> {
    if (process.platform !== "linux" || !/^[a-f0-9]{64}$/.test(identity)) throw new WriterOwnershipError("Coordinated desktop writing requires Linux and a current vault identity.");
    const server = createServer(socket => socket.destroy());
    try {
      await new Promise<void>((resolve, reject) => {
        server.once("error", reject);
        server.listen({ path: `\0thread-writer-v1-${process.getuid!()}-${identity}`, backlog: 1 }, () => { server.removeListener("error", reject); resolve(); });
      });
    } catch {
      server.close();
      throw new WriterOwnershipError("Another Thread writer owns this vault. Close Obsidian or release writing in the other Thread Desktop window, then retry. No ownership is stolen.");
    }
    server.unref();
    // Unexpected loss fails closed at the next operation boundary.
    server.on("error", () => server.close());
    return new WriterOwnership(server, identity);
  }
  assert(): void { if (!this.server.listening) throw new WriterOwnershipError("Writer ownership ended. Enable writing and preview again."); }
  async release(): Promise<void> {
    if (!this.server.listening) return;
    await new Promise<void>((resolve, reject) => this.server.close(error => error ? reject(error) : resolve()));
  }
}

// A disabled/reloaded plugin can still have an in-flight Vault API write.
// Retain its ownership in this process until Obsidian exits, rather than release early.
export async function pluginWriterOwnership(path: string): Promise<void> {
  if (process.platform !== "linux") return;
  const key = Symbol.for("thread.writer-ownership.v1");
  const shared = globalThis as typeof globalThis & { [key: symbol]: Map<string, Promise<WriterOwnership>> | undefined };
  const owners = shared[key] ?? new Map<string, Promise<WriterOwnership>>(); shared[key] = owners;
  const identity = await vaultIdentity(path);
  let pending = owners.get(identity);
  if (!pending) { pending = WriterOwnership.acquire(identity); owners.set(identity, pending); }
  try { (await pending).assert(); } catch (error) { if (owners.get(identity) === pending) owners.delete(identity); throw error; }
}
