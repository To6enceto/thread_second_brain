import { DesktopIntake } from "./intake.ts";
import { DesktopCollections } from "./collections.ts";
import { DesktopKnowledge } from "./knowledge.ts";
import { DesktopPdfAssets } from "./pdf-assets.ts";
import { DesktopPdf } from "./pdf.ts";
import { DesktopPortability } from "./portability.ts";
import { VaultFiles } from "./vault-files.ts";
import { app, BrowserWindow, dialog, ipcMain, Menu } from "electron";
import type { IpcMainInvokeEvent } from "electron";
import { join } from "node:path";
import { DesktopSaves } from "./saves.ts";
import { DesktopStorage } from "./storage.ts";
import { DesktopReviews } from "./reviews.ts";
import { DesktopRecords } from "./records.ts";
import { DesktopChanges } from "./changes.ts";
import { VaultReader } from "./vault-reader.ts";
import { DesktopAsk } from "./ask.ts";
import { DesktopAI } from "./local-ai.ts";
import { DesktopProjects } from "./projects.ts";
import { EvidenceIndex } from "./evidence-index.ts";
import { assetAllowed, DesktopError, publicFailure, trustedSender } from "./security.ts";
import type { DesktopResult, ProjectRequest } from "./contracts.ts";

app.setName("Thread Desktop");
app.enableSandbox();
const reader = new VaultReader();
let window: BrowserWindow | null = null;
let ai: DesktopAI;
let ask: DesktopAsk;
let storage: DesktopStorage;
let saves: DesktopSaves;
let changes: DesktopChanges;
let records: DesktopRecords;
let reviews: DesktopReviews;
let intake: DesktopIntake;
let collections: DesktopCollections;
let knowledge: DesktopKnowledge;
let pdf: DesktopPdf;
let portability: DesktopPortability;
function cancelResearchWork(): void { intake?.invalidate(); collections?.invalidate(); knowledge?.invalidate(); pdf?.invalidate(); }
// Scope, vault, writer and evidence changes also discard portability tokens and previews.
function invalidateResearch(): void { cancelResearchWork(); portability?.invalidate(); }
function researchDraftChanged(keepClip = false): void { intake?.draftChanged(keepClip); collections?.draftChanged(); knowledge?.draftChanged(); pdf?.draftChanged(); }
const evidence = new EvidenceIndex(reader, event => { if (event.kind === "invalidated") { invalidateResearch(); reviews?.invalidate(); records?.invalidate(); changes?.invalidate(); saves?.revoke(); ai?.forget(); ask?.forget(); } if (window && !window.webContents.isDestroyed()) window.webContents.send("thread:index-event", event); });
const projects = new DesktopProjects(reader, evidence);
ai = new DesktopAI(projects, evidence);
ask = new DesktopAsk(reader, evidence, projects, ai);
function clearVault(): void { invalidateResearch(); reviews?.invalidate(); records?.invalidate(); changes?.invalidate(); saves?.revoke(); ask.forget(); ai.reset(); evidence.reset(); reader.close(); void storage?.close(); }
let choosing = false;
const entry = join(__dirname, "app.html");
const pdfAssets = new DesktopPdfAssets(__dirname);
const assets = [entry, join(__dirname, "renderer.js"), join(__dirname, "styles.css")];

function handle<T>(channel: string, count: number, run: (...args: unknown[]) => Promise<T> | T): void {
  ipcMain.handle(channel, async (event: IpcMainInvokeEvent, ...args: unknown[]): Promise<DesktopResult<T>> => {
    try {
      if (!window || !trustedSender(event.sender.id, window.webContents.id, event.senderFrame?.url ?? "", event.senderFrame === window.webContents.mainFrame, entry)) {
        throw new DesktopError("This operation is unavailable outside the Thread window.");
      }
      if (args.length !== count) throw new DesktopError("The request was invalid. Reload Thread and try again.");
      return { ok: true, value: await run(...args) };
    } catch (error) { return { ok: false, message: publicFailure(error) }; }
  });
}

async function start(): Promise<void> {
  if (process.platform !== "linux") throw new Error("This desktop milestone requires Linux.");
  storage = new DesktopStorage(reader, app.getPath("userData"));
  saves = new DesktopSaves(reader, storage, ask);
  changes = new DesktopChanges(reader, storage);
  records = new DesktopRecords(reader, evidence, projects, storage, changes, ai);
  reviews = new DesktopReviews(reader, evidence, projects, storage, changes, ai);
  intake = new DesktopIntake(reader, evidence, projects, storage, changes);
  collections = new DesktopCollections(reader, evidence, projects, storage, changes, ask);
  knowledge = new DesktopKnowledge(reader, evidence, projects, storage, changes, ai);
  pdf = new DesktopPdf(reader, evidence, storage, changes);
  portability = new DesktopPortability(reader, evidence, storage, new VaultFiles(reader));
  window = new BrowserWindow({
    title: "Thread Desktop", width: 1240, height: 820, minWidth: 720, minHeight: 560,
    show: false,
    webPreferences: { preload: join(__dirname, "preload.cjs"), sandbox: true, contextIsolation: true,
      nodeIntegration: false, webSecurity: true, webviewTag: false, spellcheck: false }
  });
  Menu.setApplicationMenu(null);
  const contents = window.webContents;
  contents.session.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
  contents.session.setPermissionCheckHandler(() => false);
  contents.session.on("will-download", event => event.preventDefault());
  contents.session.webRequest.onBeforeRequest((details, callback) => callback({ cancel: !assetAllowed(details.url, assets) }));
  contents.setWindowOpenHandler(() => ({ action: "deny" }));
  contents.on("will-navigate", event => event.preventDefault());
  contents.on("will-attach-webview", event => event.preventDefault());
  contents.on("did-start-navigation", (_event, _url, _inPlace, mainFrame) => { if (mainFrame) clearVault(); });
  contents.on("render-process-gone", clearVault);
  window.on("closed", () => { clearVault(); window = null; });
  window.once("ready-to-show", () => window?.show());

  handle("thread:select-vault", 0, async () => {
    if (choosing || !window) throw new DesktopError("Finish the open folder dialog first.");
    choosing = true;
    const previous = reader.getInfo()?.revision;
    try {
      const choice = await dialog.showOpenDialog(window, { title: "Choose your Obsidian vault folder", properties: ["openDirectory"] });
      if (choice.canceled || !choice.filePaths[0]) return null;
      if (!window || reader.getInfo()?.revision !== previous) throw new DesktopError("The current vault changed. Choose the folder again.");
      invalidateResearch(); reviews.invalidate(); records.invalidate(); await storage.close();
      const selected = await reader.select(choice.filePaths[0]); ask.forget(); ai.reset(); evidence.reset(); await storage.initialize(selected.revision); return selected;
    } finally { choosing = false; }
  });
  handle("thread:grant-scope", 2, async (scope, revision) => { const info = reader.grant(scope, revision); invalidateResearch(); reviews.invalidate(); records.invalidate(); ask.forget(); ai.forget(); evidence.reset(); await storage.release(); return info; });
  handle("thread:list-notes", 1, revision => reader.list(revision));
  handle("thread:read-note", 3, (path, revision, hash) => evidence.source(path, revision, hash));
  handle("thread:refresh-index", 1, revision => evidence.refresh(revision, true));
  handle("thread:cancel-index", 1, revision => { evidence.cancel(revision); return null; });
  handle("thread:search-notes", 2, (query, revision) => evidence.search(query, revision));
  handle("thread:resolve-link", 3, (from, target, revision) => evidence.resolve(from, target, revision));
  handle("thread:project-home", 2, (selection, revision) => { invalidateResearch(); reviews.invalidate(); records.invalidate(); ask.forget(); ai.forget(); return projects.home(selection, revision); });
  handle("thread:resume-project", 2, (selection, revision) => { invalidateResearch(); reviews.invalidate(); records.invalidate(); ask.forget(); return ai.prepare(selection, revision); });
  handle("thread:discover-models", 1, endpoint => ai.discover(endpoint));
  handle("thread:configure-ai", 1, settings => { const result = ai.configure(settings); invalidateResearch(); reviews.invalidate(); records.invalidate(); ask.forget(); return result; });
  handle("thread:check-ai", 0, () => ai.check());
  handle("thread:cancel-ai", 0, () => { researchDraftChanged(); reviews.draftChanged(); records.draftChanged(false); saves.revoke(); ai.cancel(); return null; });
  handle("thread:interpret-resume", 2, (identity, revision) => ai.interpret(identity, revision));
  handle("thread:retrieve-ask", 2, (request, revision) => { invalidateResearch(); reviews.invalidate(); records.invalidate(); ai.forget(); return ask.retrieve(request, revision); });
  handle("thread:choose-ask", 3, (identity, choices, revision) => { collections.draftChanged(); saves.revoke(); return ask.choose(identity, choices, revision); });
  handle("thread:generate-ask", 2, (identity, revision) => { collections.draftChanged(); saves.revoke(); return ask.generate(identity, revision); });
  handle("thread:correct-ask", 5, (identity, index, text, kind, revision) => { collections.draftChanged(); saves.revoke(); return ask.correct(identity, index, text, kind, revision); });
  handle("thread:continue-ask", 3, (identity, question, revision) => { collections.draftChanged(); saves.revoke(); return ask.continue(identity, question, revision); });
  handle("thread:reset-ask", 0, () => { collections.draftChanged(); saves.revoke(); ask.forget(); return null; });
  handle("thread:storage-status", 1, revision => storage.status(revision));
  handle("thread:inspect-compatibility", 2, (folder, revision) => storage.inspect(folder, revision));
  handle("thread:enable-writing", 2, (id, revision) => storage.enable(id, revision));
  handle("thread:release-writing", 0, async () => { invalidateResearch(); reviews.invalidate(); records.invalidate(); changes.invalidate(); await storage.release(); return null; });
  handle("thread:save-preferences", 2, (preferences, revision) => { invalidateResearch(); reviews.invalidate(); records.invalidate(); changes.invalidate(); return storage.savePreferences(preferences, revision); });
  handle("thread:import-plugin-copy", 2, (id, revision) => { invalidateResearch(); reviews.invalidate(); records.invalidate(); changes.invalidate(); return storage.importCopy(id, revision); });
  handle("thread:preview-ask-save", 5, (id, kind, title, selected, revision) => saves.prepare(id, kind, title, selected, revision));
  handle("thread:save-ask-preview", 2, (id, revision) => saves.save(id, revision));
  handle("thread:revoke-save-preview", 0, () => { saves.revoke(); return null; });
  handle("thread:inspect-save-recovery", 2, (id, revision) => saves.inspectRecovery(id, revision));
  handle("thread:resolve-save-recovery", 3, async (id, action, revision) => { await saves.resolveRecovery(id, action, revision); return null; });
  handle("thread:changes-snapshot", 1, revision => changes.snapshot(revision));
  handle("thread:begin-note-edit", 3, (path, stamp, revision) => changes.beginEdit(path, stamp, revision));
  handle("thread:propose-note-edit", 3, (id, body, revision) => changes.proposeEdit(id, body, revision));
  handle("thread:preview-change", 3, (action, id, revision) => changes.preview(action, id, revision));
  handle("thread:confirm-change", 2, (id, revision) => changes.confirm(id, revision));
  handle("thread:revise-change", 3, (id, bodies, revision) => changes.revise(id, bodies, revision));
  handle("thread:reject-change", 2, (id, revision) => changes.reject(id, revision));
  handle("thread:change-draft-edited", 1, id => { changes.draftChanged(id); return null; });
  handle("thread:invalidate-change-view", 0, () => { changes.invalidate(); return null; });
  handle("thread:load-records", 2, (selection, revision) => { invalidateResearch(); reviews.invalidate(); return records.load(selection, revision); });
  handle("thread:prepare-record", 3, (id, command, revision) => records.prepare(id, command, revision));
  handle("thread:assess-decision", 4, (id, path, sources, revision) => records.assess(id, path, sources, revision));
  handle("thread:record-draft-changed", 1, keep => { records.draftChanged(keep); return null; });
  handle("thread:cancel-records", 0, () => { records.invalidate(); return null; });
  handle("thread:load-actions", 2, (selection, revision) => { invalidateResearch(); reviews.invalidate(); return records.loadActions(selection, revision); });
  handle("thread:prepare-action", 3, (id, command, revision) => records.prepareAction(id, command, revision));
  handle("thread:generate-session", 3, (id, input, revision) => records.generateSession(id, input, revision));
  handle("thread:prepare-session", 2, (id, revision) => records.prepareSession(id, revision));
  handle("thread:load-reviews", 2, (request, revision) => { invalidateResearch(); records.invalidate(); ask.forget(); ai.forget(); return reviews.load(request, revision); });
  handle("thread:prepare-review", 3, (id, command, revision) => reviews.prepare(id, command, revision));
  handle("thread:generate-review", 3, (id, input, revision) => reviews.generate(id, input, revision));
  handle("thread:prepare-review-draft", 2, (id, revision) => reviews.prepareDraft(id, revision));
  handle("thread:review-draft-changed", 0, () => { reviews.draftChanged(); return null; });
  handle("thread:cancel-reviews", 0, () => { reviews.invalidate(); return null; });
  handle("thread:load-intake", 2, (selection, revision) => { collections.invalidate(); knowledge.invalidate(); reviews.invalidate(); records.invalidate(); ask.forget(); ai.forget(); return intake.load(selection as ProjectRequest, revision); });
  handle("thread:pick-intake-file", 2, (id, revision) => intake.pick(id, revision, async () => {
    if (choosing || !window) throw new DesktopError("Finish the open dialog first."); choosing = true;
    try { const choice = await dialog.showOpenDialog(window, { title: "Choose a local Markdown or text source", properties: ["openFile"], filters: [{ name: "Local text", extensions: ["md", "txt"] }] }); return choice.canceled ? null : choice.filePaths[0] ?? null; }
    finally { choosing = false; }
  }));
  handle("thread:suggest-intake-project", 3, (id, input, revision) => intake.suggest(id, input, revision));
  handle("thread:prepare-capture", 3, (id, input, revision) => intake.capture(id, input, revision));
  handle("thread:review-clip", 3, (id, input, revision) => intake.reviewClip(id, input, revision));
  handle("thread:prepare-clip", 4, (id, reviewId, acknowledge, revision) => intake.prepareClip(id, reviewId, acknowledge, revision));
  handle("thread:load-collections", 3, (selection, scope, revision) => { intake.invalidate(); knowledge.invalidate(); reviews.invalidate(); records.invalidate(); ask.forget(); ai.forget(); return collections.load(selection as ProjectRequest, scope, revision); });
  handle("thread:open-collection", 3, (id, path, revision) => collections.open(id, path, revision));
  handle("thread:reuse-collection", 5, (id, reviewId, choices, question, revision) => { saves.revoke(); return collections.reuse(id, reviewId, choices, question, revision); });
  handle("thread:save-edited-collection", 5, (id, reviewId, choices, name, revision) => collections.saveEdited(id, reviewId, choices, name, revision));
  handle("thread:save-ask-collection", 3, (id, name, revision) => collections.saveAsk(id, name, revision));
  handle("thread:load-knowledge", 2, (selection, revision) => { intake.invalidate(); collections.invalidate(); reviews.invalidate(); records.invalidate(); ask.forget(); ai.forget(); return knowledge.load(selection as ProjectRequest, revision); });
  handle("thread:generate-knowledge", 3, (id, input, revision) => knowledge.generate(id, input, revision));
  handle("thread:prepare-knowledge", 2, (id, revision) => knowledge.prepare(id, revision));
  handle("thread:research-draft-changed", 1, keepClip => { if (typeof keepClip !== "boolean") throw new DesktopError("Use the current research controls."); researchDraftChanged(keepClip); return null; });
  handle("thread:cancel-research", 0, () => { cancelResearchWork(); return null; });
  handle("thread:read-pdf-asset", 1, path => pdfAssets.read(path));
  handle("thread:load-pdfs", 1, revision => { intake.invalidate(); collections.invalidate(); knowledge.invalidate(); reviews.invalidate(); records.invalidate(); ask.forget(); ai.forget(); return pdf.load(revision); });
  // Consent keeps the vault revision (and writer ownership) but rebuilds evidence and discards dependent work.
  handle("thread:consent-pdf", 3, async (path, granted, revision) => { const info = await reader.consentPdf(path, granted, revision); invalidateResearch(); reviews.invalidate(); records.invalidate(); changes.invalidate(); saves.revoke(); ask.forget(); ai.forget(); evidence.reset(); void evidence.refresh(info.revision).catch(() => {}); return info; });
  handle("thread:read-pdf", 3, (id, path, revision) => pdf.read(id, path, revision));
  handle("thread:export-inventory", 2, (selection, revision) => portability.exportInventory(selection as ProjectRequest, revision));
  handle("thread:preview-export", 5, (id, selected, folder, name, revision) => portability.previewExport(id, selected, folder, name, revision));
  handle("thread:write-export", 2, (id, revision) => portability.writeExport(id, revision));
  handle("thread:pick-package", 1, async revision => {
    if (choosing || !window || reader.getInfo()?.revision !== revision) throw new DesktopError("Finish the open dialog or refresh access first."); choosing = true;
    try { return await portability.pick(async () => { const choice = await dialog.showOpenDialog(window!, { title: "Choose a Thread project package", properties: ["openFile"], filters: [{ name: "Thread project package", extensions: ["json"] }] }); return choice.canceled ? null : choice.filePaths[0] ?? null; }); }
    finally { choosing = false; }
  });
  handle("thread:compare-checkpoint", 3, (token, selection, revision) => portability.compareCheckpoint(token, selection as ProjectRequest, revision));
  handle("thread:import-status", 1, revision => portability.importStatus(revision));
  handle("thread:preview-import", 3, (token, root, revision) => portability.previewImport(token, root, revision));
  handle("thread:apply-import", 2, (id, revision) => portability.applyImport(id, revision));
  handle("thread:leave-import", 1, revision => portability.leaveImport(revision));
  handle("thread:cancel-portability", 0, () => { portability.draftChanged(); return null; });
  handle("thread:prepare-pdf", 5, (id, token, extraction, name, revision) => pdf.prepare(id, token, extraction, name, revision));
  handle("thread:close-vault", 0, () => { clearVault(); return null; });
  const monitor = setInterval(() => {
    const selected = reader.getInfo();
    if (selected?.scope.roots.length && !saves.applying && !changes.applying) void evidence.refresh(selected.revision).catch(() => { /* Safe failure is announced by the index; explicit Refresh resumes. */ });
  }, 2500);
  window.on("closed", () => clearInterval(monitor));
  await window.loadFile(entry);
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", () => { if (window?.isMinimized()) window.restore(); window?.focus(); });
  app.on("window-all-closed", () => app.quit());
  app.on("before-quit", clearVault);
  void app.whenReady().then(start).catch(() => {
    dialog.showErrorBox("Thread could not start", "The independent reader requires Linux and its complete desktop build. Run npm run desktop:build, then try again.");
    app.quit();
  });
}
