import { createHash } from "node:crypto";
import { localEndpoint, roleNames, type FolderRoles } from "../settings/settings.ts";
import { relativePath, DesktopError } from "./security.ts";
import { ProfileFile } from "./profile-file.ts";

export interface DesktopPreferences { endpoint: string; model: string; embeddingModel: string; roles: FolderRoles; }
export interface SaveReceipt { id: string; path: string; content: string; hash: string; createdAt: string; status: "pending" | "complete" | "left"; }
export interface HistoryCopy { id: string; importedAt: string; hash: string; content: string; }
export interface ProfileState { schemaVersion: 1; preferences: DesktopPreferences; saves: SaveReceipt[]; imports: HistoryCopy[]; }
const MAX_BYTES = 64 * 1048576;
export const hashText = (text: string): string => createHash("sha256").update(text).digest("hex");
export function freshProfile(): ProfileState {
  return { schemaVersion: 1, preferences: { endpoint: "http://127.0.0.1:11434", model: "", embeddingModel: "", roles: Object.fromEntries(roleNames.map(role => [role, ""])) as FolderRoles }, saves: [], imports: [] };
}
function object(input: unknown, keys: string): Record<string, unknown> {
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).sort().join(",") !== keys.split(",").sort().join(",")) throw new DesktopError("Desktop state has unknown or missing fields. Preserve it and restore a known backup.");
  return input as Record<string, unknown>;
}
const text = (value: unknown, max: number): value is string => typeof value === "string" && value.length <= max;
const iso = (value: unknown): boolean => typeof value === "string" && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
export function preferences(input: unknown): DesktopPreferences {
  const data = object(input, "endpoint,model,embeddingModel,roles"), roles = object(data.roles, roleNames.join(","));
  if (!text(data.endpoint, 200)) throw new DesktopError("Enter a local Ollama endpoint.");
  for (const key of ["model", "embeddingModel"]) if (!text(data[key], 200) || /[\s\u0000-\u001f]/.test(data[key] as string) || /(?:[:/-])cloud(?:$|[:/])/i.test(data[key] as string)) throw new DesktopError("Choose downloaded local model names.");
  for (const value of Object.values(roles)) if (value !== "") relativePath(value);
  return { endpoint: localEndpoint(data.endpoint), model: data.model as string, embeddingModel: data.embeddingModel as string, roles: { ...roles } as FolderRoles };
}
export function profileState(input: unknown): ProfileState {
  const data = object(input, "schemaVersion,preferences,saves,imports");
  if (data.schemaVersion !== 1 || !Array.isArray(data.saves) || data.saves.length > 20 || !Array.isArray(data.imports) || data.imports.length > 5) throw new DesktopError("Unsupported or full desktop history. Preserve the profile; writing is unavailable.");
  const ids = new Set<string>();
  for (const value of data.saves) {
    const receipt = object(value, "id,path,content,hash,createdAt,status");
    if (!text(receipt.id, 100) || !receipt.id || ids.has(receipt.id) || !text(receipt.path, 512) || !receipt.path.endsWith(".md") || relativePath(receipt.path) !== receipt.path || !text(receipt.content, 1048576) || Buffer.byteLength(receipt.content) > 1048576 || hashText(receipt.content) !== receipt.hash || !iso(receipt.createdAt) || typeof receipt.status !== "string" || !["pending", "complete", "left"].includes(receipt.status)) throw new DesktopError("Invalid desktop save receipt. Preserve the profile and inspect recovery.");
    ids.add(receipt.id);
  }
  for (const value of data.imports) {
    const copy = object(value, "id,importedAt,hash,content");
    if (!text(copy.id, 100) || !copy.id || ids.has(copy.id) || !iso(copy.importedAt) || !text(copy.content, 32 * 1048576) || Buffer.byteLength(copy.content) > 32 * 1048576 || hashText(copy.content) !== copy.hash) throw new DesktopError("Invalid imported history copy. Preserve the desktop profile.");
    ids.add(copy.id);
  }
  const result = { schemaVersion: 1, preferences: preferences(data.preferences), saves: structuredClone(data.saves), imports: structuredClone(data.imports) } as ProfileState;
  if (Buffer.byteLength(JSON.stringify(result)) > MAX_BYTES) throw new DesktopError("Desktop history exceeds its 64 MiB limit. Preserve it; no entries were deleted.");
  return result;
}

/** Per-vault preferences and receipts; never a read-grant source. */
export class DesktopProfile extends ProfileFile<ProfileState> {
  constructor(profileDirectory: string, identity: string) { super(profileDirectory, `vault-${identity}.json`, freshProfile(), profileState, MAX_BYTES); }
}
