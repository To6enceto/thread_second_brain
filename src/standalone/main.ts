import { app, BrowserWindow, dialog, ipcMain, Menu } from "electron";
import type { IpcMainInvokeEvent } from "electron";
import { join } from "node:path";
import { VaultReader } from "./vault-reader.ts";
import { assetAllowed, DesktopError, publicFailure, trustedSender } from "./security.ts";
import type { DesktopResult } from "./contracts.ts";

app.setName("Thread Desktop");
app.enableSandbox();
const reader = new VaultReader();
let window: BrowserWindow | null = null;
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
  contents.on("did-start-navigation", (_event, _url, _inPlace, mainFrame) => { if (mainFrame) reader.close(); });
  contents.on("render-process-gone", () => reader.close());
  window.on("closed", () => { reader.close(); window = null; });
  window.once("ready-to-show", () => window?.show());

  handle("thread:select-vault", 0, async () => {
    if (choosing || !window) throw new DesktopError("Finish the open folder dialog first.");
    choosing = true;
    const previous = reader.getInfo()?.revision;
    try {
      const choice = await dialog.showOpenDialog(window, { title: "Choose your Obsidian vault folder", properties: ["openDirectory"] });
      if (choice.canceled || !choice.filePaths[0]) return null;
      if (!window || reader.getInfo()?.revision !== previous) throw new DesktopError("The current vault changed. Choose the folder again.");
      return await reader.select(choice.filePaths[0]);
    } finally { choosing = false; }
  });
  handle("thread:grant-scope", 2, (scope, revision) => reader.grant(scope, revision));
  handle("thread:list-notes", 1, revision => reader.list(revision));
  handle("thread:read-note", 2, (path, revision) => reader.read(path, revision));
  handle("thread:close-vault", 0, () => { reader.close(); return null; });
  await window.loadFile(entry);
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", () => { if (window?.isMinimized()) window.restore(); window?.focus(); });
  app.on("window-all-closed", () => app.quit());
  app.on("before-quit", () => reader.close());
  void app.whenReady().then(start).catch(() => {
    dialog.showErrorBox("Thread could not start", "The independent reader requires Linux and its complete desktop build. Run npm run desktop:build, then try again.");
    app.quit();
  });
}
