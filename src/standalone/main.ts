import { app, BrowserWindow, dialog, ipcMain, Menu } from "electron";
import type { IpcMainInvokeEvent } from "electron";
import { join } from "node:path";
import { VaultReader } from "./vault-reader.ts";
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
const evidence = new EvidenceIndex(reader, event => { if (event.kind === "invalidated") ai?.forget(); if (window && !window.webContents.isDestroyed()) window.webContents.send("thread:index-event", event); });
const projects = new DesktopProjects(reader, evidence);
ai = new DesktopAI(projects, evidence);
function clearVault(): void { ai.reset(); evidence.reset(); reader.close(); }
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
      const selected = await reader.select(choice.filePaths[0]); ai.reset(); evidence.reset(); return selected;
    } finally { choosing = false; }
  });
  handle("thread:grant-scope", 2, (scope, revision) => { const info = reader.grant(scope, revision); ai.forget(); evidence.reset(); return info; });
  handle("thread:list-notes", 1, revision => reader.list(revision));
  handle("thread:read-note", 3, (path, revision, hash) => evidence.source(path, revision, hash));
  handle("thread:refresh-index", 1, revision => evidence.refresh(revision, true));
  handle("thread:cancel-index", 1, revision => { evidence.cancel(revision); return null; });
  handle("thread:search-notes", 2, (query, revision) => evidence.search(query, revision));
  handle("thread:resolve-link", 3, (from, target, revision) => evidence.resolve(from, target, revision));
  handle("thread:project-home", 2, (selection, revision) => { ai.forget(); return projects.home(selection, revision); });
  handle("thread:resume-project", 2, (selection, revision) => ai.prepare(selection, revision));
  handle("thread:discover-models", 1, endpoint => ai.discover(endpoint));
  handle("thread:configure-ai", 1, settings => ai.configure(settings));
  handle("thread:check-ai", 0, () => ai.check());
  handle("thread:cancel-ai", 0, () => { ai.cancel(); return null; });
  handle("thread:interpret-resume", 2, (identity, revision) => ai.interpret(identity, revision));
  handle("thread:close-vault", 0, () => { clearVault(); return null; });
  const monitor = setInterval(() => {
    const selected = reader.getInfo();
    if (selected?.scope.roots.length) void evidence.refresh(selected.revision).catch(() => { /* Safe failure is announced by the index; explicit Refresh resumes. */ });
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
