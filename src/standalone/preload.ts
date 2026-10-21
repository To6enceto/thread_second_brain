import { contextBridge, ipcRenderer } from "electron";
import type { DesktopBridge } from "./contracts.ts";

const bridge: DesktopBridge = {
  selectVault: () => ipcRenderer.invoke("thread:select-vault"),
  grantScope: (scope, revision) => ipcRenderer.invoke("thread:grant-scope", scope, revision),
  listNotes: revision => ipcRenderer.invoke("thread:list-notes", revision),
  readNote: (path, revision) => ipcRenderer.invoke("thread:read-note", path, revision),
  closeVault: () => ipcRenderer.invoke("thread:close-vault")
};
contextBridge.exposeInMainWorld("threadDesktop", bridge);
