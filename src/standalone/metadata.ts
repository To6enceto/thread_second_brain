import { parseDocument } from "yaml";
import { DesktopError } from "./security.ts";

export function parseMetadata(yaml: string): unknown {
  if (yaml.length > 65536) throw new DesktopError("Metadata exceeds the 64 KiB limit.");
  const doc = parseDocument(yaml, { version: "1.2", schema: "core", stringKeys: true, uniqueKeys: true, prettyErrors: false });
  if (doc.errors.length || doc.warnings.length) throw new DesktopError("Metadata contains unsupported or invalid YAML.");
  try { return doc.toJS({ maxAliasCount: 0 }); }
  catch { throw new DesktopError("Metadata aliases are unsupported."); }
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
