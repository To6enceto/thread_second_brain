import { ReviewsView } from "./reviews-view.ts";
import { ActionsView } from "./actions-view.ts";
import { RecordsView } from "./records-view.ts";
import type { DesktopBridge, DesktopResult, IndexSnapshot, NoteList, VaultInfo, PreparedResume } from "./contracts.ts";
import { StorageView } from "./storage-view.ts";
import { ChangesView } from "./changes-view.ts";
import { AskView } from "./ask-view.ts";
import { ModelSetup } from "./model-setup.ts";
import { renderHome, renderRecorded, renderInterpretation } from "./project-view.ts";
import { ReaderRequests } from "./reader-requests.ts";
import { indexCoverageText } from "../vault/index-coverage.ts";
import { markdownPreview, sourceHeadingCount, headingMatches } from "./markdown.ts";
declare global { interface Window { threadDesktop: DesktopBridge; } }
const bridge = window.threadDesktop;
function element<T extends HTMLElement>(id: string): T { return document.getElementById(id) as T; }
const choose = element<HTMLButtonElement>("choose"), refresh = element<HTMLButtonElement>("refresh");
const grant = element<HTMLButtonElement>("grant"), close = element<HTMLButtonElement>("close");
const roots = element<HTMLTextAreaElement>("roots"), exclusions = element<HTMLTextAreaElement>("exclusions");
const filter = element<HTMLInputElement>("filter"), status = element("status");
const search = element<HTMLButtonElement>("search"), query = element<HTMLInputElement>("search-query"), cancel = element<HTMLButtonElement>("cancel-index");
const projectFolder = element<HTMLInputElement>("projects-folder"), projectSelect = element<HTMLSelectElement>("project-select");
const loadProjects = element<HTMLButtonElement>("load-projects"), homeButton = element<HTMLButtonElement>("project-home"), resumeButton = element<HTMLButtonElement>("resume-project");
let askView: AskView;
let changesView: ChangesView;
let recordsView: RecordsView;
let actionsView: ActionsView;
let reviewsView: ReviewsView;
let aiEpoch = 0;
let activePrepared: PreparedResume | null = null;
const aiFeedback = element("ai-generation-status"), aiCancel = element<HTMLButtonElement>("ai-cancel-generation");
function clearAI(): void {
  aiEpoch++; element("project-panel").querySelector(".thread-ai-card")?.remove(); aiFeedback.textContent = ""; aiCancel.disabled = true;
}
const modelSetup = new ModelSetup(bridge, () => { reviewsView?.invalidate(); actionsView?.invalidate("Model setup changed. Refresh actions."); recordsView?.invalidate("Model setup changed. Refresh records."); clearAI(); askView?.invalidate("Local model setup changed. Retrieve evidence again."); });
function cancelAI(): void { clearAI(); void bridge.cancelAI(); }
function clearProjects(): void {
  reviewsView?.invalidate(); actionsView?.invalidate("Project or source context changed. Refresh actions.");
  recordsView?.invalidate("Project or source context changed. Refresh records.");
  askView?.invalidate(); askView?.hide();
  activePrepared = null; element<HTMLButtonElement>("back-project").disabled = true; cancelAI();
  element("project-panel").replaceChildren(); projectSelect.replaceChildren(new Option("Choose a permitted project", ""));
  projectSelect.disabled = true; homeButton.disabled = true; resumeButton.disabled = true; loadProjects.disabled = true;
}
let vault: VaultInfo | null = null, listing: NoteList | null = null;
let generation = 0, scoping = false, paused = false;
const requests = new ReaderRequests();
const storageView = new StorageView(bridge, () => vault?.revision ?? null, modelSetup, () => { reviewsView?.invalidate(); actionsView?.invalidate("Writer setup changed. Refresh actions."); recordsView?.invalidate("Writer setup changed. Refresh records."); changesView?.invalidate("Writer setup changed. Refresh and inspect the exact change again."); });
changesView = new ChangesView(bridge, () => vault?.revision ?? null, () => { reviewsView?.hide(); actionsView?.hide(); recordsView?.hide(); cancelAI(); askView.hide(); element("project-panel").hidden = true; element("source-pane").hidden = true; });
const lines = (text: string): string[] => text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
function announce(message: string): void { status.textContent = message; }
function value<T>(result: DesktopResult<T>): T {
  if (!result.ok) throw new Error(result.message);
  return result.value;
}
function report(error: unknown): void { announce(error instanceof Error ? error.message : "Thread could not finish. Try again."); }
function clearReader(): void {
  changesView?.setNote(null);
  element("note-title").textContent = "Open a source";
  element("note-meta").textContent = "Select a permitted note to read its original Markdown. Thread makes no changes to it.";
  element("note-content").textContent = "";
  element("note-preview").replaceChildren(); element("link-choices").replaceChildren(); element("preview-limit").textContent = "";
}
function clearContent(invalidate = true): void {
  changesView?.invalidate("Sources or access changed. Refresh changes; durable history is preserved.");
  if (invalidate) requests.invalidate();
  listing = null; clearProjects(); clearReader(); element("notes").replaceChildren();
  element("search-results").replaceChildren(); element("search-coverage").textContent = "";
  element("coverage-summary").textContent = "No current index."; element("search-summary").textContent = ""; element("search-details").hidden = true;
  search.disabled = true; query.disabled = true; askView?.update();
  filter.value = ""; filter.disabled = true;
  element("coverage").textContent = "No source content is loaded.";
  element("list-empty").textContent = "Approve read access to list Markdown notes.";
}
askView = new AskView(bridge, () => vault && listing && !scoping && !paused ? { revision: vault.revision, generation, selection: { folder: projectFolder.value.trim(), project: projectSelect.value }, model: modelSetup.model(), embeddingModel: modelSetup.embeddingModel() } : null, (path, heading, hash) => { void openNote(path, heading, hash); });
element("open-ask").addEventListener("click", () => { reviewsView?.hide(); actionsView.hide(); recordsView.hide(); changesView.hide(); cancelAI(); askView.open(); });
recordsView = new RecordsView(bridge, () => vault && listing && !scoping && !paused ? { revision: vault.revision, generation, selection: { folder: projectFolder.value.trim(), project: projectSelect.value } } : null,
  () => { reviewsView?.hide(); actionsView?.hide(); cancelAI(); askView.hide(); changesView.hide(); element("project-panel").hidden = true; element("source-pane").hidden = true; },
  () => changesView.open(), (path, heading, hash) => { void openNote(path, heading, hash); });
actionsView = new ActionsView(bridge, () => vault && listing && !scoping && !paused ? { revision: vault.revision, generation, selection: { folder: projectFolder.value.trim(), project: projectSelect.value } } : null,
  () => { reviewsView?.hide(); recordsView.hide(); cancelAI(); askView.hide(); changesView.hide(); element("project-panel").hidden = true; element("source-pane").hidden = true; },
  () => changesView.open(), (path, heading, hash) => { void openNote(path, heading, hash); });
reviewsView = new ReviewsView(bridge, () => vault && listing && !scoping && !paused ? { revision: vault.revision, generation, selection: { folder: projectFolder.value.trim(), project: projectSelect.value } } : null,
  () => { actionsView.hide(); recordsView.hide(); cancelAI(); askView.hide(); changesView.hide(); element("project-panel").hidden = true; element("source-pane").hidden = true; },
  () => changesView.open(), (path, heading, hash) => { void openNote(path, heading, hash); },
  async path => { if (![...projectSelect.options].some(option => option.value === path)) throw Error("Load the current permitted project list before switching projects."); projectSelect.value = path; requests.invalidate(); await loadProject(); },
  () => recordsView.open());
function scopePreview(): void {
  const allowed = lines(roots.value), excluded = lines(exclusions.value);
  element("scope-preview").textContent = `Read roots: ${allowed.length ? allowed.join(", ") : "none (no notes)"}. Exclusions: ${excluded.length ? excluded.join(", ") : "none"}. This preview grants nothing.`;
}
async function followLink(from: string, target: string): Promise<void> {
  if (!vault) return;
  const revision = vault.revision, ticket = requests.beginRead(); if (ticket === null) return;
  try {
    const result = value(await bridge.resolveLink(from, target, revision));
    if (!requests.current(ticket) || vault?.revision !== revision) return;
    if (result.paths.length === 1) { await openNote(result.paths[0]!, result.heading); return; }
    const choices = element("link-choices"); choices.replaceChildren(); announce(result.message);
    for (const path of result.paths) {
      const button = document.createElement("button"); button.textContent = path;
      button.addEventListener("click", () => { void openNote(path, result.heading); }); choices.append(button);
    }
    choices.querySelector("button")?.focus();
  } catch (error) { if (requests.current(ticket)) report(error); }
}
function renderMarkdown(path: string, text: string, heading: string): string {
  const preview = markdownPreview(text), container = element("note-preview"); container.replaceChildren();
  const headings: HTMLElement[] = [];
  for (const block of preview.blocks) {
    const node = document.createElement(block.kind === "heading" ? `h${block.level}` : block.kind === "code" ? "pre" : block.kind === "quote" ? "blockquote" : block.kind === "list" ? "ul" : "p");
    if (block.kind === "code") node.textContent = block.text;
    const body = block.kind === "list" ? document.createElement("li") : node;
    if (body !== node) node.append(body);
    for (const part of block.inline) {
      const item = document.createElement(part.kind === "link" ? "button" : part.kind === "text" ? "span" : part.kind);
      item.textContent = part.text;
      if (part.kind === "link") { item.className = "thread-internal-link"; item.addEventListener("click", () => { void followLink(path, part.target!); }); }
      body.append(item);
    }
    if (block.kind === "heading") { node.dataset.heading = block.text; headings.push(node); }
    container.append(node);
  }
  element("preview-limit").textContent = preview.limited ? "Formatted preview reached its display limit. Original Markdown source remains available below." : "Safe Markdown subset; HTML, embeds and external links never execute or load.";
  if (heading) {
    const count = sourceHeadingCount(text, heading), matches = headings.filter(node => headingMatches(node.dataset.heading ?? "", heading));
    if (count !== 1 || matches.length !== 1) { container.focus(); return count > 1 ? "Repeated heading; inspect the original source to choose the passage." : "Heading not present in this preview; inspect the original source."; }
    const target = matches[0]!; target.classList.add("thread-heading-target"); target.tabIndex = -1; target.focus(); target.scrollIntoView({ block: "start" });
  } else container.focus();
  return "Source loaded. No files were changed.";
}
async function openNote(path: string, heading = "", expectedHash?: string): Promise<void> {
  if (!vault) return;
  const ticket = requests.beginRead();
  if (ticket === null) return;
  reviewsView?.hide(); actionsView.hide(); recordsView.hide(); changesView.hide(); askView.hide(); element("project-panel").hidden = true; element("source-pane").hidden = false;
  clearReader(); announce("Reading the selected source...");
  try {
    const note = value(await bridge.readNote(path, vault.revision, expectedHash));
    if (!requests.current(ticket) || !vault || note.revision !== vault.revision || note.generation < generation) return;
    element("note-title").textContent = path.split("/").at(-1) ?? path;
    element("note-meta").textContent = `${path} · Snapshot; external changes checked every 2.5 seconds and before navigation/search. Modified ${new Date(note.modifiedAt).toLocaleString()}; not an event date.`;
    element("note-content").textContent = note.text;
    changesView.setNote(note);
    announce(renderMarkdown(path, note.text, heading));
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
function applyIndex(result: IndexSnapshot): void {
  if (!vault || result.revision !== vault.revision || result.generation < generation) return;
  generation = result.generation; listing = result.listing; askView.update(); loadProjects.disabled = scoping; filter.disabled = false; query.disabled = false; search.disabled = false; renderNotes();
  element("coverage-summary").textContent = `${result.coverage.indexedFiles} indexed notes · ${result.coverage.omittedFiles} known omissions · ${result.coverage.shortenedNotes} shortened.${result.listing.identityIncomplete ? " Incomplete Markdown enumeration." : ""}`;
  element("coverage").textContent = `${result.listing.identityIncomplete ? "Markdown enumeration is incomplete: counts below cover known files only. Uninspected paths may contain additional notes; stable-ID uniqueness is unproven and identity-dependent outputs cannot be reused. " : ""}${indexCoverageText(result.coverage)} ${result.invalid} unreadable or invalid-metadata notes omitted. ${result.listing.omitted} encountered entries unavailable/unsupported. ${result.listing.limited ? "Traversal limit reached; additional files may be unlisted." : "Within the bounded listed scope."} ${result.reused} unchanged entries reused. Filter applies to paths; Search evidence searches indexed content.`;
}
async function loadNotes(): Promise<void> {
  const ticket = requests.beginRead();
  if (ticket === null) return;
  paused = false;
  clearContent(false);
  if (!vault) return;
  refresh.disabled = true; cancel.disabled = false; announce("Indexing permitted Markdown notes...");
  try {
    const result = value(await bridge.refreshIndex(vault.revision));
    if (!requests.current(ticket) || !vault || result.revision !== vault.revision) return;
    applyIndex(result); announce("Index ready. Search evidence or choose a source.");
  } catch (error) { if (requests.current(ticket)) report(error); }
  finally { refresh.disabled = !vault || scoping; cancel.disabled = !vault || scoping; }
}
element<HTMLFormElement>("search-form").addEventListener("submit", event => {
  event.preventDefault(); void (async () => {
    if (!vault || search.disabled) return;
    const ticket = requests.beginRead(); if (ticket === null) return;
    const revision = vault.revision; search.disabled = true; element("search-results").replaceChildren(); announce("Searching permitted evidence...");
    try {
      const result = value(await bridge.searchNotes(query.value, revision));
      if (!requests.current(ticket) || vault?.revision !== revision || result.generation < generation) return;
      applyIndex(result); element("search-coverage").textContent = result.coverageText;
      element("search-summary").textContent = `${result.hits.length} evidence passages. Keyword search; no AI required.`; element("search-details").hidden = false;
      const list = element("search-results");
      for (const hit of result.hits) {
        const row = document.createElement("li"), button = document.createElement("button"), excerpt = document.createElement("span");
        button.className = "thread-note"; button.textContent = `${hit.path} > ${hit.heading || "Note"}`;
        excerpt.className = "thread-result-excerpt"; excerpt.textContent = hit.excerpt; button.append(excerpt);
        button.addEventListener("click", () => { void openNote(hit.path, hit.heading, hit.hash); }); row.append(button); list.append(row);
      }
      announce(result.hits.length ? "Evidence ready. Open a passage to inspect its current source." : "No indexed passages match. Inspect coverage or try other keywords.");
    } catch (error) { if (requests.current(ticket)) report(error); }
    finally { search.disabled = !vault || !listing || scoping; }
  })();
});
bridge.onIndexEvent(event => {
  if (!vault || event.revision !== vault.revision || event.generation < generation || paused) return;
  if (event.kind === "invalidated") { generation = event.generation; clearContent(false); }
  announce(event.message);
  if (event.kind === "ready" && event.snapshot) applyIndex(event.snapshot);
});
cancel.addEventListener("click", () => { void (async () => {
  if (!vault || cancel.disabled || scoping) return;
  requests.invalidate(); paused = true; clearContent(false);
  try { value(await bridge.cancelIndex(vault.revision)); announce("Indexing canceled. Refresh to resume monitoring."); }
  catch (error) { report(error); }
  refresh.disabled = !vault || scoping;
})(); });
choose.addEventListener("click", () => { void (async () => {
  choose.disabled = true;
  try {
    const selected = value(await bridge.selectVault());
    if (!selected) { announce("Folder selection canceled. Existing access is unchanged."); return; }
    clearContent(); vault = selected; generation = 0;
    roots.value = ""; exclusions.value = ""; projectFolder.value = ""; modelSetup.reset(); scopePreview();
    element("vault-details").hidden = false;
    element("vault-name").textContent = selected.name; element("vault-path").textContent = selected.path;
    refresh.disabled = false;
    announce("Vault selected. No read access granted. Review the allowed paths and exclusions, then approve.");
    roots.focus(); await storageView.refresh();
  } catch (error) { report(error); } finally { choose.disabled = false; }
})(); });
grant.addEventListener("click", () => { void (async () => {
  if (!vault) return;
  const ticket = requests.beginScope();
  if (ticket === null) return;
  clearContent(false); scoping = true; projectFolder.disabled = true; grant.disabled = true; refresh.disabled = true; cancel.disabled = true;
  announce("Applying the approved read access...");
  let approved = false;
  try {
    const selected = value(await bridge.grantScope({ roots: lines(roots.value), excluded: lines(exclusions.value) }, vault.revision));
    if (!requests.current(ticket)) return;
    vault = selected; generation = 0; approved = true;
  } catch (error) { if (requests.current(ticket)) report(error); }
  finally { requests.finishScope(ticket); scoping = false; projectFolder.disabled = false; grant.disabled = false; refresh.disabled = !vault; }
  if (approved && requests.current(ticket)) { await storageView.refresh(); await loadNotes(); }
})(); });
close.addEventListener("click", () => { void (async () => {
  clearContent(); vault = null; storageView.reset(); generation = 0; refresh.disabled = true; cancel.disabled = true; element("vault-details").hidden = true;
  roots.value = ""; exclusions.value = ""; projectFolder.value = ""; modelSetup.reset(); element("vault-name").textContent = ""; element("vault-path").textContent = "";
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

async function loadProject(resume = false, discover = false): Promise<void> {
  if (!vault || !listing || scoping || paused) return;
  const ticket = requests.beginRead(); if (ticket === null) return;
  reviewsView?.hide(); actionsView.hide(); recordsView.hide(); changesView.hide();
  askView.invalidate("Project changed. Retrieve evidence again."); askView.hide();
  activePrepared = null; element<HTMLButtonElement>("back-project").disabled = true; cancelAI();
  const revision = vault.revision, selection = { folder: projectFolder.value.trim(), project: discover ? "" : projectSelect.value };
  const panel = element("project-panel"); panel.replaceChildren(); panel.hidden = false; element("source-pane").hidden = true;
  homeButton.disabled = true; resumeButton.disabled = true; loadProjects.disabled = true;
  announce(resume ? "Preparing recorded context from current permitted sources..." : "Loading permitted projects...");
  try {
    const recorded = resume ? value(await bridge.resumeProject(selection, revision)) : null;
    const result = recorded ?? value(await bridge.projectHome(selection, revision));
    if (!requests.current(ticket) || vault?.revision !== revision || result.generation < generation) return;
    applyIndex(result.index);
    projectSelect.replaceChildren(new Option("Choose a permitted project", ""), ...result.projects.map(path => new Option(path, path)));
    projectSelect.value = selection.project; projectSelect.disabled = !result.projects.length;
    const open = (path: string, heading: string, hash: string): void => { void openNote(path, heading, hash); };
    if (result.home && !recorded) renderHome(panel, result.home, open);
    if (recorded) renderRecorded(panel, recorded, open);
    if (!result.home) {
      const empty = document.createElement("p"); empty.className = "thread-empty";
      empty.textContent = result.projects.length ? "Choose a permitted project above." : "No projects found. Map a Projects folder with Overview.md notes, or use type: project metadata. Review read access separately."; panel.append(empty);
    }
    announce(resume ? "Recorded context ready. No AI or note changes were needed." : result.home ? "Project home ready. Dates describe records, not verified events." : "Project list ready. Mapping does not grant access.");
    element<HTMLButtonElement>("back-project").disabled = false;
    if (!discover) panel.focus();
    activePrepared = recorded;
    if (recorded && modelSetup.model()) void interpretProject(recorded);
  } catch (error) { if (requests.current(ticket)) report(error); }
  finally {
    if (requests.current(ticket)) {
      loadProjects.disabled = !vault || !listing || scoping || paused;
      homeButton.disabled = resumeButton.disabled = loadProjects.disabled || !projectSelect.value;
    }
  }
}
projectFolder.addEventListener("input", () => { if (requests.beginRead() === null) return; clearProjects(); loadProjects.disabled = !vault || !listing || scoping || paused; announce("Project mapping changed. Refresh projects; read permissions are unchanged."); });
loadProjects.addEventListener("click", () => { void loadProject(false, true); });
projectSelect.addEventListener("change", () => { requests.invalidate(); element("project-panel").replaceChildren(); void loadProject(); });
homeButton.addEventListener("click", () => { void loadProject(); });
resumeButton.addEventListener("click", () => { void loadProject(true); });

async function interpretProject(recorded: PreparedResume): Promise<void> {
  const epoch = ++aiEpoch;
  aiCancel.disabled = false; aiFeedback.textContent = "Recorded context ready. Generating AI interpretation locally...";
  const current = (): boolean => epoch === aiEpoch && activePrepared === recorded && vault?.revision === recorded.revision && generation === recorded.generation;
  try {
    const result = value(await bridge.interpretResume(recorded.briefingId, recorded.revision));
    if (!current() || result.briefingId !== recorded.briefingId) return;
    renderInterpretation(element("project-panel"), result, recorded, (path, heading, hash) => { void openNote(path, heading, hash); });
    aiFeedback.textContent = "Briefing ready. Recorded context and AI interpretations are shown separately.";
  } catch (error) {
    if (current()) aiFeedback.textContent = `Recorded context remains available. ${error instanceof Error ? error.message : "Local AI could not finish."}`;
  } finally { if (epoch === aiEpoch) aiCancel.disabled = true; }
}
aiCancel.addEventListener("click", () => { cancelAI(); aiFeedback.textContent = "AI interpretation canceled. Current recorded context remains available."; });

element("back-project").addEventListener("click", () => {
  if (!element("project-panel").childElementCount) return;
  askView.hide(); element("source-pane").hidden = true; element("project-panel").hidden = false; element("project-panel").focus();
});
