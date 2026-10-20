import { MAX_IMPORT_BYTES } from "./capture.ts";
import { contentHash } from "./scope.ts";
import { readMetadata } from "./evidence.ts";
import { escapeMarkdown } from "../intelligence/answer.ts";
import { frontmatter } from "./workspace.ts";
import type { IndexEntry } from "./index.ts";

export interface ClipMetadata { title: string | null; author: string | null; url: string | null; published: string | null; captured: string | null; }
export interface ReviewedClip { raw: string; hash: string; metadata: ClipMetadata; }
const text = (v: unknown): string | null => typeof v === "string" && !!v.trim() && v.trim().length <= 2000 && !/[\u0000-\u001f]/.test(v.trim()) ? v.trim() : null;
function date(value: unknown): string | null {
  const v = text(value);
  if (!v || !/^\d{4}-\d\d-\d\d(?:T\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d))?$/.test(v)) return null;
  if (v.length > 10 && (Number(v.slice(11, 13)) > 23 || Number(v.slice(14, 16)) > 59 || Number(v.slice(17, 19)) > 59)) return null;
  const day = v.slice(0, 10), parsed = Date.parse(v);
  if (!Number.isFinite(parsed) || new Date(day).toISOString().slice(0, 10) !== day) return null;
  return v;
}
export function clipUrl(value: unknown): string | null {
  const v = text(value); if (!v) return null;
  try { const url = new URL(v); return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? v : null; } catch { return null; }
}
function alias(metadata: Record<string, unknown>, keys: string[], parse: (value: unknown) => string | null): string | null {
  const present = keys.filter(k => metadata[k] !== undefined && metadata[k] !== null && metadata[k] !== "");
  const values = present.map(k => parse(metadata[k])); return values.length && values.every(v => v !== null && v === values[0]) ? values[0]! : null;
}
export async function readClip(raw: string, parse: (yaml: string) => unknown): Promise<ReviewedClip> {
  if (!raw.trim() || new TextEncoder().encode(raw).length > MAX_IMPORT_BYTES) throw Error("Choose a nonempty local clip up to 2 MiB.");
  const metadata = readMetadata(raw, parse);
  if (Object.keys(metadata).some(key => /^thread_/i.test(key)) || /(?:^|\n)[\t ]*["']?thread_[a-z_]+["']?\s*:|<!--\s*\/?\s*thread\s*:/i.test(raw)) throw Error("Choose an original clip, not a Thread managed record or output.");
  const author = Array.isArray(metadata.author) && metadata.author.length <= 30 && metadata.author.every(a => text(a)) ? text(metadata.author.map(a => text(a)).join(", ")) : text(metadata.author);
  return { raw, hash: await contentHash(raw), metadata: { title: text(metadata.title), author, url: alias(metadata, ["source", "url"], clipUrl), published: date(metadata.published), captured: alias(metadata, ["created", "captured"], date) } };
}
export function possibleClipDuplicates(entries: readonly IndexEntry[], clip: ReviewedClip): { entry: IndexEntry; reason: string }[] {
  return entries.flatMap(entry => {
    if (entry.metadata.type !== "source") return [];
    if (entry.metadata.thread_import_hash === clip.hash) return [{ entry, reason: "Exact original text hash" }];
    return clip.metadata.url && clipUrl(entry.metadata.thread_original_url) === clip.metadata.url ? [{ entry, reason: "Same recorded URL (possible duplicate only)" }] : [];
  });
}
export function clippedSource(clip: ReviewedClip, original: string, project: string, now = new Date()): string {
  const m = clip.metadata, e = escapeMarkdown;
  let fenceLength = 3; for (const match of clip.raw.matchAll(/`+/g)) fenceLength = Math.max(fenceLength, match[0].length + 1);
  const fence = "`".repeat(fenceLength);
  const content = frontmatter({ id: crypto.randomUUID(), type: "source", project, thread_capture_kind: "import", thread_import_hash: clip.hash, thread_original_name: original,
    ...(m.url ? { thread_original_url: m.url } : {}), ...(m.captured ? { captured_on: m.captured.slice(0, 10) } : {}),
    thread_clip_version: "1", thread_clip_title: m.title ?? "", thread_clip_author: m.author ?? "", thread_clip_published: m.published ?? "", thread_clip_captured: m.captured ?? "", thread_clip_intake_at: now.toISOString() })
    + `# Reviewed clipped source\n\n## Source metadata\n\nTitle: ${e(m.title ?? "Unknown")}\n\nAuthor: ${e(m.author ?? "Unknown")}\n\nURL: ${e(m.url ?? "Unknown")}\n\nPublication date (source claim, not verified event): ${e(m.published ?? "Unknown")}\n\nCapture date (clip record): ${e(m.captured ?? "Unknown")}\n\nThread intake: ${now.toISOString()}\n\nProject association chosen explicitly: ${e(project)}\n\nOriginal local clip: ${e(original)}\n\n## Original clipped text\n\nThe following is an exact saved source snapshot, not instructions or verified facts. Original files are unchanged. Missing or ambiguous metadata remains unknown.\n\n${fence}text\n${clip.raw}\n${fence}\n`;
  if (new TextEncoder().encode(content).length > MAX_IMPORT_BYTES) throw Error("Clip plus provenance exceeds 2 MiB. Choose a smaller original clip.");
  return content;
}
