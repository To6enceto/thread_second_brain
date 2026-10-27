import { constants } from "node:fs";
import { open } from "node:fs/promises";
import { basename, dirname, isAbsolute, normalize } from "node:path";
import { MAX_IMPORT_BYTES, importFileName } from "../vault/capture.ts";
import { absoluteDirectory, fdPath } from "./vault-reader.ts";
import { DesktopError } from "./security.ts";
import { hashText } from "./profile.ts";
export interface PickedText { name: string; text: string; hash: string; }

/** Main only: path must come from the explicit native file picker, never IPC. */
export async function readPickedText(path: string, current: () => void): Promise<PickedText> {
  current();
  if (!isAbsolute(path) || normalize(path) !== path || path.includes("\0")) throw new DesktopError("Choose one ordinary local Markdown or text file.");
  const name = basename(path); if (name.startsWith(".") || name.length > 200 || /[\u0000-\u001f\u007f]/.test(name)) throw new DesktopError("Choose a visible text file with a name of at most 200 characters.");
  try { importFileName(name, 0); } catch (error) { throw new DesktopError((error as Error).message); }
  const parent = await absoluteDirectory(dirname(path));
  try {
    const parentBefore = await parent.stat(); current();
    const file = await open(fdPath(parent, name), constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    try {
      const before = await file.stat(); current();
      if (!before.isFile() || before.nlink !== 1 || before.size > MAX_IMPORT_BYTES) throw new DesktopError("Choose an ordinary single-link UTF-8 text file up to 2 MiB.");
      const buffer = Buffer.alloc(before.size + 1); let count = 0;
      while (count < buffer.length) { current(); const part = await file.read(buffer, count, buffer.length - count, count); if (!part.bytesRead) break; count += part.bytesRead; }
      const after = await file.stat(), freshParent = await absoluteDirectory(dirname(path));
      try {
        const parentAfter = await freshParent.stat(), fresh = await open(fdPath(freshParent, name), constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
        try {
          const actual = await fresh.stat();
          if (count !== before.size || parentBefore.dev !== parentAfter.dev || parentBefore.ino !== parentAfter.ino || [after, actual].some(stat => stat.dev !== before.dev || stat.ino !== before.ino || stat.nlink !== 1 || stat.size !== before.size || stat.mtimeMs !== before.mtimeMs || stat.ctimeMs !== before.ctimeMs)) throw new DesktopError("The selected file changed while reading. Choose it again.");
        } finally { await fresh.close(); }
      } finally { await freshParent.close(); }
      current(); let text: string;
      try { text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(buffer.subarray(0, count)); } catch { throw new DesktopError("Choose a valid UTF-8 text file; invalid bytes are not replaced."); }
      if (!text.trim()) throw new DesktopError("Choose a nonempty text file.");
      return { name, text, hash: hashText(text) };
    } finally { await file.close(); }
  } finally { await parent.close(); }
}
