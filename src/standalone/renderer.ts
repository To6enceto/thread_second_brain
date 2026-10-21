import type { DesktopBridge, DesktopResult, NoteList, VaultInfo } from "./contracts.ts";
import { ReaderRequests } from "./reader-requests.ts";
declare global { interface Window { threadDesktop: DesktopBridge; } }
const bridge = window.threadDesktop;
function element<T extends HTMLElement>(id: string): T { return document.getElementById(id) as T; }
const choose = element<HTMLButtonElement>("choose"), refresh = element<HTMLButtonElement>("refresh");
const grant = element<HTMLButtonElement>("grant"), close = element<HTMLButtonElement>("close");
const roots = element<HTMLTextAreaElement>("roots"), exclusions = element<HTMLTextAreaElement>("exclusions");
const filter = element<HTMLInputElement>("filter"), status = element("status");
let vault: VaultInfo | null = null, listing: NoteList | null = null;
const requests = new ReaderRequests();
const lines = (text: string): string[] => text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
function announce(message: string): void { status.textContent = message; }
function value<T>(result: DesktopResult<T>): T {
  if (!result.ok) throw new Error(result.message);
  return result.value;
}
function report(error: unknown): void { announce(error instanceof Error ? error.message : "Thread could not finish. Try again."); }
function clearReader(): void {
  element("note-title").textContent = "Open a source";
  element("note-meta").textContent = "Select a permitted note to read its original Markdown. Thread makes no changes to it.";
  element("note-content").textContent = "";
}
function clearContent(invalidate = true): void {
  if (invalidate) requests.invalidate();
  listing = null; clearReader(); element("notes").replaceChildren();
  filter.value = ""; filter.disabled = true;
  element("coverage").textContent = "No source content is loaded.";
  element("list-empty").textContent = "Approve read access to list Markdown notes.";
}
function scopePreview(): void {
  const allowed = lines(roots.value), excluded = lines(exclusions.value);
  element("scope-preview").textContent = `Read roots: ${allowed.length ? allowed.join(", ") : "none (no notes)"}. Exclusions: ${excluded.length ? excluded.join(", ") : "none"}. This preview grants nothing.`;
}
async function openNote(path: string): Promise<void> {
  if (!vault) return;
  const ticket = requests.beginRead();
  if (ticket === null) return;
  clearReader(); announce("Reading the selected source...");
  try {
    const note = value(await bridge.readNote(path, vault.revision));
    if (!requests.current(ticket) || !vault || note.revision !== vault.revision) return;
    element("note-title").textContent = path.split("/").at(-1) ?? path;
    element("note-meta").textContent = `${path} · Snapshot of source text. Reopen or Refresh to see external edits. Modified ${new Date(note.modifiedAt).toLocaleString()}; not an event date.`;
    element("note-content").textContent = note.text;
    announce("Source loaded. No files were changed.");
    element("note-content").focus();
  } catch (error) { if (requests.current(ticket)) report(error); }
}
function renderNotes(): void {
  const list = element("notes"); list.replaceChildren();
  const query = filter.value.toLocaleLowerCase();
  const paths = listing?.paths.filter(path => path.toLocaleLowerCase().includes(query)) ?? [];
  for (const path of paths) {
    const row = document.createElement("li"), button = document.createElement("button");
    button.className = "thread-note";
    const title = document.createElement("span"), detail = document.createElement("span");
    title.textContent = path.split("/").at(-1)?.replace(/\.md$/i, "") ?? path;
    detail.textContent = path; detail.className = "thread-path";
    button.append(title, detail); button.addEventListener("click", () => { void openNote(path); });
    row.append(button); list.append(row);
  }
  element("list-empty").textContent = paths.length ? "" : query ? "No listed paths match this filter." : "No Markdown notes in the current read scope.";
}
async function loadNotes(): Promise<void> {
  const ticket = requests.beginRead();
  if (ticket === null) return;
  clearContent(false);
  if (!vault) return;
  refresh.disabled = true; announce("Listing permitted Markdown notes...");
  try {
    const result = value(await bridge.listNotes(vault.revision));
    if (!requests.current(ticket) || !vault || result.revision !== vault.revision) return;
    listing = result; filter.disabled = false; renderNotes();
    element("coverage").textContent = `${result.paths.length} notes listed. ${result.omitted} encountered entries unavailable or unsupported. ${result.limited ? "A traversal or result limit was reached; this list is incomplete." : "Within the approved roots and scan limits."} Hidden/excluded entries are not shown. This filter searches listed paths only.`;
    announce(result.limited ? "Note list ready with coverage limits. Narrow the read roots to inspect other notes." : "Note list ready. Choose a source to read.");
  } catch (error) { if (requests.current(ticket)) report(error); }
  finally { if (requests.current(ticket)) refresh.disabled = !vault; }
}
choose.addEventListener("click", () => { void (async () => {
  choose.disabled = true;
  try {
    const selected = value(await bridge.selectVault());
    if (!selected) { announce("Folder selection canceled. Existing access is unchanged."); return; }
    clearContent(); vault = selected;
    roots.value = ""; exclusions.value = ""; scopePreview();
    element("vault-details").hidden = false;
    element("vault-name").textContent = selected.name; element("vault-path").textContent = selected.path;
    refresh.disabled = false;
    announce("Vault selected. No read access granted. Review the allowed paths and exclusions, then approve.");
    roots.focus();
  } catch (error) { report(error); } finally { choose.disabled = false; }
})(); });
grant.addEventListener("click", () => { void (async () => {
  if (!vault) return;
  const ticket = requests.beginScope();
  if (ticket === null) return;
  clearContent(false); grant.disabled = true; refresh.disabled = true;
  announce("Applying the approved read access...");
  let approved = false;
  try {
    const selected = value(await bridge.grantScope({ roots: lines(roots.value), excluded: lines(exclusions.value) }, vault.revision));
    if (!requests.current(ticket)) return;
    vault = selected; approved = true;
  } catch (error) { if (requests.current(ticket)) report(error); }
  finally { requests.finishScope(ticket); grant.disabled = false; refresh.disabled = !vault; }
  if (approved && requests.current(ticket)) await loadNotes();
})(); });
close.addEventListener("click", () => { void (async () => {
  clearContent(); vault = null; refresh.disabled = true; element("vault-details").hidden = true;
  roots.value = ""; exclusions.value = ""; element("vault-name").textContent = ""; element("vault-path").textContent = "";
  try { value(await bridge.closeVault()); announce("Vault closed. All session read access is cleared."); choose.focus(); }
  catch (error) { report(error); }
})(); });
roots.setAttribute("aria-describedby", "roots-help");
roots.addEventListener("input", scopePreview); exclusions.addEventListener("input", scopePreview);
filter.addEventListener("input", renderNotes);
refresh.addEventListener("click", () => { void loadNotes(); });
element<HTMLSelectElement>("theme").addEventListener("change", event => {
  document.body.dataset.theme = (event.target as HTMLSelectElement).value;
});
