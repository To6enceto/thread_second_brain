import { relativePath } from "./security.ts";

export interface LinkResolution { paths: string[]; heading: string; message: string; }
export function resolveLink(from: string, input: string, paths: readonly string[]): LinkResolution {
  const denied = (message: string): LinkResolution => ({ paths: [], heading: "", message });
  if (typeof input !== "string" || input.length > 1000) return denied("This link is too long.");
  let target: string;
  try { target = decodeURIComponent(input.trim()); } catch { return denied("This link has invalid encoding."); }
  if (/^[a-z][a-z0-9+.-]*:|^\/|[\\\u0000-\u001f]/i.test(target)) return denied("External, absolute and unsafe links are not opened.");
  const [file = "", ...anchors] = target.split("#"), heading = anchors.join("#");
  if (heading.startsWith("^")) return denied("Block anchors are not supported; open the source directly.");
  if (!file) return paths.includes(from) ? { paths: [from], heading, message: "" } : denied("The source is unavailable in the current scope.");
  try { relativePath(file); } catch { return denied("Traversal and hidden links are not opened."); }
  const name = /\.md$/i.test(file) ? file : `${file}.md`;
  const parent = from.includes("/") ? from.slice(0, from.lastIndexOf("/") + 1) : "";
  const exact = [...new Set([`${parent}${name}`, name])].filter(path => paths.includes(path));
  const matches = exact.length ? exact : file.includes("/") ? [] : paths.filter(path => path.split("/").at(-1) === name);
  return { paths: matches, heading, message: matches.length > 1 ? "Ambiguous link. Choose the intended permitted note." : matches.length ? "" : "No matching permitted Markdown note in the bounded list." };
}
