import { ChangeManager, type ChangePort, type ChangeState } from "../vault/changes.ts";
import { ProfileFile } from "./profile-file.ts";
import { DesktopError } from "./security.ts";

export const emptyChanges = (): ChangeState => ({ schemaVersion: 1, pending: null, history: [], recovery: null });
export async function changeState(input: unknown): Promise<ChangeState> {
  if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).sort().join(",") !== "history,pending,recovery,schemaVersion") throw new DesktopError("Thread's change history is from an unknown version. Keep it as it is and restore a known backup.");
  const data = input as Record<string, unknown>;
  for (const [entry, key, values] of [[data.pending, "status", ["pending", "stale"]], [data.recovery, "action", ["apply", "undo"]]] as const) {
    if (entry !== null && (!entry || typeof entry !== "object" || Array.isArray(entry) || typeof (entry as Record<string, unknown>)[key] !== "string" || !values.includes((entry as Record<string, unknown>)[key] as never))) throw new DesktopError("Thread's change history is not valid. Keep it as it is.");
  }
  const manager = new ChangeManager({} as ChangePort);
  await manager.load(input);
  return structuredClone(manager.state);
}

/** Separate journal; the plugin's changes.json is never shared or rewritten. */
export class ChangeJournal extends ProfileFile<ChangeState> {
  constructor(directory: string, identity: string) { super(directory, `changes-${identity}.json`, emptyChanges(), changeState, 24 * 1048576); }
}
