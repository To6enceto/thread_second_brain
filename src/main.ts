import { Plugin, TFile, TFolder, parseYaml, Notice, type Modal } from "obsidian";
import { LocalIndex, indexNote, identityFromIndex, type IndexEntry } from "./vault/index.ts";
import { RecallModal } from "./ui/recall-modal.ts";
import { ThreadModal } from "./ui/thread-modal.ts";
import { verifyThenOpenSource } from "./vault/source-link.ts";
import { AskModal } from "./ui/ask-modal.ts";
import { DecisionModal } from "./ui/decision-modal.ts";
import { CaptureModal } from "./ui/capture-modal.ts";
import { ImportRegistry } from "./vault/capture.ts";
import { WorkspaceModal } from "./ui/workspace-modal.ts";
import { writablePath, type NewNote } from "./vault/workspace.ts";
import { createNewNotes } from "./vault/new-notes.ts";
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
  index=new LocalIndex();
  indexController: AbortController | null=null;
  indexTimer: ReturnType<typeof setTimeout> | null=null;
  cacheWrite: Promise<void>=Promise.resolve();
  imports=new ImportRegistry();
  importsWarning="";

  async onload(): Promise<void> {
    this.settings = loadSettings(await this.loadData());
    if(await this.app.vault.adapter.exists(this.importsPath())){
      try{this.imports.load(JSON.parse(await this.app.vault.adapter.read(this.importsPath())));}catch{this.importsWarning="Import history is unavailable. Rebuild it from allowed source notes before importing.";}
    }
    this.registerView(THREAD_VIEW, (leaf) => new BriefingView(leaf, this));
    this.settingsTab = new ThreadSettingTab(this.app, this);
    this.addSettingTab(this.settingsTab);
    this.addRibbonIcon("book-open", "Open Thread", () => { void this.openThread(); });
    this.addCommand({ id: "open-thread", name: "Open Thread", callback: () => { void this.openThread(); } });
    this.addCommand({ id: "create-workspace", name: "Create project workspace", callback: () => this.openWorkspace() });
    this.addCommand({ id:"find-evidence",name:"Find evidence",callback:()=>this.openRecall() });
    this.addCommand({ id:"ask-vault",name:"Ask your vault",callback:()=>this.openAsk() });
    this.addCommand({ id:"decisions",name:"Project decisions",callback:()=>this.openDecisions() });
    this.addCommand({ id:"capture",name:"Capture thought or source",callback:()=>this.openCapture() });
    this.registerEvent(this.app.vault.on("modify", (file) => this.invalidatePath(file.path, file instanceof TFolder)));
    this.registerEvent(this.app.vault.on("delete", (file) => this.invalidatePath(file.path, file instanceof TFolder)));
    this.registerEvent(this.app.vault.on("create", (file) => this.invalidatePath(file.path, file instanceof TFolder)));
    this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
      this.invalidatePath(oldPath, file instanceof TFolder); this.invalidatePath(file.path, file instanceof TFolder);
    }));
    this.scheduleIndex();
  }

  onunload(): void {
    this.index.clear();
    this.indexController?.abort();if(this.indexTimer)clearTimeout(this.indexTimer);
    for (const modal of this.modals) modal.close();
    this.setupModal?.close(); this.settingsTab?.hide();
    for (const leaf of this.app.workspace.getLeavesOfType(THREAD_VIEW)) {
      if (leaf.view instanceof BriefingView) leaf.view.cancelPending();
    }
  }

  openRecall(): void {const modal=new RecallModal(this);this.modals.add(modal);modal.open();}
  openAsk(): void {const modal=new AskModal(this);this.modals.add(modal);modal.open();}
  openDecisions(): void {const modal=new DecisionModal(this);this.modals.add(modal);modal.open();}
  openCapture(): void {const modal=new CaptureModal(this);this.modals.add(modal);modal.open();}
  importsPath(): string {return `${this.manifest.dir??`${this.app.vault.configDir}/plugins/${this.manifest.id}`}/imports.json`;}
  async rebuildImports(): Promise<void> {
    if(this.imports.active.size||this.imports.rebuilding)throw new Error("Wait for pending imports or history rebuild first.");
    this.imports.rebuilding=true;
    try{
      if(!this.index.ready)await this.rebuildIndex();
      const records:Record<string,string>={...this.imports.records};
      for(const entry of this.index.projectEntries(this.settings,null)){
        const hash=entry.metadata.thread_import_hash;
        if(entry.metadata.type==="source"&&typeof hash==="string"&&/^[a-f0-9]{64}$/.test(hash))records[hash]=entry.path;
      }
      await this.imports.queue.catch(()=>{});await this.app.vault.adapter.write(this.importsPath(),JSON.stringify({schemaVersion:1,records}));this.imports.records=records;this.importsWarning="";
    }finally{this.imports.rebuilding=false;}
  }
  projectIdentity(path=this.settings.selectedProject): string {
    return identityFromIndex(this.index.entries,path,this.index.ready);
  }

  private scheduleIndex(): void {
    this.indexController?.abort();this.index.clear();
    this.cacheWrite=this.cacheWrite.catch(()=>{}).then(()=>this.app.vault.adapter.write(this.indexPath(),JSON.stringify({schemaVersion:1,entries:[]})))
      .catch(()=>{new Notice("Thread could not clear its derived index cache. Check vault write access and rebuild.");});
    if(this.indexTimer)clearTimeout(this.indexTimer);
    this.indexTimer=setTimeout(()=>{this.indexTimer=null;void this.rebuildIndex().catch(e=>{if(!(e instanceof DOMException&&e.name==="AbortError"))new Notice("Thread index unavailable. Open Find evidence and rebuild.");});},300);
  }

  private indexPath(): string {return `${this.manifest.dir??`${this.app.vault.configDir}/plugins/${this.manifest.id}`}/index.json`;}

  async rebuildIndex(): Promise<void> {
    if(this.indexTimer){clearTimeout(this.indexTimer);this.indexTimer=null;}
    this.indexController?.abort();const controller=new AbortController();this.indexController=controller;
    const settings=structuredClone(this.settings);const entries:IndexEntry[]=[];
    for(const file of this.app.vault.getFiles().filter(f=>readableText(f.path,settings))){
      controller.signal.throwIfAborted();
      const text=await this.app.vault.read(file);controller.signal.throwIfAborted();
      const note={path:file.path,text,metadata:readMetadata(text,parseYaml),modifiedAt:file.stat.mtime};
      entries.push(await indexNote(note,link=>{
        const target=this.app.metadataCache.getFirstLinkpathDest(link,file.path);
        return target&&readableText(target.path,settings)?target.path:null;
      }));
    }
    controller.signal.throwIfAborted();
    if(JSON.stringify(settings)!==JSON.stringify(this.settings))throw new DOMException("Scope changed","AbortError");
    this.index.entries=entries;this.index.ready=true;
    const revision=this.index.revision;
    this.cacheWrite=this.cacheWrite.catch(()=>{}).then(async()=>{
      if(revision!==this.index.revision||controller.signal.aborted)return;
      await this.app.vault.adapter.write(this.indexPath(),JSON.stringify({schemaVersion:1,entries}));
    });
    await this.cacheWrite;
  }

  async openIndexedSource(path:string,hash:string,heading="",isCurrent:()=>boolean=()=>true): Promise<void> {
    const file=this.app.vault.getAbstractFileByPath(path);
    if(!(file instanceof TFile))throw new Error("Source is missing. Search again.");
    const revision=this.index.revision;
    await verifyThenOpenSource(hash,()=>this.app.vault.read(file),()=>isCurrent()&&revision===this.index.revision&&file.path===path&&readableText(path,this.settings),
      ()=>this.app.workspace.getLeaf(false).openFile(file,{eState:{subpath:heading?`#${heading}`:""}}));
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

  async createNotes(notes: NewNote[],validate:()=>Promise<void>=async()=>{},current:()=>boolean=()=>true): Promise<void> {
    await createNewNotes(notes,{
      exists:path=>Boolean(this.app.vault.getAbstractFileByPath(path)),
      checkPath:path=>{writablePath(path,[...Object.values(this.settings.roles),this.settings.selectedProject],this.settings.excludedPaths);},
      ensureFolder:path=>this.ensureFolder(path),create:(path,content)=>this.app.vault.create(path,content)
    },validate,current);
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
    this.scheduleIndex();
    for(const modal of this.modals)if(modal instanceof ThreadModal)modal.invalidate("Settings changed. Run this action again.");
    for (const leaf of this.app.workspace.getLeavesOfType(THREAD_VIEW)) {
      if (leaf.view instanceof BriefingView) leaf.view.invalidate("Settings changed. Generate a new briefing.");
    }
    await this.saveData(this.settings);
  }

  private invalidatePath(path: string, folder = false): void {
    if(readableText(path,this.settings)||(folder&&this.settings.allowedPaths.some(root=>isWithin(path,root)||isWithin(root,path)||path==="/"))){
      this.scheduleIndex();
      for(const modal of this.modals)if(modal instanceof ThreadModal)modal.invalidate();
    }
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
    const revision=this.index.revision;
    if (JSON.stringify(settings) !== JSON.stringify(this.settings)) return false;
    for (const [path, hash] of Object.entries(bundle.noteHashes)) {
      const file = this.app.vault.getAbstractFileByPath(path);
      if (!(file instanceof TFile) || !readableText(path, this.settings)) return false;
      if (await contentHash(await this.app.vault.read(file)) !== hash) return false;
      if(file.path!==path||!readableText(path,this.settings))return false;
    }
    return revision===this.index.revision&&JSON.stringify(settings)===JSON.stringify(this.settings);
  }
}
