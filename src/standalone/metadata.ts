import { parseDocument } from "yaml";
import { DesktopError } from "./security.ts";
import { validateAction } from "../vault/action-record.ts";
import { validateCollection } from "../vault/collection-record.ts";

export function parseMetadata(yaml: string): unknown {
  if (yaml.length > 1048576) throw new DesktopError("Metadata exceeds the 1 MiB action-note limit.");
  const doc = parseDocument(yaml, { version: "1.2", schema: "core", stringKeys: true, uniqueKeys: true, prettyErrors: false });
  if (doc.errors.length || doc.warnings.length) throw new DesktopError("Metadata contains unsupported or invalid YAML.");
  let data: unknown;
  try { data = doc.toJS({ maxAliasCount: 0 }); }
  catch { throw new DesktopError("Metadata aliases are unsupported."); }
  // Bounded shared records can outgrow ordinary metadata without widening all notes.
  if (yaml.length > 65536) {
    const action = data as Record<string, unknown> | null;
    if (action?.type === "collection" && action.thread_collection_version === "1" && typeof action.thread_collection_record === "string") {
      try {
        const record = validateCollection(JSON.parse(action.thread_collection_record));
        if (Object.keys(action).some(key => !["id", "type", "title", "created", "project", "thread_collection_version", "thread_collection_record"].includes(key)) || action.id !== record.id || action.title !== record.title || action.created !== record.createdAt.slice(0, 10) || action.project !== (record.scope === "project" ? record.projectIdentity : undefined)) throw Error("Identity or fields changed");
        return data;
      } catch { throw new DesktopError("Oversized metadata is not a supported bounded collection. Preserve the original."); }
    }
    if (!action || typeof action !== "object" || Array.isArray(action) || action.type !== "action" || action.thread_action_version !== "1" || typeof action.thread_action_record !== "string") throw new DesktopError("Ordinary metadata exceeds the 64 KiB limit.");
    try { validateAction(JSON.parse(action.thread_action_record)); }
    catch { throw new DesktopError("Oversized metadata is not a supported bounded action history. Preserve the original."); }
  }
  return data;
}

export function metadata(text: string): Record<string, unknown> {
  const source = text.replace(/^\uFEFF/, "");
  if (!source.startsWith("---\n") && !source.startsWith("---\r\n")) return {};
  const header = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(source);
  if (!header) throw new DesktopError("Metadata has no closing delimiter.");
  const data = parseMetadata(header[1]!);
  if (data === null) return {};
  if (typeof data !== "object" || Array.isArray(data)) throw new DesktopError("Metadata must be a mapping.");
  return data as Record<string, unknown>;
}
