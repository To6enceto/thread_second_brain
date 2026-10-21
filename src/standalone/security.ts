import { pathToFileURL } from "node:url";
import type { ReadScope } from "./contracts.ts";

export class DesktopError extends Error {}
export function relativePath(value: unknown): string {
  if (typeof value !== "string" || !value || value.length > 512 || /[\\\x00-\x1f\x7f]/.test(value)) {
    throw new DesktopError("Use a vault-relative path, with forward slashes and no control characters.");
  }
  if (value === ".") return value;
  if (value.split("/").some(part => !part || part.startsWith(".") || part.trim() !== part)) {
    throw new DesktopError("Use ordinary relative folders or Markdown files. Hidden paths and parent paths are unavailable.");
  }
  return value;
}
export function scopeInput(value: unknown): ReadScope {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new DesktopError("Review the read roots and exclusions.");
  const record = value as Record<string, unknown>;
  if (Object.keys(record).sort().join(",") !== "excluded,roots") throw new DesktopError("Review the read roots and exclusions.");
  const paths = (input: unknown): string[] => {
    if (!Array.isArray(input) || input.length > 32) throw new DesktopError("Use at most 32 read roots and 32 exclusions.");
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
  return error instanceof DesktopError ? error.message : "Thread could not finish this read. Check folder access, then refresh or select the vault again.";
}
