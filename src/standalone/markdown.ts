export interface Inline { kind: "text" | "strong" | "em" | "code" | "link"; text: string; target?: string; }
export interface MarkdownBlock { kind: "heading" | "paragraph" | "list" | "quote" | "code"; level?: number; text: string; inline: Inline[]; }
export interface MarkdownPreview { blocks: MarkdownBlock[]; limited: boolean; }
const markdownBody = (source: string): string => source.replace(/^(?:\uFEFF)?---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, "");
function heading(line: string): { text: string; level: number } | null {
  const match = /^(#{1,6})[ \t]+(.+)$/.exec(line.trimEnd());
  if (!match) return null;
  const content = match[2]!; let end = content.length;
  while (content[end - 1] === "#") end--;
  return { level: match[1]!.length, text: end < content.length && /\s/.test(content[end - 1] ?? "") ? content.slice(0, end).trimEnd() : content };
}
export function headingMatches(text: string, target: string): boolean {
  const normalized = text.toLocaleLowerCase(), wanted = target.toLocaleLowerCase();
  return normalized === wanted || normalized.replace(/\s+/g, "-") === wanted;
}
/** Count against the full bounded source, never just the shortened preview. */
export function sourceHeadingCount(source: string, target: string): number {
  let fence = "", count = 0;
  for (const line of markdownBody(source).split(/\r?\n/)) {
    const marker = /^\s{0,3}(`{3,}|~{3,})/.exec(line)?.[1];
    if (fence) { if (marker && marker[0] === fence[0] && marker.length >= fence.length) fence = ""; continue; }
    if (marker) { fence = marker; continue; }
    const title = heading(line);
    if (title && headingMatches(title.text, target) && ++count >= 2) return count;
  }
  return count;
}

/** Parse a small display subset. No HTML is produced and images are never loaded. */
export function markdownPreview(source: string): MarkdownPreview {
  // Frontmatter is available in Original Markdown source, not rendered as prose.
  const body = markdownBody(source);
  const text = body.slice(0, 120000), blocks: MarkdownBlock[] = [];
  let fence = "", code: string[] = [], tokens = 0, work = 0, limited = text.length < body.length;
  const inline = (line: string): Inline[] => {
    const output: Inline[] = []; let end = 0, position = 0;
    // Count failed lookahead too. Malformed delimiters never escape the budget;
    // anything beyond it remains literal and the UI reports the preview limit.
    const available = (): boolean => {
      if (++work > 480000 || tokens >= 5000) { limited = true; return false; }
      return true;
    };
    const until = (start: number, stop: (char: string) => boolean): number => {
      let cursor = start;
      while (cursor < line.length && available() && !stop(line[cursor]!)) cursor++;
      return cursor;
    };
    while (position < line.length && available()) {
      const char = line[position]; let part: Inline | undefined, finish = position;
      if (char === "[" && line[position - 1] !== "!" && line[position - 1] !== "[") {
        const wiki = line[position + 1] === "[", start = position + (wiki ? 2 : 1);
        const close = until(start, value => value === "[" || value === "]");
        if (close > start && line[close] === "]") {
          if (wiki && line[close + 1] === "]") {
            const [target = "", label] = line.slice(start, close).split("|");
            part = { kind: "link", text: label ?? target, target }; finish = close + 2;
          } else if (!wiki && line[close + 1] === "(") {
            const targetStart = close + 2, targetEnd = until(targetStart, value => /[\s()[\]]/.test(value));
            if (targetEnd > targetStart && line[targetEnd] === ")") {
              part = { kind: "link", text: line.slice(start, close), target: line.slice(targetStart, targetEnd) }; finish = targetEnd + 1;
            }
          }
        }
      } else if (char === "`" || char === "*") {
        const strong = char === "*" && line[position + 1] === "*", width = strong ? 2 : 1, start = position + width;
        const close = until(start, value => value === char);
        if (close > start && line[close] === char && (!strong || line[close + 1] === "*")) {
          part = { kind: char === "`" ? "code" : strong ? "strong" : "em", text: line.slice(start, close) }; finish = close + width;
        }
      }
      if (work > 480000) { limited = true; break; }
      if (part) {
        if (position > end) output.push({ kind: "text", text: line.slice(end, position) });
        output.push(part); tokens++; position = finish; end = finish;
      } else position++;
    }
    if (end < line.length) output.push({ kind: "text", text: line.slice(end) });
    return output;
  };
  const push = (kind: MarkdownBlock["kind"], text: string, level?: number): void => {
    blocks.push({ kind, text, ...(level ? { level } : {}), inline: kind === "code" ? [] : inline(text) });
  };
  for (const line of text.split(/\r?\n/)) {
    if (blocks.length >= 1999) { limited = true; break; }
    const marker = /^\s{0,3}(`{3,}|~{3,})/.exec(line)?.[1];
    if (fence) {
      if (marker && marker[0] === fence[0] && marker.length >= fence.length) { push("code", code.join("\n")); code = []; fence = ""; }
      else code.push(line);
    } else if (marker) fence = marker;
    else if (!line.trim()) continue;
    else {
      const title = heading(line), list = /^\s*(?:[-*+] |\d+\. )(.+)$/.exec(line), quote = /^>\s?(.*)$/.exec(line);
      if (title) push("heading", title.text, title.level);
      else if (list) push("list", list[1]!);
      else if (quote) push("quote", quote[1]!);
      else push("paragraph", line);
    }
  }
  if (code.length) push("code", code.join("\n"));
  return { blocks, limited };
}
