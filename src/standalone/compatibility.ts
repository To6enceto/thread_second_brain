import { ChangeManager, type ChangePort } from "../vault/changes.ts";
import { loadProjectImports } from "../portability/import.ts";
import { loadSettings } from "../settings/settings.ts";
import { freshProfile, hashText, preferences, type DesktopPreferences } from "./profile.ts";
import { DesktopError } from "./security.ts";
export interface PluginCompatibility { installed: boolean; version: string; compatible: boolean; reasons: string[]; preferences: DesktopPreferences; history: string; hash: string; }
function data(raw: string): Record<string, unknown> {
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Error("Invalid metadata object.");
  return value as Record<string, unknown>;
}
export async function inspectCompatibility(files: Record<string, string | null>): Promise<PluginCompatibility> {
  try {
    const reasons: string[] = [], manifest = files["manifest.json"] ? data(files["manifest.json"]) : null;
    if (!manifest && Object.values(files).some(value => value !== null)) reasons.push("Plugin metadata exists without a manifest. Preserve it and repair the installation in Obsidian.");
    if (manifest && (manifest.id !== "thread" || manifest.version !== "0.4.2" || manifest.isDesktopOnly !== true)) reasons.push("This plugin build does not establish writer protocol 1. Install the verified compatible Thread 0.4.2 build before desktop writes.");
    let draft = freshProfile().preferences;
    if (files["data.json"]) {
      const raw = data(files["data.json"]);
      if (raw.schemaVersion !== 1) reasons.push("Plugin settings use an unknown version. Do not migrate them automatically.");
      else { const settings = loadSettings(raw); draft = preferences({ endpoint: settings.endpoint, model: settings.model, embeddingModel: settings.embeddingModel, roles: settings.roles }); }
    }
    if (files["changes.json"]) {
      const raw = data(files["changes.json"]);
      // Validate versions, original hashes and recovery relationships using the shared loader.
      const manager = new ChangeManager({} as ChangePort); await manager.load(raw);
      if (manager.state.pending || manager.state.recovery) reasons.push("Plugin changes have pending review or recovery. Resolve them in Obsidian before enabling desktop writes; nothing is reset.");
    }
    if (files["project-imports.json"]) {
      const state = loadProjectImports(data(files["project-imports.json"]));
      if (state.receipts.some(receipt => receipt.status === "pending")) reasons.push("Plugin project imports have unresolved recovery. Resolve it in Obsidian first.");
    }
    const history = JSON.stringify({ schemaVersion: 1, changes: files["changes.json"], projectImports: files["project-imports.json"] });
    return { installed: !!manifest, version: typeof manifest?.version === "string" ? manifest.version : "", compatible: reasons.length === 0, reasons, preferences: draft, history, hash: hashText(JSON.stringify(files)) };
  } catch { throw new DesktopError("Plugin settings or recovery history is invalid or unsupported. Preserve the original files and resolve them in Obsidian; desktop writing remains disabled."); }
}
