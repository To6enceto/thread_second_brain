import { ResearchView } from "./research-view.ts";
import { PortabilityView } from "./portability-view.ts";
import { ReviewsView } from "./reviews-view.ts";
import { ActionsView } from "./actions-view.ts";
import { RecordsView } from "./records-view.ts";
import type { DesktopBridge, DesktopResult, IndexSnapshot, NoteList, VaultInfo, PreparedResume } from "./contracts.ts";
import { StorageView } from "./storage-view.ts";
import { SavedAccessView, continueSteps } from "./saved-access-view.ts";
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
let researchView: ResearchView;
let portabilityView: PortabilityView;
let savedAccess: SavedAccessView;
let aiEpoch = 0;
let activePrepared: PreparedResume | null = null;
const aiFeedback = element("ai-generation-status"), aiCancel = element<HTMLButtonElement>("ai-cancel-generation");
function clearAI(): void {
  aiEpoch++; element("project-panel").querySelector(".thread-ai-card")?.remove(); aiFeedback.textContent = ""; aiCancel.disabled = true;
}
const modelSetup = new ModelSetup(bridge, () => { researchView?.invalidate(); reviewsView?.invalidate(); actionsView?.invalidate("AI settings changed. Refresh actions."); recordsView?.invalidate("AI settings changed. Refresh to continue."); clearAI(); askView?.invalidate("AI settings changed. Retrieve evidence again."); });
function cancelAI(): void { clearAI(); void bridge.cancelAI(); }
function clearProjects(): void {
  researchView?.invalidate(); portabilityView?.invalidate(); reviewsView?.invalidate(); actionsView?.invalidate("The project or its notes changed. Refresh actions.");
  recordsView?.invalidate("The project or its notes changed. Refresh to continue.");
  askView?.invalidate(); askView?.hide();
  activePrepared = null; element<HTMLButtonElement>("back-project").disabled = true; cancelAI();
  element("project-panel").replaceChildren(); projectSelect.replaceChildren(new Option("Choose a project", ""));
  projectSelect.disabled = true; homeButton.disabled = true; resumeButton.disabled = true; loadProjects.disabled = true;
}
let vault: VaultInfo | null = null, listing: NoteList | null = null;
let generation = 0, scoping = false, paused = false;
const requests = new ReaderRequests();
const storageView = new StorageView(bridge, () => vault?.revision ?? null, modelSetup, () => { researchView?.invalidate(); reviewsView?.invalidate(); actionsView?.invalidate("Saving settings changed. Refresh actions."); recordsView?.invalidate("Saving settings changed. Refresh to continue."); changesView?.invalidate("Saving settings changed. Refresh and review the change again."); });
changesView = new ChangesView(bridge, () => vault?.revision ?? null, () => { researchView?.hide(); portabilityView?.hide(); reviewsView?.hide(); actionsView?.hide(); recordsView?.hide(); cancelAI(); askView.hide(); element("project-panel").hidden = true; element("source-pane").hidden = true; });
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
  element("note-meta").textContent = "Choose a note to read it here. Thread does not change it.";
  element("note-content").textContent = "";
  element("note-preview").replaceChildren(); element("link-choices").replaceChildren(); element("preview-limit").textContent = "";
}
function clearContent(invalidate = true): void {
  changesView?.invalidate("Notes or access changed. Refresh to see changes again; their history is kept.");
  if (invalidate) requests.invalidate();
  listing = null; clearProjects(); clearReader(); element("notes").replaceChildren();
  element("search-results").replaceChildren(); element("search-coverage").textContent = "";
  element("coverage-summary").textContent = "Nothing read yet."; element("search-summary").textContent = ""; element("search-details").hidden = true;
  search.disabled = true; query.disabled = true; askView?.update(); savedAccess?.update();
  filter.value = ""; filter.disabled = true;
  element("coverage").textContent = "No notes are loaded.";
  element("list-empty").textContent = "Approve read access to see your notes here.";
}
askView = new AskView(bridge, () => vault && listing && !scoping && !paused ? { revision: vault.revision, generation, selection: { folder: projectFolder.value.trim(), project: projectSelect.value }, model: modelSetup.model(), embeddingModel: modelSetup.embeddingModel() } : null, (path, heading, hash) => { void openNote(path, heading, hash); }, () => changesView.open());
element("open-ask").addEventListener("click", () => { researchView?.hide(); portabilityView?.hide(); reviewsView?.hide(); actionsView.hide(); recordsView.hide(); changesView.hide(); cancelAI(); askView.open(); });
recordsView = new RecordsView(bridge, () => vault && listing && !scoping && !paused ? { revision: vault.revision, generation, selection: { folder: projectFolder.value.trim(), project: projectSelect.value } } : null,
  () => { researchView?.hide(); portabilityView?.hide(); reviewsView?.hide(); actionsView?.hide(); cancelAI(); askView.hide(); changesView.hide(); element("project-panel").hidden = true; element("source-pane").hidden = true; },
  () => changesView.open(), (path, heading, hash) => { void openNote(path, heading, hash); });
actionsView = new ActionsView(bridge, () => vault && listing && !scoping && !paused ? { revision: vault.revision, generation, selection: { folder: projectFolder.value.trim(), project: projectSelect.value } } : null,
  () => { researchView?.hide(); portabilityView?.hide(); reviewsView?.hide(); recordsView.hide(); cancelAI(); askView.hide(); changesView.hide(); element("project-panel").hidden = true; element("source-pane").hidden = true; },
  () => changesView.open(), (path, heading, hash) => { void openNote(path, heading, hash); });
reviewsView = new ReviewsView(bridge, () => vault && listing && !scoping && !paused ? { revision: vault.revision, generation, selection: { folder: projectFolder.value.trim(), project: projectSelect.value } } : null,
  () => { researchView?.hide(); portabilityView?.hide(); actionsView.hide(); recordsView.hide(); cancelAI(); askView.hide(); changesView.hide(); element("project-panel").hidden = true; element("source-pane").hidden = true; },
  () => changesView.open(), (path, heading, hash) => { void openNote(path, heading, hash); },
  async path => { if (![...projectSelect.options].some(option => option.value === path)) throw Error("Refresh projects before switching to another project."); projectSelect.value = path; requests.invalidate(); await loadProject(); },
  () => recordsView.open());
researchView = new ResearchView(bridge, () => vault && listing && !scoping && !paused ? { revision: vault.revision, generation, selection: { folder: projectFolder.value.trim(), project: projectSelect.value } } : null,
  () => { portabilityView?.hide(); reviewsView.hide(); actionsView.hide(); recordsView.hide(); cancelAI(); askView.hide(); changesView.hide(); element("project-panel").hidden = true; element("source-pane").hidden = true; },
  () => changesView.open(), (path, heading, hash) => { void openNote(path, heading, hash); },
  handoff => { researchView.hide(); reviewsView.hide(); actionsView.hide(); recordsView.hide(); changesView.hide(); askView.adoptCollection(handoff); });
portabilityView = new PortabilityView(bridge, () => vault && listing && !scoping && !paused ? { revision: vault.revision, generation, selection: { folder: projectFolder.value.trim(), project: projectSelect.value } } : null,
  () => { researchView.hide(); reviewsView.hide(); actionsView.hide(); recordsView.hide(); cancelAI(); askView.hide(); changesView.hide(); element("project-panel").hidden = true; element("source-pane").hidden = true; },
  (path, heading, hash) => { void openNote(path, heading, hash); });
function scopePreview(): void {
  const allowed = lines(roots.value), excluded = lines(exclusions.value);
  element("scope-preview").textContent = `Thread will read: ${allowed.length ? allowed.join(", ") : "nothing yet"}. Kept private: ${excluded.length ? excluded.join(", ") : "nothing"}. Changes take effect only when you approve.`;
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
  element("preview-limit").textContent = preview.limited ? "This note is too long to show formatted in full. The complete text is under Original Markdown source." : "Shown as simple formatted text. Web content, embeds and outside links are never loaded.";
  if (heading) {
    const count = sourceHeadingCount(text, heading), matches = headings.filter(node => headingMatches(node.dataset.heading ?? "", heading));
    if (count !== 1 || matches.length !== 1) { container.focus(); return count > 1 ? "This heading appears more than once. Check the original text to find the right passage." : "That heading is not in this preview. Check the original text below."; }
    const target = matches[0]!; target.classList.add("thread-heading-target"); target.tabIndex = -1; target.focus(); target.scrollIntoView({ block: "start" });
  } else container.focus();
  return "Note opened. Nothing was changed.";
}
async function openNote(path: string, heading = "", expectedHash?: string): Promise<void> {
  if (!vault) return;
  const ticket = requests.beginRead();
  if (ticket === null) return;
  researchView?.hide(); portabilityView?.hide(); reviewsView?.hide(); actionsView.hide(); recordsView.hide(); changesView.hide(); askView.hide(); element("project-panel").hidden = true; element("source-pane").hidden = false;
  clearReader(); announce("Opening the note...");
  try {
    const note = value(await bridge.readNote(path, vault.revision, expectedHash));
    if (!requests.current(ticket) || !vault || note.revision !== vault.revision || note.generation < generation) return;
    element("note-title").textContent = path.split("/").at(-1) ?? path;
    element("note-meta").textContent = `${path} · Shown as it was when opened; Thread checks for changes every 2.5 seconds. File last modified ${new Date(note.modifiedAt).toLocaleString()}, which may differ from when things happened.`;
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
  element("list-empty").textContent = paths.length ? "" : query ? "No note names match." : "No Markdown notes in the folders Thread may read.";
}
function applyIndex(result: IndexSnapshot): void {
  if (!vault || result.revision !== vault.revision || result.generation < generation) return;
  generation = result.generation; listing = result.listing; askView.update(); savedAccess.update(); loadProjects.disabled = scoping; filter.disabled = false; query.disabled = false; search.disabled = false; renderNotes(); researchView?.indexReady();
  element("coverage-summary").textContent = `${result.coverage.indexedFiles} notes ready to search · ${result.coverage.omittedFiles} skipped · ${result.coverage.shortenedNotes} shortened.${result.listing.identityIncomplete ? " Not every note could be listed." : ""}`;
  element("coverage").textContent = `${result.listing.identityIncomplete ? "Not every note could be listed, so these counts cover only the notes Thread found, and saved results that depend on note IDs are not reused. " : ""}${indexCoverageText(result.coverage)} ${result.invalid} ${result.invalid === 1 ? "note" : "notes"} skipped because they could not be read or their properties are invalid. ${result.listing.omitted} other ${result.listing.omitted === 1 ? "file" : "files"} skipped. ${result.listing.limited ? "Thread stopped at its listing limit, so some files may be missing." : result.listing.identityIncomplete ? "Some folders or files could not be checked." : "All allowed folders were checked."} ${result.reused} unchanged notes reused. Find a note by name matches names; Search looks inside notes.${result.pdfChecks ? ` ${result.pdfChecks}` : ""}`;
}
async function loadNotes(): Promise<void> {
  const ticket = requests.beginRead();
  if (ticket === null) return;
  paused = false;
  clearContent(false);
  if (!vault) return;
  refresh.disabled = true; cancel.disabled = false; announce("Reading your notes...");
  try {
    const result = value(await bridge.refreshIndex(vault.revision));
    if (!requests.current(ticket) || !vault || result.revision !== vault.revision) return;
    applyIndex(result); announce("Notes ready. Search inside them or choose a note.");
  } catch (error) { if (requests.current(ticket)) report(error); }
  finally { refresh.disabled = !vault || scoping; cancel.disabled = !vault || scoping; }
}
element<HTMLFormElement>("search-form").addEventListener("submit", event => {
  event.preventDefault(); void (async () => {
    if (!vault || search.disabled) return;
    const ticket = requests.beginRead(); if (ticket === null) return;
    const revision = vault.revision; search.disabled = true; element("search-results").replaceChildren(); announce("Searching your notes...");
    try {
      const result = value(await bridge.searchNotes(query.value, revision));
      if (!requests.current(ticket) || vault?.revision !== revision || result.generation < generation) return;
      applyIndex(result); element("search-coverage").textContent = result.coverageText;
      element("search-summary").textContent = `${result.hits.length} matching ${result.hits.length === 1 ? "passage" : "passages"}, found by keywords. No AI used.`; element("search-details").hidden = false;
      const list = element("search-results");
      for (const hit of result.hits) {
        const row = document.createElement("li"), button = document.createElement("button"), excerpt = document.createElement("span");
        button.className = "thread-note"; button.textContent = `${hit.path} > ${hit.heading || "Note"}`;
        excerpt.className = "thread-result-excerpt"; excerpt.textContent = hit.excerpt; button.append(excerpt);
        button.addEventListener("click", () => { void openNote(hit.path, hit.heading, hit.hash); }); row.append(button); list.append(row);
      }
      announce(result.hits.length ? "Results ready. Open one to read it in its note." : "Nothing matches. Try other words, or check What Thread read.");
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
  try { value(await bridge.cancelIndex(vault.revision)); announce("Stopped reading notes. Thread will not notice changes until you choose Refresh."); }
  catch (error) { report(error); }
  refresh.disabled = !vault || scoping;
})(); });
choose.addEventListener("click", () => { void (async () => {
  choose.disabled = true;
  try {
    const selected = value(await bridge.selectVault());
    if (!selected) { announce("No folder chosen. Nothing changed."); return; }
    showVault(selected);
    announce("Folder chosen. Thread cannot read anything yet: list the folders it may read, then choose Approve read access.");
    roots.focus(); await storageView.refresh();
  } catch (error) { report(error); } finally { choose.disabled = false; }
})(); });
grant.addEventListener("click", () => { void (async () => {
  if (!vault) return;
  const ticket = requests.beginScope();
  if (ticket === null) return;
  clearContent(false); scoping = true; projectFolder.disabled = true; grant.disabled = true; refresh.disabled = true; cancel.disabled = true;
  announce("Applying access...");
  let approved = false;
  try {
    const selected = value(await bridge.grantScope({ roots: lines(roots.value), excluded: lines(exclusions.value) }, vault.revision));
    if (!requests.current(ticket)) return;
    vault = selected; generation = 0; approved = true;
  } catch (error) { if (requests.current(ticket)) report(error); }
  finally { requests.finishScope(ticket); scoping = false; projectFolder.disabled = false; grant.disabled = false; refresh.disabled = !vault; }
  if (approved && requests.current(ticket)) { await storageView.refresh(); await loadNotes(); }
})(); });
function showVault(selected: VaultInfo): void {
  clearContent(); vault = selected; generation = 0;
  roots.value = selected.scope.roots.join("\n"); exclusions.value = selected.scope.excluded.join("\n"); projectFolder.value = ""; modelSetup.reset(); scopePreview();
  element("vault-details").hidden = false;
  element("vault-name").textContent = selected.name; element("vault-path").textContent = selected.path;
  refresh.disabled = false;
}
function resetVault(): void {
  clearContent(); vault = null; storageView.reset(); generation = 0; refresh.disabled = true; cancel.disabled = true; element("vault-details").hidden = true;
  roots.value = ""; exclusions.value = ""; projectFolder.value = ""; modelSetup.reset(); element("vault-name").textContent = ""; element("vault-path").textContent = "";
}
savedAccess = new SavedAccessView(bridge,
  () => vault && listing && !scoping && !paused && vault.scope.roots.length ? { revision: vault.revision, projectsFolder: projectFolder.value.trim(), embeddingModel: modelSetup.embeddingModel() } : null,
  resetVault,
  async result => {
    showVault(result.vault); projectFolder.value = result.projectsFolder;
    // Close, Choose or a new approval during these steps must not receive the saved projects or model.
    return continueSteps(result.vault.revision, () => vault?.revision ?? null, [
      () => storageView.refresh(), () => loadNotes(),
      async () => { if (result.projectsFolder && listing) await loadProject(false, true); },
      async () => { if (result.ai.model || result.ai.embeddingModel) void modelSetup.restore(result.ai); }
    ]);
  }, announce);
void savedAccess.load();
close.addEventListener("click", () => { void (async () => {
  resetVault();
  try { value(await bridge.closeVault()); announce("Folder closed. Thread can no longer read it."); choose.focus(); }
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
  researchView?.hide(); portabilityView?.hide(); reviewsView?.hide(); actionsView.hide(); recordsView.hide(); changesView.hide();
  askView.invalidate("Project changed. Retrieve evidence again."); askView.hide();
  activePrepared = null; element<HTMLButtonElement>("back-project").disabled = true; cancelAI();
  const revision = vault.revision, selection = { folder: projectFolder.value.trim(), project: discover ? "" : projectSelect.value };
  const panel = element("project-panel"); panel.replaceChildren(); panel.hidden = false; element("source-pane").hidden = true;
  homeButton.disabled = true; resumeButton.disabled = true; loadProjects.disabled = true;
  announce(resume ? "Gathering what your notes say..." : "Finding projects...");
  try {
    const recorded = resume ? value(await bridge.resumeProject(selection, revision)) : null;
    const result = recorded ?? value(await bridge.projectHome(selection, revision));
    if (!requests.current(ticket) || vault?.revision !== revision || result.generation < generation) return;
    applyIndex(result.index);
    projectSelect.replaceChildren(new Option("Choose a project", ""), ...result.projects.map(path => new Option(path, path)));
    projectSelect.value = selection.project; projectSelect.disabled = !result.projects.length;
    const open = (path: string, heading: string, hash: string): void => { void openNote(path, heading, hash); };
    if (result.home && !recorded) renderHome(panel, result.home, open);
    if (recorded) renderRecorded(panel, recorded, open);
    if (!result.home) {
      const empty = document.createElement("p"); empty.className = "thread-empty";
      empty.textContent = result.projects.length ? "Choose a project above." : "No projects found. Open Where are your projects? and enter the folder that holds them, or mark a note with type: project. Also check that Thread may read that folder."; panel.append(empty);
    }
    announce(resume ? "Here is what your notes say. Nothing was changed." : result.home ? "Project home ready. Dates come from your notes and are not checked." : "Projects found. Choose one.");
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
projectFolder.addEventListener("input", () => { if (requests.beginRead() === null) return; clearProjects(); loadProjects.disabled = !vault || !listing || scoping || paused; announce("Projects folder changed. Choose Refresh projects. What Thread may read is unchanged."); });
loadProjects.addEventListener("click", () => { void loadProject(false, true); });
projectSelect.addEventListener("change", () => { requests.invalidate(); element("project-panel").replaceChildren(); void loadProject(); });
homeButton.addEventListener("click", () => { void loadProject(); });
resumeButton.addEventListener("click", () => { void loadProject(true); });

async function interpretProject(recorded: PreparedResume): Promise<void> {
  const epoch = ++aiEpoch;
  aiCancel.disabled = false; aiFeedback.textContent = "Here is what your notes say. The AI is adding suggestions on this computer...";
  const current = (): boolean => epoch === aiEpoch && activePrepared === recorded && vault?.revision === recorded.revision && generation === recorded.generation;
  try {
    const result = value(await bridge.interpretResume(recorded.briefingId, recorded.revision));
    if (!current() || result.briefingId !== recorded.briefingId) return;
    renderInterpretation(element("project-panel"), result, recorded, (path, heading, hash) => { void openNote(path, heading, hash); });
    aiFeedback.textContent = "Briefing ready. What your notes say and the AI suggestions are shown separately.";
  } catch (error) {
    if (current()) aiFeedback.textContent = `What your notes say is still shown. ${error instanceof Error ? error.message : "Local AI could not finish."}`;
  } finally { if (epoch === aiEpoch) aiCancel.disabled = true; }
}
aiCancel.addEventListener("click", () => { cancelAI(); aiFeedback.textContent = "AI suggestions canceled. What your notes say is still shown."; });

element("back-project").addEventListener("click", () => {
  if (!element("project-panel").childElementCount) return;
  askView.hide(); element("source-pane").hidden = true; element("project-panel").hidden = false; element("project-panel").focus();
});
