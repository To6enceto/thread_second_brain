import type { NoteList } from "./contracts.ts";
import { hashText } from "./profile.ts";

/** Detect newly present/missing notes and identity changes beyond existing source hashes. */
export function catalogFingerprint(listing: NoteList, targets: string[]): string {
  const ignored = new Set(targets);
  return hashText(JSON.stringify([listing.paths.filter(path => !ignored.has(path)).map(path => [path, listing.files[path]!.stamp]), listing.omitted, listing.omittedMarkdown, listing.identityIncomplete, listing.limited]));
}
