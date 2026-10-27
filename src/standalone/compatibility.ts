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
    if (!manifest && Object.values(files).some(value => value !== null)) reasons.push("The Thread plugin looks partly installed. Leave its files and reinstall it in Obsidian.");
    if (manifest && (manifest.id !== "thread" || manifest.version !== "0.4.2" || manifest.isDesktopOnly !== true)) reasons.push("This Thread plugin version cannot share saving safely. Install Thread plugin 0.4.2 before allowing saving here.");
    let draft = freshProfile().preferences;
    if (files["data.json"]) {
      const raw = data(files["data.json"]);
      if (raw.schemaVersion !== 1) reasons.push("The Thread plugin's settings are from an unknown version, so Thread does not change or copy them.");
      else { const settings = loadSettings(raw); draft = preferences({ endpoint: settings.endpoint, model: settings.model, embeddingModel: settings.embeddingModel, roles: settings.roles }); }
    }
    if (files["changes.json"]) {
      const raw = data(files["changes.json"]);
      // Validate versions, original hashes and recovery relationships using the shared loader.
      const manager = new ChangeManager({} as ChangePort); await manager.load(raw);
      if (manager.state.pending || manager.state.recovery) reasons.push("The Thread plugin has unfinished changes. Finish them in Obsidian first; nothing was reset.");
    }
    if (files["project-imports.json"]) {
      const state = loadProjectImports(data(files["project-imports.json"]));
      if (state.receipts.some(receipt => receipt.status === "pending")) reasons.push("The Thread plugin has an unfinished project import. Finish it in Obsidian first.");
    }
    const history = JSON.stringify({ schemaVersion: 1, changes: files["changes.json"], projectImports: files["project-imports.json"] });
    return { installed: !!manifest, version: typeof manifest?.version === "string" ? manifest.version : "", compatible: reasons.length === 0, reasons, preferences: draft, history, hash: hashText(JSON.stringify(files)) };
  } catch { throw new DesktopError("The Thread plugin's settings or history could not be understood. Leave the files as they are and open them in Obsidian; saving stays off here."); }
}
