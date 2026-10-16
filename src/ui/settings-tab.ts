import { App, Modal, PluginSettingTab, Setting, TFolder } from "obsidian";
import type ThreadPlugin from "../main.ts";
import { localEndpoint, roleNames, type FolderRoles } from "../settings/settings.ts";
import { OllamaClient } from "../intelligence/ollama.ts";
import { vaultPath } from "../vault/scope.ts";

interface ConnectionState { controller: AbortController | null; }

function renderSettings(app: App, plugin: ThreadPlugin, containerEl: HTMLElement, connection: ConnectionState): void {
  containerEl.empty();
  containerEl.addClass("thread-settings");
  containerEl.createEl("h2", { text: "Thread" });
  containerEl.createEl("p", { text: "Choose a project and a downloaded local model. Thread checks that Ollama cloud features are disabled before inference." });
  let endpoint = plugin.settings.endpoint;
  let model = plugin.settings.model;
  let semanticSearch = plugin.settings.semanticSearch;
  let embeddingModel = plugin.settings.embeddingModel;
  let project = plugin.settings.selectedProject;
  let exclusions = plugin.settings.excludedPaths.join("\n");
  let allowed = plugin.settings.allowedPaths.join("\n");
  let timeout = String(plugin.settings.timeoutMs / 1000);
  const roles: FolderRoles = {...plugin.settings.roles};
  new Setting(containerEl).setName("Local Ollama endpoint").setDesc("HTTP loopback only. Default: http://127.0.0.1:11434.")
    .addText((text) => { text.inputEl.setAttribute("aria-label", "Local Ollama endpoint"); text.setValue(endpoint).onChange((value) => { endpoint = value; }); });
  new Setting(containerEl).setName("Downloaded model").setDesc("Use the exact model name from ollama list. Tested: qwen3:4b-instruct.")
    .addText((text) => { text.inputEl.setAttribute("aria-label", "Downloaded model"); text.setValue(model).setPlaceholder("qwen3:4b-instruct").onChange((value) => { model = value; }); });
  new Setting(containerEl).setName("Optional semantic search").setDesc("Off by default. Enables Hybrid as an explicit search choice; no background inference or downloads.")
    .addToggle(toggle => { toggle.toggleEl.setAttribute("aria-label", "Optional semantic search"); toggle.setValue(semanticSearch).onChange(value => { semanticSearch = value; }); });
  new Setting(containerEl).setName("Downloaded embedding model").setDesc("Separate from the text model; e.g. qwen3-embedding:0.6b. Derived vectors stay in bounded memory.")
    .addText(text => { text.inputEl.setAttribute("aria-label", "Downloaded embedding model"); text.setValue(embeddingModel).onChange(value => { embeddingModel = value; }); });
  new Setting(containerEl).setName("Project folder").setDesc("Selecting and saving explicitly allows Thread to read Markdown and text in this folder.")
    .addDropdown((dropdown) => {
      dropdown.addOption("", "Choose a folder");
      dropdown.selectEl.setAttribute("aria-label", "Project folder");
      const folders = app.vault.getAllLoadedFiles().filter((file): file is TFolder => file instanceof TFolder && file.path !== "/")
        .map((folder) => folder.path).filter((path) => { try { return vaultPath(path) === path; } catch { return false; } }).sort();
      for (const folder of folders) dropdown.addOption(folder, folder);
      dropdown.setValue(project).onChange((value) => { project = value; });
    });
  new Setting(containerEl).setName("Excluded paths").setDesc("One vault-relative folder or note per line. Exclusions apply before reads.")
    .addTextArea((text) => { text.inputEl.setAttribute("aria-label", "Excluded paths"); text.setValue(exclusions).onChange((value) => { exclusions = value; }); });
  new Setting(containerEl).setName("Allowed read paths").setDesc("One folder or note per line. All allowed paths is an explicit search scope; the selected project is also allowed when saving.")
    .addTextArea(t=>{t.inputEl.setAttribute("aria-label","Allowed read paths");t.setValue(allowed).onChange(v=>allowed=v);});
  new Setting(containerEl).setName("Request timeout in seconds").setDesc("A whole number from 1 to 600.")
    .addText((text) => { text.inputEl.setAttribute("aria-label", "Request timeout in seconds"); text.setValue(timeout).onChange((value) => { timeout = value; }); });
  containerEl.createEl("h3",{text:"Vault folder mapping"});
  containerEl.createEl("p",{text:"Map destinations for new notes. Mapping a folder does not grant model read access. Existing notes stay in place."});
  for(const role of roleNames)new Setting(containerEl).setName(`${role[0]!.toUpperCase()}${role.slice(1)} folder`)
    .addText(t=>{t.inputEl.setAttribute("aria-label",`${role} folder`);t.setValue(roles[role]).setPlaceholder(role[0]!.toUpperCase()+role.slice(1)).onChange(v=>{roles[role]=v;});});
  const feedback = containerEl.createEl("p", { cls: "thread-status", attr: { role: "status", "aria-live": "polite" } });
  new Setting(containerEl).addButton((button) => button.setButtonText("Save settings").setCta().onClick(async () => {
    try {
      const timeoutMs = Number(timeout) * 1000;
      if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 600000) throw new Error("Use a timeout from 1 to 600 seconds.");
      const selectedProject = project ? vaultPath(project) : "";
      await plugin.updateSettings({ ...plugin.settings, endpoint: localEndpoint(endpoint),
        model: model.trim(), semanticSearch, embeddingModel: embeddingModel.trim(), selectedProject, allowedPaths: [...new Set([...allowed.split(/\r?\n/).filter(v=>v.trim()).map(vaultPath),...(selectedProject?[selectedProject]:[])])],
        excludedPaths: exclusions.split(/\r?\n/).filter((value) => value.trim()).map(vaultPath), timeoutMs,
        roles:Object.fromEntries(roleNames.map(role=>[role,roles[role].trim()?vaultPath(roles[role]):""])) as FolderRoles });
      feedback.setText("Settings saved. Open Thread and choose Resume project.");
    } catch (error) { feedback.setText(error instanceof Error ? error.message : "Could not save settings."); }
  })).addButton((button) => button.setButtonText("Test local connection").onClick(async () => {
    connection.controller?.abort();
    const controller = new AbortController(); connection.controller = controller;
    feedback.setText("Checking local Ollama and model...");
    try {
      await new OllamaClient(endpoint, 15000).check(model, controller.signal);
      if (!controller.signal.aborted) feedback.setText("Local model is available and Ollama cloud features are disabled.");
    } catch (error) {
      if (!controller.signal.aborted) feedback.setText(error instanceof Error ? error.message : "Connection failed.");
    }
  }));
  new Setting(containerEl).setName("Starter project").addButton(b=>b.setButtonText("Preview a new workspace").onClick(()=>plugin.openWorkspace()));
  new Setting(containerEl).setName("Derived text index").setDesc("Rebuild from currently allowed notes. Notes, settings, import history, rename metadata and change backups are preserved.")
    .addButton(b=>b.setButtonText("Rebuild text index").onClick(async()=>{
      b.setDisabled(true);feedback.setText("Rebuilding the allowed text index...");
      try{await plugin.resetTextIndex();feedback.setText("Text index rebuilt. Notes and durable history were preserved.");}
      catch(e){feedback.setText(e instanceof Error?e.message:"Could not rebuild the text index. Check vault write access.");}
      finally{b.setDisabled(false);}
    }));
  containerEl.createEl("p", { text: "If cloud status is unavailable, update Ollama. Start it with OLLAMA_NO_CLOUD=1; Thread does not download models or change services." });
}

export class ThreadSettingTab extends PluginSettingTab {
  threadPlugin: ThreadPlugin;
  threadConnection: ConnectionState = { controller: null };
  constructor(app: App, plugin: ThreadPlugin) { super(app, plugin); this.threadPlugin = plugin; }
  display(): void {
    this.threadConnection.controller?.abort();
    renderSettings(this.app, this.threadPlugin, this.containerEl, this.threadConnection);
  }
  hide(): void { this.threadConnection.controller?.abort(); this.threadConnection.controller = null; }
}

export class ThreadSetupModal extends Modal {
  threadPlugin: ThreadPlugin;
  threadConnection: ConnectionState = { controller: null };
  onClosed: () => void;
  constructor(app: App, plugin: ThreadPlugin, onClosed: () => void = () => {}) {
    super(app); this.threadPlugin = plugin; this.onClosed = onClosed;
  }
  onOpen(): void { renderSettings(this.app, this.threadPlugin, this.contentEl, this.threadConnection); }
  onClose(): void { this.threadConnection.controller?.abort(); this.contentEl.empty(); this.onClosed(); }
}
