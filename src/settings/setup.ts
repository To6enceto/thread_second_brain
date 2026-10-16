import { type ThreadSettings } from "./settings.ts";
import { vaultPath, mayRead } from "../vault/scope.ts";
import { frontmatter, localDay, writablePath, type NewNote } from "../vault/workspace.ts";

export function pendingScope(project: string, allowed: string, excluded: string, current: Pick<ThreadSettings,"allowedPaths">) {
  const selectedProject = project.trim() ? vaultPath(project) : "";
  const parse = (text: string) => [...new Set(text.split(/\r?\n/).filter(line=>line.trim()).map(vaultPath))];
  const allowedPaths = [...new Set([...parse(allowed), ...(selectedProject ? [selectedProject] : [])])], excludedPaths = parse(excluded);
  return { selectedProject, allowedPaths, excludedPaths, newRoots: allowedPaths.filter(path=>!current.allowedPaths.includes(path)),
    projectReadable: Boolean(selectedProject && mayRead(selectedProject, {allowedPaths,excludedPaths})) };
}
export function scopePreviewText(scope: ReturnType<typeof pendingScope>): string {
  return `Read roots after Save: ${scope.allowedPaths.join(", ") || "none"}. Newly added roots: ${scope.newRoots.join(", ") || "none"}. Exclusions (take precedence): ${scope.excludedPaths.join(", ") || "none"}. ${scope.selectedProject && !scope.projectReadable ? "The selected project is excluded; change the draft scope to use it." : ""} Merely previewing does not grant access. Saving a selected project explicitly adds that folder to read roots.`;
}
export function sampleNote(projects: string, exclusions: string[], id: string = crypto.randomUUID()): NewNote {
  if (!projects) throw new Error("Save a Projects folder mapping before previewing a sample.");
  if (!/^[a-zA-Z0-9-]{1,100}$/.test(id)) throw new Error("Invalid sample identity.");
  const path = writablePath(`${vaultPath(projects)}/Thread Sample ${id}/Overview.md`, [projects], exclusions.map(vaultPath));
  return { path, content: frontmatter({id,type:"project",status:"active",created:localDay(),thread_sample:"synthetic"})
    +"# Thread synthetic sample\n\nThis is invented example content, not your project history.\n\n## Objective\n\nCompare a free local research workflow.\n\n## Constraints\n\nThe sample hosting budget is 20 euros. Live voice is postponed to stay within that budget.\n\n## Open questions\n\n- Which downloaded local model gives useful cited answers?\n" };
}
