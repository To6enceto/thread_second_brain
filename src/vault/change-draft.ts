export interface DiffLine { kind: "same" | "removed" | "added"; text: string; }
export interface LineDiff { lines: DiffLine[]; minimal: boolean; }
function lines(text: string): string[] { return text.match(/[^\n]*\n|[^\n]+$/g) ?? []; }
/** Preserve line endings; fall back to a correct bulk replacement for large edits. */
export function lineDiff(before: string, after: string): LineDiff {
  const a = lines(before), b = lines(after); let prefix = 0, suffix = 0;
  while (prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix++;
  while (suffix < a.length - prefix && suffix < b.length - prefix && a[a.length - suffix - 1] === b[b.length - suffix - 1]) suffix++;
  const old = a.slice(prefix, a.length - suffix), next = b.slice(prefix, b.length - suffix);
  const result: DiffLine[] = a.slice(0, prefix).map(text => ({ kind: "same", text }));
  const minimal = old.length * next.length <= 250000 && old.length + next.length <= 2000;
  if (!minimal) {
    for (const text of old) result.push({kind:"removed",text});
    for (const text of next) result.push({kind:"added",text});
  } else {
    const width = next.length + 1, table = new Uint32Array((old.length + 1) * width);
    for (let i = old.length - 1; i >= 0; i--) for (let j = next.length - 1; j >= 0; j--) table[i * width + j] = old[i] === next[j]
      ? 1 + table[(i + 1) * width + j + 1]! : Math.max(table[(i + 1) * width + j]!, table[i * width + j + 1]!);
    let i = 0, j = 0;
    while (i < old.length || j < next.length) {
      if (i < old.length && j < next.length && old[i] === next[j]) { result.push({ kind: "same", text: old[i++]! }); j++; }
      else if (i < old.length && (j === next.length || table[(i + 1) * width + j]! >= table[i * width + j + 1]!)) result.push({ kind: "removed", text: old[i++]! });
      else result.push({ kind: "added", text: next[j++]! });
    }
  }
  for (const text of a.slice(a.length - suffix)) result.push({kind:"same",text});
  return { lines: result, minimal };
}
export function editableBody(text: string): { prefix: string; body: string } {
  const prefix = /^(?:\uFEFF)?---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.exec(text)?.[0] ?? (text.startsWith("\uFEFF") ? "\uFEFF" : "");
  return { prefix, body: text.slice(prefix.length) };
}
const protectedMarkers=/^<!-- \/?thread:(?:output|question-evidence|review-evidence)\b[^\n]*(?:\n|$)/gm;
function markers(text: string): string[] { return text.match(protectedMarkers) ?? []; }
export function draftContent(proposed: string, body: string): string {
  const { prefix } = editableBody(proposed);
  let content = prefix + body;
  const originals = markers(proposed), edited = markers(content);
  const withoutEnding = (line: string) => line.replace(/\r?\n$/, "");
  const fail = () => { throw new Error("Keep note properties and Thread provenance marker lines unchanged. Edit only the proposed body text."); };
  if (editableBody(content).prefix !== prefix || JSON.stringify(edited.map(withoutEnding)) !== JSON.stringify(originals.map(withoutEnding))) fail();
  // Native textareas normalize CRLF. Restore protected marker bytes after edits.
  let position = 0;
  content = content.replace(protectedMarkers, () => originals[position++]!);
  if (JSON.stringify(markers(content)) !== JSON.stringify(originals)) fail();
  return content;
}
