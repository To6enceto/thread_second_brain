import { WriterOwnershipError } from "../local/writer-ownership.ts";
import { pathToFileURL } from "node:url";
import type { ReadScope } from "./contracts.ts";

export class DesktopError extends Error {}
export function relativePath(value: unknown): string {
  if (typeof value !== "string" || !value || value.length > 512 || /[\\\x00-\x1f\x7f]/.test(value)) {
    throw new DesktopError("Write folders from the top of your notes folder with forward slashes, for example Projects/Demo.");
  }
  if (value === ".") return value;
  if (value.split("/").some(part => !part || part.startsWith(".") || part.trim() !== part)) {
    throw new DesktopError("Use ordinary folder or note names. Hidden folders (starting with a dot) and .. are not allowed.");
  }
  return value;
}
export function scopeInput(value: unknown): ReadScope {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new DesktopError("Check the folders Thread may read and the ones kept private.");
  const record = value as Record<string, unknown>;
  if (Object.keys(record).sort().join(",") !== "excluded,roots") throw new DesktopError("Check the folders Thread may read and the ones kept private.");
  const paths = (input: unknown): string[] => {
    if (!Array.isArray(input) || input.length > 32) throw new DesktopError("List at most 32 folders to read and 32 to keep private.");
    return [...new Set(input.map(relativePath))].sort();
  };
  return { roots: paths(record.roots), excluded: paths(record.excluded) };
}
export function within(path: string, root: string): boolean {
  return root === "." || path === root || path.startsWith(`${root}/`);
}
export function permitted(path: string, scope: ReadScope): boolean {
  return scope.roots.some(root => within(path, root)) && !scope.excluded.some(root => within(path, root));
}
export function trustedSender(senderId: number, expectedId: number, frameUrl: string, isMainFrame: boolean, entry: string): boolean {
  return senderId === expectedId && isMainFrame && frameUrl === pathToFileURL(entry).href;
}
export function assetAllowed(url: string, assets: readonly string[]): boolean {
  return assets.some(asset => pathToFileURL(asset).href === url);
}
export function publicFailure(error: unknown): string {
  return error instanceof DesktopError || error instanceof WriterOwnershipError ? error.message : "Thread could not read this. Check that the folder is still there, then choose Refresh or choose the folder again.";
}
