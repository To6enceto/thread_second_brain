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
  projectHome: (selection, revision) => ipcRenderer.invoke("thread:project-home", selection, revision),
  resumeProject: (selection, revision) => ipcRenderer.invoke("thread:resume-project", selection, revision),
  discoverModels: endpoint => ipcRenderer.invoke("thread:discover-models", endpoint),
  configureAI: settings => ipcRenderer.invoke("thread:configure-ai", settings),
  checkAI: () => ipcRenderer.invoke("thread:check-ai"),
  cancelAI: () => ipcRenderer.invoke("thread:cancel-ai"),
  interpretResume: (identity, revision) => ipcRenderer.invoke("thread:interpret-resume", identity, revision),
  retrieveAsk: (request, revision) => ipcRenderer.invoke("thread:retrieve-ask", request, revision),
  chooseAsk: (identity, choices, revision) => ipcRenderer.invoke("thread:choose-ask", identity, choices, revision),
  generateAsk: (identity, revision) => ipcRenderer.invoke("thread:generate-ask", identity, revision),
  correctAsk: (identity, index, text, kind, revision) => ipcRenderer.invoke("thread:correct-ask", identity, index, text, kind, revision),
  continueAsk: (identity, question, revision) => ipcRenderer.invoke("thread:continue-ask", identity, question, revision),
  resetAsk: () => ipcRenderer.invoke("thread:reset-ask"),
  storageStatus: revision => ipcRenderer.invoke("thread:storage-status", revision),
  inspectCompatibility: (folder, revision) => ipcRenderer.invoke("thread:inspect-compatibility", folder, revision),
  enableWriting: (id, revision) => ipcRenderer.invoke("thread:enable-writing", id, revision),
  releaseWriting: () => ipcRenderer.invoke("thread:release-writing"),
  savePreferences: (preferences, revision) => ipcRenderer.invoke("thread:save-preferences", preferences, revision),
  importPluginCopy: (id, revision) => ipcRenderer.invoke("thread:import-plugin-copy", id, revision),
  previewAskSave: (identity, kind, title, selected, revision) => ipcRenderer.invoke("thread:preview-ask-save", identity, kind, title, selected, revision),
  saveAskPreview: (id, revision) => ipcRenderer.invoke("thread:save-ask-preview", id, revision),
  revokeSavePreview: () => ipcRenderer.invoke("thread:revoke-save-preview"),
  inspectSaveRecovery: (id, revision) => ipcRenderer.invoke("thread:inspect-save-recovery", id, revision),
  resolveSaveRecovery: (id, action, revision) => ipcRenderer.invoke("thread:resolve-save-recovery", id, action, revision),
  changesSnapshot: revision => ipcRenderer.invoke("thread:changes-snapshot", revision),
  beginNoteEdit: (path, stamp, revision) => ipcRenderer.invoke("thread:begin-note-edit", path, stamp, revision),
  proposeNoteEdit: (id, body, revision) => ipcRenderer.invoke("thread:propose-note-edit", id, body, revision),
  previewChange: (action, id, revision) => ipcRenderer.invoke("thread:preview-change", action, id, revision),
  confirmChange: (id, revision) => ipcRenderer.invoke("thread:confirm-change", id, revision),
  reviseChange: (id, bodies, revision) => ipcRenderer.invoke("thread:revise-change", id, bodies, revision),
  rejectChange: (id, revision) => ipcRenderer.invoke("thread:reject-change", id, revision),
  changeDraftEdited: id => ipcRenderer.invoke("thread:change-draft-edited", id),
  invalidateChangeView: () => ipcRenderer.invoke("thread:invalidate-change-view"),
  closeVault: () => ipcRenderer.invoke("thread:close-vault")
};
contextBridge.exposeInMainWorld("threadDesktop", bridge);
