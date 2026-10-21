import { contextBridge, ipcRenderer } from "electron";
import type { DesktopBridge, IndexEvent } from "./contracts.ts";

const bridge: DesktopBridge = {
  selectVault: () => ipcRenderer.invoke("thread:select-vault"),
  grantScope: (scope, revision) => ipcRenderer.invoke("thread:grant-scope", scope, revision),
  listNotes: revision => ipcRenderer.invoke("thread:list-notes", revision),
  readNote: (path, revision, expectedHash) => ipcRenderer.invoke("thread:read-note", path, revision, expectedHash),
  refreshIndex: revision => ipcRenderer.invoke("thread:refresh-index", revision),
  cancelIndex: revision => ipcRenderer.invoke("thread:cancel-index", revision),
  searchNotes: (query, revision) => ipcRenderer.invoke("thread:search-notes", query, revision),
  resolveLink: (from, target, revision) => ipcRenderer.invoke("thread:resolve-link", from, target, revision),
  onIndexEvent: listener => {
    const receive = (_event: Electron.IpcRendererEvent, data: IndexEvent): void => listener(data);
    ipcRenderer.on("thread:index-event", receive);
    return () => { ipcRenderer.removeListener("thread:index-event", receive); };
  },
  closeVault: () => ipcRenderer.invoke("thread:close-vault")
};
contextBridge.exposeInMainWorld("threadDesktop", bridge);
