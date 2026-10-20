import {pdfPaths} from "../pdf/scope.ts";
import { indexProfile, type IndexProfile } from "./index-budget.ts";
import { vaultPath, type ReadScope } from "../vault/scope.ts";

export const roleNames = ["projects", "inbox", "sources", "knowledge", "reviews", "templates"] as const;
export type FolderRoles = Record<typeof roleNames[number], string>;
export function loadRoles(value: unknown): FolderRoles {
  const data = object(value);
  return Object.fromEntries(roleNames.map((name) => {
    try { return [name, typeof data[name] === "string" ? vaultPath(data[name]) : ""]; }
    catch { return [name, ""]; }
  })) as FolderRoles;
}

export interface ThreadSettings extends ReadScope {
  schemaVersion: 1;
  pdfPaths:string[];
  endpoint: string;
  model: string;
  semanticSearch: boolean;
  indexProfile: IndexProfile;
  embeddingModel: string;
  selectedProject: string;
  timeoutMs: number;
  roles: FolderRoles;
}

export function localEndpoint(input: string): string {
  let url: URL;
  try { url = new URL(input.trim()); } catch { throw new Error("Enter a valid local Ollama URL."); }
  if (url.protocol !== "http:" || !["127.0.0.1", "[::1]", "localhost"].includes(url.hostname)
    || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error("Use an HTTP loopback URL, such as http://127.0.0.1:11434, without a path or credentials.");
  }
  return url.origin;
}

export function defaultSettings(): ThreadSettings {
  return {
    schemaVersion: 1, endpoint: "http://127.0.0.1:11434", model: "", semanticSearch: false, embeddingModel: "",
    allowedPaths: [], excludedPaths: [], pdfPaths:[], selectedProject: "", timeoutMs: 180000, indexProfile: "standard",
    roles: loadRoles({})
  };
}

export function object(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
}

export function validPaths(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string").flatMap((item) => {
    try { return [vaultPath(item)]; } catch { return []; }
  }))];
}

export function loadSettings(value: unknown): ThreadSettings {
  const data = object(value);
  const settings = defaultSettings();
  settings.roles = loadRoles(data.roles);
  try { if (typeof data.endpoint === "string") settings.endpoint = localEndpoint(data.endpoint); } catch { /* Invalid endpoints reset to loopback. */ }
  if (typeof data.model === "string") settings.model = data.model.trim();
  settings.semanticSearch = data.semanticSearch === true;
  settings.indexProfile = indexProfile(data.indexProfile);
  if (typeof data.embeddingModel === "string") settings.embeddingModel = data.embeddingModel.trim();
  settings.allowedPaths = validPaths(data.allowedPaths);
  settings.pdfPaths=pdfPaths(data.pdfPaths);
  settings.excludedPaths = validPaths(data.excludedPaths);
  if (data.excludedPaths !== undefined && (!Array.isArray(data.excludedPaths)
    || data.excludedPaths.some((path) => {
      try { if (typeof path !== "string") return true; vaultPath(path); return false; } catch { return true; }
    }))) {settings.allowedPaths = [];settings.pdfPaths=[];}
  if (typeof data.selectedProject === "string") {
    try { settings.selectedProject = vaultPath(data.selectedProject); } catch { /* Empty selection grants no access. */ }
  }
  if (typeof data.timeoutMs === "number" && Number.isInteger(data.timeoutMs)
    && data.timeoutMs >= 1000 && data.timeoutMs <= 600000) settings.timeoutMs = data.timeoutMs;
  return settings;
}
