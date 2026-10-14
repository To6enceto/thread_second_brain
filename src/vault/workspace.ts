import { isWithin, vaultPath } from "./scope.ts";
import type { FolderRoles } from "../settings/settings.ts";

export interface NewNote { path: string; content: string; }
export function localDay(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function noteName(input: string): string {
  const name = input.trim();
  if (!name || name.length > 100 || /[\\/:*?"<>|\[\]#^\x00-\x1f]/.test(name) || name.startsWith(".")) {
    throw new Error("Use a note name without path separators or special link characters (up to 100 characters).");
  }
  return name;
}
export function writablePath(path: string, roots: string[], exclusions: string[]): string {
  const normalized = vaultPath(path);
  if (normalized !== path || !path.endsWith(".md") || !roots.filter(Boolean).some((root) => isWithin(path, root))
    || exclusions.some((root) => isWithin(path, root))) throw new Error("Destination must be inside a mapped folder and outside exclusions.");
  return normalized;
}
export function frontmatter(fields: Record<string, string>): string {
  return `---\n${Object.entries(fields).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join("\n")}\n---\n\n`;
}
export function starterNotes(roles: FolderRoles, name: string, exclusions: string[], id: string = crypto.randomUUID(), day = localDay()): NewNote[] {
  if (!roles.projects || !roles.templates) throw new Error("Save Projects and Templates folder mappings first.");
  const project = `${roles.projects}/${noteName(name)}`;
  const notes: NewNote[] = [
    { path: `${project}/Overview.md`, content: frontmatter({ id, type: "project", status: "active", created: day, updated: day }) + `# ${name.trim()}\n\n## Objective\n\nDescribe the outcome.\n\n## Constraints\n\n## Project notes\n\n[[Questions]]\n` },
    { path: `${project}/Questions.md`, content: frontmatter({ id: crypto.randomUUID(), type: "questions", project: id, created: day }) + "# Open questions\n\n- What should we learn next?\n" },
    { path: `${roles.templates}/Thread Project.md`, content: "# Project\n\n## Objective\n\n## Constraints\n\n## Open questions\n" },
    { path: `${roles.templates}/Thread Decision.md`, content: "# Decision\n\n## Question\n\n## Choice\n\n## Alternatives\n\n## Reasoning\n\n## Evidence\n\n## Revisit when\n" },
    { path: `${roles.templates}/Thread Session.md`, content: "# Session\n\n## Progress\n\n## Decisions\n\n## Open questions\n\n## Suggested next step\n" }
  ];
  for (const note of notes) writablePath(note.path, Object.values(roles), exclusions);
  return notes;
}
export function rejectCollisions(notes: NewNote[], exists: (path: string) => boolean): void {
  const seen = new Set<string>();
  for (const note of notes) {
    if (seen.has(note.path) || exists(note.path)) throw new Error(`Already exists: ${note.path}. Choose another name or map existing notes.`);
    seen.add(note.path);
  }
}
