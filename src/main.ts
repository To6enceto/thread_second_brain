import { Plugin, TFile, TFolder, parseYaml, type Modal } from "obsidian";
import { WorkspaceModal } from "./ui/workspace-modal.ts";
import { rejectCollisions, writablePath, type NewNote } from "./vault/workspace.ts";
import { defaultSettings, loadSettings, type ThreadSettings } from "./settings/settings.ts";
import { ThreadSettingTab, ThreadSetupModal } from "./ui/settings-tab.ts";
import { BriefingView, THREAD_VIEW } from "./ui/briefing-view.ts";
import { isWithin, readableText, contentHash, affectsProject } from "./vault/scope.ts";
import { buildEvidence, readMetadata, type SourceNote, type EvidenceBundle } from "./vault/evidence.ts";

export default class ThreadPlugin extends Plugin {
  settings: ThreadSettings = defaultSettings();
  settingsTab: ThreadSettingTab | null = null;
  setupModal: ThreadSetupModal | null = null;
  modals = new Set<Modal>();

  async onload(): Promise<void> {
    this.settings = loadSettings(await this.loadData());
    this.registerView(THREAD_VIEW, (leaf) => new BriefingView(leaf, this));
    this.settingsTab = new ThreadSettingTab(this.app, this);
    this.addSettingTab(this.settingsTab);
    this.addRibbonIcon("book-open", "Open Thread", () => { void this.openThread(); });
    this.addCommand({ id: "open-thread", name: "Open Thread", callback: () => { void this.openThread(); } });
    this.addCommand({ id: "create-workspace", name: "Create project workspace", callback: () => this.openWorkspace() });
    this.registerEvent(this.app.vault.on("modify", (file) => this.invalidatePath(file.path, file instanceof TFolder)));
    this.registerEvent(this.app.vault.on("delete", (file) => this.invalidatePath(file.path, file instanceof TFolder)));
    this.registerEvent(this.app.vault.on("create", (file) => this.invalidatePath(file.path, file instanceof TFolder)));
    this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
      this.invalidatePath(oldPath, file instanceof TFolder); this.invalidatePath(file.path, file instanceof TFolder);
    }));
  }

  onunload(): void {
    for (const modal of this.modals) modal.close();
    this.setupModal?.close(); this.settingsTab?.hide();
    for (const leaf of this.app.workspace.getLeavesOfType(THREAD_VIEW)) {
      if (leaf.view instanceof BriefingView) leaf.view.cancelPending();
    }
  }

  openWorkspace(): void {
    const modal=new WorkspaceModal(this);this.modals.add(modal);modal.open();
  }

  async ensureFolder(path: string): Promise<void> {
    let current="";
    for(const part of path.split("/")){
      current=current ? `${current}/${part}` : part;
      const existing=this.app.vault.getAbstractFileByPath(current);
      if(existing && !(existing instanceof TFolder))throw new Error(`A note blocks folder ${current}.`);
      if(!existing)await this.app.vault.createFolder(current);
    }
  }

  async createNotes(notes: NewNote[]): Promise<void> {
    rejectCollisions(notes,path=>Boolean(this.app.vault.getAbstractFileByPath(path)));
    const created:string[]=[];
    try{
      for(const note of notes){
        writablePath(note.path,[...Object.values(this.settings.roles),this.settings.selectedProject],this.settings.excludedPaths);
        await this.ensureFolder(note.path.slice(0,note.path.lastIndexOf("/")));
        await this.app.vault.create(note.path,note.content);created.push(note.path);
      }
    }catch(error){
      throw new Error(`${error instanceof Error?error.message:"Write failed."}${created.length ? ` Partial creation; already created: ${created.join(", ")}. Inspect these notes before retrying.` : ""}`);
    }
  }

  openSetup(): void {
    if (this.setupModal) { this.setupModal.open(); return; }
    const modal = new ThreadSetupModal(this.app, this, () => {
      if (this.setupModal === modal) this.setupModal = null;
    });
    this.setupModal = modal; modal.open();
  }

  async openThread(): Promise<void> {
    let leaf = this.app.workspace.getLeavesOfType(THREAD_VIEW)[0];
    if (!leaf) {
      leaf = this.app.workspace.getRightLeaf(false) ?? undefined;
      if (!leaf) return;
      await leaf.setViewState({ type: THREAD_VIEW, active: true });
    }
    await this.app.workspace.revealLeaf(leaf);
  }

  async updateSettings(settings: ThreadSettings): Promise<void> {
    this.settings = loadSettings(settings);
    for (const leaf of this.app.workspace.getLeavesOfType(THREAD_VIEW)) {
      if (leaf.view instanceof BriefingView) leaf.view.invalidate("Settings changed. Generate a new briefing.");
    }
    await this.saveData(this.settings);
  }

  private invalidatePath(path: string, folder = false): void {
    if (!affectsProject(path, this.settings.selectedProject, this.settings, folder)) return;
    for (const leaf of this.app.workspace.getLeavesOfType(THREAD_VIEW)) {
      if (leaf.view instanceof BriefingView) leaf.view.invalidate(folder
        ? "Project folders changed. Check the selected folder and generate a fresh briefing."
        : "Project notes changed. Generate a fresh briefing.");
    }
  }

  async evidence(settings: ThreadSettings, signal: AbortSignal): Promise<EvidenceBundle> {
    const files = this.app.vault.getFiles().filter((file) => isWithin(file.path, settings.selectedProject)
      && readableText(file.path, settings));
    const notes: SourceNote[] = [];
    for (const file of files) {
      signal.throwIfAborted();
      const text = await this.app.vault.read(file);
      notes.push({ path: file.path, text, metadata: readMetadata(text, parseYaml), modifiedAt: file.stat.mtime });
    }
    return buildEvidence(notes);
  }

  async evidenceCurrent(bundle: EvidenceBundle, settings: ThreadSettings): Promise<boolean> {
    if (JSON.stringify(settings) !== JSON.stringify(this.settings)) return false;
    for (const [path, hash] of Object.entries(bundle.noteHashes)) {
      const file = this.app.vault.getAbstractFileByPath(path);
      if (!(file instanceof TFile) || !readableText(path, this.settings)) return false;
      if (await contentHash(await this.app.vault.read(file)) !== hash) return false;
    }
    return true;
  }
}
