import { App, Modal, PluginSettingTab, Setting, TFolder } from "obsidian";
import type ThreadPlugin from "../main.ts";
import { localEndpoint } from "../settings/settings.ts";
import { OllamaClient } from "../intelligence/ollama.ts";
import { vaultPath } from "../vault/scope.ts";

interface ConnectionState { controller: AbortController | null; }

function renderSettings(app: App, plugin: ThreadPlugin, containerEl: HTMLElement, connection: ConnectionState): void {
  containerEl.empty();
  containerEl.createEl("h2", { text: "Thread" });
  containerEl.createEl("p", { text: "Choose a project and a downloaded local model. Thread checks that Ollama cloud features are disabled before inference." });
  let endpoint = plugin.settings.endpoint;
  let model = plugin.settings.model;
  let project = plugin.settings.selectedProject;
  let exclusions = plugin.settings.excludedPaths.join("\n");
  let timeout = String(plugin.settings.timeoutMs / 1000);
  new Setting(containerEl).setName("Local Ollama endpoint").setDesc("HTTP loopback only. Default: http://127.0.0.1:11434.")
    .addText((text) => { text.inputEl.setAttribute("aria-label", "Local Ollama endpoint"); text.setValue(endpoint).onChange((value) => { endpoint = value; }); });
  new Setting(containerEl).setName("Downloaded model").setDesc("Use the exact model name from ollama list, such as qwen3:4b.")
    .addText((text) => { text.inputEl.setAttribute("aria-label", "Downloaded model"); text.setValue(model).setPlaceholder("qwen3:4b").onChange((value) => { model = value; }); });
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
  new Setting(containerEl).setName("Request timeout in seconds").setDesc("A whole number from 1 to 600.")
    .addText((text) => { text.inputEl.setAttribute("aria-label", "Request timeout in seconds"); text.setValue(timeout).onChange((value) => { timeout = value; }); });
  const feedback = containerEl.createEl("p", { cls: "thread-status", attr: { role: "status", "aria-live": "polite" } });
  new Setting(containerEl).addButton((button) => button.setButtonText("Save settings").setCta().onClick(async () => {
    try {
      const timeoutMs = Number(timeout) * 1000;
      if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 600000) throw new Error("Use a timeout from 1 to 600 seconds.");
      const selectedProject = project ? vaultPath(project) : "";
      await plugin.updateSettings({ ...plugin.settings, endpoint: localEndpoint(endpoint),
        model: model.trim(), selectedProject, allowedPaths: selectedProject ? [selectedProject] : [],
        excludedPaths: exclusions.split(/\r?\n/).filter((value) => value.trim()).map(vaultPath), timeoutMs });
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
