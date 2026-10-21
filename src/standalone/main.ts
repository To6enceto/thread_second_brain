import { app, BrowserWindow, dialog, ipcMain, Menu } from "electron";
import type { IpcMainInvokeEvent } from "electron";
import { join } from "node:path";
import { DesktopSaves } from "./saves.ts";
import { DesktopStorage } from "./storage.ts";
import { DesktopChanges } from "./changes.ts";
import { VaultReader } from "./vault-reader.ts";
import { DesktopAsk } from "./ask.ts";
import { DesktopAI } from "./local-ai.ts";
import { DesktopProjects } from "./projects.ts";
import { EvidenceIndex } from "./evidence-index.ts";
import { assetAllowed, DesktopError, publicFailure, trustedSender } from "./security.ts";
import type { DesktopResult } from "./contracts.ts";

app.setName("Thread Desktop");
app.enableSandbox();
const reader = new VaultReader();
let window: BrowserWindow | null = null;
let ai: DesktopAI;
let ask: DesktopAsk;
let storage: DesktopStorage;
let saves: DesktopSaves;
let changes: DesktopChanges;
const evidence = new EvidenceIndex(reader, event => { if (event.kind === "invalidated") { changes?.invalidate(); saves?.revoke(); ai?.forget(); ask?.forget(); } if (window && !window.webContents.isDestroyed()) window.webContents.send("thread:index-event", event); });
const projects = new DesktopProjects(reader, evidence);
ai = new DesktopAI(projects, evidence);
ask = new DesktopAsk(reader, evidence, projects, ai);
function clearVault(): void { changes?.invalidate(); saves?.revoke(); ask.forget(); ai.reset(); evidence.reset(); reader.close(); void storage?.close(); }
let choosing = false;
const entry = join(__dirname, "app.html");
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
      await storage.close();
      const selected = await reader.select(choice.filePaths[0]); ask.forget(); ai.reset(); evidence.reset(); await storage.initialize(selected.revision); return selected;
    } finally { choosing = false; }
  });
  handle("thread:grant-scope", 2, async (scope, revision) => { const info = reader.grant(scope, revision); ask.forget(); ai.forget(); evidence.reset(); await storage.release(); return info; });
  handle("thread:list-notes", 1, revision => reader.list(revision));
  handle("thread:read-note", 3, (path, revision, hash) => evidence.source(path, revision, hash));
  handle("thread:refresh-index", 1, revision => evidence.refresh(revision, true));
  handle("thread:cancel-index", 1, revision => { evidence.cancel(revision); return null; });
  handle("thread:search-notes", 2, (query, revision) => evidence.search(query, revision));
  handle("thread:resolve-link", 3, (from, target, revision) => evidence.resolve(from, target, revision));
  handle("thread:project-home", 2, (selection, revision) => { ask.forget(); ai.forget(); return projects.home(selection, revision); });
  handle("thread:resume-project", 2, (selection, revision) => { ask.forget(); return ai.prepare(selection, revision); });
  handle("thread:discover-models", 1, endpoint => ai.discover(endpoint));
  handle("thread:configure-ai", 1, settings => { const result = ai.configure(settings); ask.forget(); return result; });
  handle("thread:check-ai", 0, () => ai.check());
  handle("thread:cancel-ai", 0, () => { saves.revoke(); ai.cancel(); return null; });
  handle("thread:interpret-resume", 2, (identity, revision) => ai.interpret(identity, revision));
  handle("thread:retrieve-ask", 2, (request, revision) => { ai.forget(); return ask.retrieve(request, revision); });
  handle("thread:choose-ask", 3, (identity, choices, revision) => { saves.revoke(); return ask.choose(identity, choices, revision); });
  handle("thread:generate-ask", 2, (identity, revision) => { saves.revoke(); return ask.generate(identity, revision); });
  handle("thread:correct-ask", 5, (identity, index, text, kind, revision) => { saves.revoke(); return ask.correct(identity, index, text, kind, revision); });
  handle("thread:continue-ask", 3, (identity, question, revision) => { saves.revoke(); return ask.continue(identity, question, revision); });
  handle("thread:reset-ask", 0, () => { saves.revoke(); ask.forget(); return null; });
  handle("thread:storage-status", 1, revision => storage.status(revision));
  handle("thread:inspect-compatibility", 2, (folder, revision) => storage.inspect(folder, revision));
  handle("thread:enable-writing", 2, (id, revision) => storage.enable(id, revision));
  handle("thread:release-writing", 0, async () => { changes.invalidate(); await storage.release(); return null; });
  handle("thread:save-preferences", 2, (preferences, revision) => { changes.invalidate(); return storage.savePreferences(preferences, revision); });
  handle("thread:import-plugin-copy", 2, (id, revision) => { changes.invalidate(); return storage.importCopy(id, revision); });
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
