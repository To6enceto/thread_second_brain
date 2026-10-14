export interface ReadScope {
  allowedPaths: string[];
  excludedPaths: string[];
}

export function vaultPath(value: string): string {
  const path = value.trim().replace(/\\/g, "/").replace(/\/+$/, "");
  if (!path || path.startsWith("/") || /^[a-z]:/i.test(path) || /[\u0000-\u001f]/.test(path)) {
    throw new Error("Choose a vault-relative folder or note path.");
  }
  const segments = path.split("/");
  if (segments.some((part) => !part || part.startsWith("."))) {
    throw new Error("Hidden paths and path traversal are outside Thread's scope.");
  }
  return path;
}

export function isWithin(path: string, folder: string): boolean {
  return path === folder || path.startsWith(`${folder}/`);
}

export function mayRead(path: string, scope: ReadScope): boolean {
  try {
    const normalized = vaultPath(path);
    if (normalized !== path) return false;
    return scope.allowedPaths.some((folder) => isWithin(normalized, vaultPath(folder)))
      && !scope.excludedPaths.some((folder) => isWithin(normalized, vaultPath(folder)));
  } catch {
    return false;
  }
}

export function readableText(path: string, scope: ReadScope): boolean {
  return /\.(md|txt)$/i.test(path) && mayRead(path, scope);
}

export function affectsProject(path: string, project: string, scope: ReadScope, folder = false): boolean {
  if (!project) return false;
  if (folder) return !path || path === "/" || isWithin(path, project) || isWithin(project, path);
  return isWithin(path, project) && readableText(path, scope);
}

export async function contentHash(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
