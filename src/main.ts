import { QuestionsModal } from "./ui/questions-modal.ts";
import { Plugin, TFile, TFolder, parseYaml, Notice, type Modal, type Editor } from "obsidian";
import { SelectionModal } from "./ui/selection-modal.ts";
import { savedSelection,selectionAvailable,selectionEvidence,type SelectionAction } from "./vault/selection.ts";
import { LocalIndex, indexNote, identityFromIndex, type IndexEntry } from "./vault/index.ts";
import { IndexUpdates } from "./vault/index-updates.ts";
import { RecallModal } from "./ui/recall-modal.ts";
import { ThreadModal } from "./ui/thread-modal.ts";
import { outputProjection,loadRenames,type RenameMap } from "./vault/freshness.ts";
import { verifyThenOpenSource } from "./vault/source-link.ts";
import { AskModal } from "./ui/ask-modal.ts";
import { DecisionReviewModal } from "./ui/decision-review-modal.ts";
import { DecisionModal } from "./ui/decision-modal.ts";
import { CaptureModal } from "./ui/capture-modal.ts";
import { ImportRegistry } from "./vault/capture.ts";
import { ChangeManager } from "./vault/changes.ts";
import { ChangeReviewModal } from "./ui/change-review-modal.ts";
import { ReviewQueueModal } from "./ui/review-queue-modal.ts";
import { FreshnessModal } from "./ui/freshness-modal.ts";
import { WeeklyModal } from "./ui/weekly-modal.ts";
import { SessionModal } from "./ui/session-modal.ts";
import { KnowledgeModal } from "./ui/knowledge-modal.ts";
import { WorkspaceModal } from "./ui/workspace-modal.ts";
import { writablePath, type NewNote } from "./vault/workspace.ts";
import { createNewNotes } from "./vault/new-notes.ts";
import { defaultSettings, loadSettings, type ThreadSettings } from "./settings/settings.ts";
import { ThreadSettingTab, ThreadSetupModal } from "./ui/settings-tab.ts";
import { BriefingView, THREAD_VIEW } from "./ui/briefing-view.ts";
import { isWithin, readableText, contentHash } from "./vault/scope.ts";
import { buildEvidence, readMetadata, type SourceNote, type EvidenceBundle } from "./vault/evidence.ts";
import { OllamaClient } from "./intelligence/ollama.ts";
import { SemanticSearch, semanticCandidates } from "./retrieval/semantic.ts";
import { filterEntries, searchEntries, type SearchFilters, type SearchResult } from "./retrieval/search.ts";

export default class ThreadPlugin extends Plugin {
  settings: ThreadSettings = defaultSettings();
  settingsTab: ThreadSettingTab | null = null;
  setupModal: ThreadSetupModal | null = null;
  modals = new Set<Modal>();
  index=new LocalIndex();
  semantic=new SemanticSearch();
  indexUpdates=new IndexUpdates(this.index);
  indexTimer: ReturnType<typeof setTimeout> | null=null;
  cacheWrite: Promise<void>=Promise.resolve();
  imports=new ImportRegistry();
  importsWarning="";
  active=true;
  changes!:ChangeManager;
  changesWarning="";
  changesText="";
  renames:RenameMap={};
  renameWrite:Promise<void>=Promise.resolve();
  changeTicket={context:"",revision:-1,settings:""};

  async onload(): Promise<void> {
    this.active=true;
    this.settings = loadSettings(await this.loadData());
    try{if(await this.app.vault.adapter.exists(this.renamesPath()))this.renames=loadRenames(JSON.parse(await this.app.vault.adapter.read(this.renamesPath())));}catch{new Notice("Thread legacy rename metadata is unavailable; stable source IDs still resolve. Check source freshness before reuse.");}
    this.index.renames=this.renames;
    this.changes=this.createChangeManager();
    if(await this.app.vault.adapter.exists(this.changesPath())){
      try{this.changesText=await this.app.vault.adapter.read(this.changesPath());await this.changes.load(JSON.parse(this.changesText));}catch{this.changesWarning="Change history is invalid. Preserve changes.json and recover from a known backup; Thread will not overwrite it.";}
    }else{this.changesText=JSON.stringify(this.changes.state);await this.app.vault.adapter.write(this.changesPath(),this.changesText);}
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
    this.addCommand({id:"project-questions",name:"Project questions",callback:()=>this.openQuestions()});
    this.addCommand({ id:"decisions",name:"Project decisions",callback:()=>this.openDecisions() });
    this.addCommand({id:"decision-evidence-review",name:"Review decision evidence",callback:()=>this.openDecisionReview()});
    this.addCommand({ id:"capture",name:"Capture thought or source",callback:()=>this.openCapture() });
    this.addCommand({id:"review-changes",name:"Review changes and undo",callback:()=>this.openChanges()});
    this.addCommand({id:"project-review-queue",name:"Project review queue",callback:()=>this.openReviewQueue()});
    this.addCommand({id:"source-freshness",name:"Source freshness",callback:()=>this.openFreshness()});
    this.addCommand({id:"weekly-review",name:"Weekly project review",callback:()=>this.openWeekly()});
    this.addCommand({id:"session-wrap-up",name:"Session wrap-up",callback:()=>this.openSession()});
    this.addCommand({id:"knowledge-updates",name:"Knowledge updates",callback:()=>this.openKnowledge()});
    for(const [action,name]of [["ask","Ask about selected text"],["related","Find evidence related to selected text"],["question","Draft a question from selected text"],["decision","Draft a decision from selected text"]] as const){
      this.addCommand({id:`selection-${action}`,name,editorCheckCallback:(checking,editor,view)=>{
        const file=view.file;if(!file||!this.active||!selectionAvailable(file.path,this.settings,()=>editor.getSelection()))return false;
        if(!checking)void this.openSelection(action,editor,file).catch(error=>new Notice(error instanceof Error?error.message:"Could not use selected evidence."));return true;
      }});
    }
    this.registerEvent(this.app.vault.on("modify", (file) => this.invalidatePath(file.path, file instanceof TFolder)));
    this.registerEvent(this.app.vault.on("delete", (file) => this.invalidatePath(file.path, file instanceof TFolder)));
    this.registerEvent(this.app.vault.on("create", (file) => this.invalidatePath(file.path, file instanceof TFolder)));
    this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
      if(readableText(oldPath,this.settings)&&readableText(file.path,this.settings)||file instanceof TFolder&&this.settings.allowedPaths.some(root=>isWithin(oldPath,root)&&isWithin(file.path,root))&&!this.settings.excludedPaths.some(root=>isWithin(oldPath,root)||isWithin(file.path,root))){
        this.renames={...this.renames,[oldPath]:file.path};const keys=Object.keys(this.renames);for(const key of keys.slice(0,Math.max(0,keys.length-2000)))delete this.renames[key];this.index.renames=this.renames;
        const text=JSON.stringify({schemaVersion:1,paths:this.renames});this.renameWrite=this.renameWrite.catch(()=>{}).then(()=>this.app.vault.adapter.write(this.renamesPath(),text)).catch(()=>{new Notice("Thread could not save legacy rename metadata. Stable IDs remain preferred.");});
      }
      this.invalidatePath(oldPath, file instanceof TFolder); this.invalidatePath(file.path, file instanceof TFolder);
    }));
    this.scheduleIndex();
  }

  onunload(): void {
    this.active=false;
    this.index.clear();
    this.semantic.clear();
    this.indexUpdates.stop();if(this.indexTimer)clearTimeout(this.indexTimer);
    for (const modal of this.modals) modal.close();
    this.setupModal?.close(); this.settingsTab?.hide();
    for (const leaf of this.app.workspace.getLeavesOfType(THREAD_VIEW)) {
      if (leaf.view instanceof BriefingView) leaf.view.cancelPending();
    }
  }

  openRecall(): void {const modal=new RecallModal(this);this.modals.add(modal);modal.open();}
  openAsk(): void {const modal=new AskModal(this);this.modals.add(modal);modal.open();}
  openQuestions():void{const modal=new QuestionsModal(this);this.modals.add(modal);modal.open();}
  openDecisions(): void {const modal=new DecisionModal(this);this.modals.add(modal);modal.open();}
  openCapture(): void {const modal=new CaptureModal(this);this.modals.add(modal);modal.open();}
  openChanges():void {const modal=new ChangeReviewModal(this);this.modals.add(modal);modal.open();}
  openDecisionReview(path=""):void{const modal=new DecisionReviewModal(this);modal.initialPath=path;this.modals.add(modal);modal.open();}
  openFreshness(path=""):void{const modal=new FreshnessModal(this);modal.initialPath=path;this.modals.add(modal);modal.open();}
  openReviewQueue():void{const modal=new ReviewQueueModal(this);this.modals.add(modal);modal.open();}
  openWeekly():void{const modal=new WeeklyModal(this);this.modals.add(modal);modal.open();}
  openSession():void{const modal=new SessionModal(this);this.modals.add(modal);modal.open();}
  openKnowledge():void{const modal=new KnowledgeModal(this);this.modals.add(modal);modal.open();}
  async openSelection(action:SelectionAction,editor:Editor,file:TFile):Promise<void>{
    const path=file.path,settings=structuredClone(this.settings);
    if(!this.active||!readableText(path,settings))throw new Error("Select a currently permitted note first.");
    const text=editor.getValue(),from=editor.posToOffset(editor.getCursor("from")),to=editor.posToOffset(editor.getCursor("to"));
    await this.rebuildIndex();
    const current=()=>this.active&&file.path===path&&readableText(path,this.settings)&&JSON.stringify(settings)===JSON.stringify(this.settings)&&editor.getValue()===text;
    if(!current())throw new Error("Source or settings changed. Select saved text again.");
    const entry=this.index.entries.find(entry=>entry.path===path);
    if(!entry||!this.index.graph(settings).assess(path).usable)throw new Error("Selected source is unavailable or needs freshness review.");
    const raw=await this.app.vault.read(file);if(!current())throw new Error("Source or settings changed. Select saved text again.");
    const snapshot=await savedSelection(path,raw,text,from,to,settings,outputProjection(raw,readMetadata(raw,parseYaml)).ranges);
    if(snapshot.hash!==entry.hash||!current())throw new Error("Source changed. Select saved text again.");
    const bundle=this.withDependencies(await selectionEvidence(snapshot,entry.metadata,file.stat.mtime),settings);
    if(!bundle.sources.length||!await this.evidenceCurrent(bundle,settings)||!current())throw new Error("Selected evidence changed or is empty. Select a current passage again.");
    const modal=new SelectionModal(this);modal.sourceSnapshot=snapshot;modal.bundle=bundle;modal.action=action;this.modals.add(modal);modal.open();
  }
  async readReviewedTarget(path:string):Promise<string|null>{return this.readChangeText(path);}
  changePathAllowed(path:string):boolean {try{this.checkChangePath(path);return true;}catch{return false;}}
  async openChangeTarget(path:string):Promise<void>{
    this.checkChangePath(path);const file=this.app.vault.getAbstractFileByPath(path);if(!(file instanceof TFile))throw new Error("The current target note is missing.");
    await this.app.workspace.getLeaf(false).openFile(file);
  }
  importsPath(): string {return `${this.manifest.dir??`${this.app.vault.configDir}/plugins/${this.manifest.id}`}/imports.json`;}
  renamesPath():string{return `${this.manifest.dir??`${this.app.vault.configDir}/plugins/${this.manifest.id}`}/renames.json`;}
  changesPath(): string {return `${this.manifest.dir??`${this.app.vault.configDir}/plugins/${this.manifest.id}`}/changes.json`;}
  changeContext(bundle:EvidenceBundle,settings=this.settings): string {return JSON.stringify({settings,noteHashes:bundle.noteHashes});}
  private checkChangePath(path:string): void {
    if(!this.active)throw new Error("Thread stopped. Reopen it and review recovery.");
    if(this.changesWarning)throw new Error(this.changesWarning);
    writablePath(path,[this.settings.roles.knowledge,this.settings.selectedProject,this.settings.roles.reviews],this.settings.excludedPaths);
    if(!readableText(path,this.settings))throw new Error("Allow this destination in Thread read paths for conflict checks before applying changes.");
    if([this.settings.roles.sources,this.settings.roles.inbox].filter(Boolean).some(root=>isWithin(path,root)))throw new Error("Reviewed updates cannot modify original Inbox or Sources notes.");
  }
  private async readChangeText(path:string): Promise<string|null> {
    this.checkChangePath(path);const file=this.app.vault.getAbstractFileByPath(path);if(!file)return null;
    if(!(file instanceof TFile))throw new Error(`A folder occupies ${path}.`);
    const text=await this.app.vault.read(file);this.checkChangePath(path);
    if(file.path!==path)throw new Error("Target moved during review.");
    if(readMetadata(text,parseYaml).type==="source")throw new Error("Original source notes cannot be changed through reviewed updates.");
    return text;
  }
  private async validateChangeContext(context:string): Promise<boolean> {
    const revision=this.index.revision;const settings=structuredClone(this.settings);const settingsText=JSON.stringify(settings);
    let noteHashes:Record<string,string>={};
    if(context){
      try{
        const data=JSON.parse(context) as {settings:unknown;noteHashes:unknown};
        if(JSON.stringify(data.settings)!==settingsText||!data.noteHashes||typeof data.noteHashes!=="object"||Array.isArray(data.noteHashes))return false;
        for(const [path,hash] of Object.entries(data.noteHashes)){
          if(typeof hash!=="string"||!/^[a-f0-9]{64}$/.test(hash)||!readableText(path,settings))return false;noteHashes[path]=hash;
        }
      }catch{return false;}
    }
    try{if(!this.index.ready)await this.rebuildIndex();noteHashes=this.withDependencies({sources:[],truncated:false,noteHashes},settings).noteHashes;}catch{return false;}
    const valid=await this.evidenceCurrent({sources:[],truncated:false,noteHashes},settings);
    if(!valid||!this.active||revision!==this.index.revision||settingsText!==JSON.stringify(this.settings))return false;
    this.changeTicket={context,revision,settings:settingsText};return true;
  }
  private createChangeManager(): ChangeManager {
    const key=Symbol.for("thread.reviewed-changes.busy");
    const sessions=this.app as unknown as {[key:symbol]:{busy:boolean}|undefined};
    const lease=sessions[key]??{busy:false};sessions[key]=lease;
    return new ChangeManager({
      check:path=>this.checkChangePath(path),read:path=>this.readChangeText(path),
      prepare:async path=>{this.checkChangePath(path);await this.ensureFolder(path.slice(0,path.lastIndexOf("/")));this.checkChangePath(path);},
      create:async(path,content)=>{this.checkChangePath(path);if(readMetadata(content,parseYaml).type==="source")throw new Error("Cannot create a raw source through reviewed updates.");await this.app.vault.create(path,content);},
      replace:async(path,expected,content,currentState=()=>true)=>{
        this.checkChangePath(path);const file=this.app.vault.getAbstractFileByPath(path);if(!(file instanceof TFile))throw new Error(`Target missing: ${path}.`);
        await this.app.vault.process(file,current=>{
          this.checkChangePath(path);
          if(!currentState())throw new Error("Evidence changed while waiting to write. Generate a new proposal.");
          if(file.path!==path||current!==expected)throw new Error(`Concurrent edit at ${path}.`);
          if(readMetadata(current,parseYaml).type==="source"||readMetadata(content,parseYaml).type==="source")throw new Error("Raw sources cannot be updated.");
          return content;
        });
      },
      removeCreated:async(path,expected)=>{
        const revision=this.index.revision;const text=await this.readChangeText(path);this.checkChangePath(path);
        const file=this.app.vault.getAbstractFileByPath(path);
        if(!(file instanceof TFile)||text!==expected||revision!==this.index.revision)throw new Error(`Newer changes prevent undo at ${path}.`);
        await this.app.vault.trash(file,false);
      },
      persist:async(state,currentState=()=>true)=>{
        if(this.changesWarning)throw new Error(this.changesWarning);
        await this.app.vault.adapter.process(this.changesPath(),current=>{
          if(!currentState())throw new Error("Proposal generation canceled before persistence.");
          if(current!==this.changesText)throw new Error("Change history changed in another plugin instance. Reload Thread before continuing.");return state;
        });
        this.changesText=state;
      },
      validateContext:context=>this.validateChangeContext(context),
      contextCurrent:context=>this.active&&this.changeTicket.context===context&&this.changeTicket.revision===this.index.revision&&this.changeTicket.settings===JSON.stringify(this.settings)
    },lease);
  }
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

  private persistIndex():Promise<void>{
    const revision=this.index.revision,settings=JSON.stringify(this.settings),text=JSON.stringify({schemaVersion:1,entries:this.index.entries});
    this.cacheWrite=this.cacheWrite.catch(()=>{}).then(async()=>{
      if(!this.active||revision!==this.index.revision||settings!==JSON.stringify(this.settings))return;
      await this.app.vault.adapter.write(this.indexPath(),text);
    });return this.cacheWrite;
  }
  private queueIndex():void{
    if(this.indexTimer)clearTimeout(this.indexTimer);
    this.indexTimer=setTimeout(()=>{this.indexTimer=null;void this.rebuildIndex().catch(e=>{
      if(!(e instanceof DOMException&&e.name==="AbortError"))new Notice("Thread index unavailable. Rebuild from Thread settings; original notes and history are preserved.");
    });},300);
  }
  private scheduleIndex(): void {
    this.semantic.clear();this.indexUpdates.reset();
    void this.persistIndex().catch(()=>new Notice("Thread could not clear its derived cache. Check vault write access and rebuild."));
    this.queueIndex();
  }
  private indexPath(): string {return `${this.manifest.dir??`${this.app.vault.configDir}/plugins/${this.manifest.id}`}/index.json`;}
  async resetTextIndex():Promise<void>{
    this.scheduleIndex();
    for(const modal of this.modals)if(modal instanceof ThreadModal)modal.invalidate("Text index rebuilding. Refresh this action afterward.");
    for(const leaf of this.app.workspace.getLeavesOfType(THREAD_VIEW))if(leaf.view instanceof BriefingView)leaf.view.invalidate("Text index rebuilding. Generate a fresh briefing afterward.");
    await this.rebuildIndex();
  }
  private resolveIndexLink(path:string,target:string,settings:ThreadSettings):string|null{
    const exact=this.app.vault.getAbstractFileByPath(target);
    if(exact instanceof TFile&&readableText(exact.path,settings))return exact.path;
    const file=this.app.metadataCache.getFirstLinkpathDest(target,path);
    return file&&readableText(file.path,settings)?file.path:null;
  }
  async rebuildIndex(): Promise<void> {
    if(this.indexTimer){clearTimeout(this.indexTimer);this.indexTimer=null;}
    while(this.active){
      const settings=structuredClone(this.settings);
      const current=()=>this.active&&JSON.stringify(settings)===JSON.stringify(this.settings);
      try{
        await this.indexUpdates.flush({scope:settings,current,paths:()=>this.app.vault.getFiles().filter(file=>readableText(file.path,settings)).map(file=>file.path),
          read:async(path,signal)=>{
            signal.throwIfAborted();if(!current()||!readableText(path,this.settings))throw new DOMException("Read scope changed.","AbortError");
            const file=this.app.vault.getAbstractFileByPath(path);if(!(file instanceof TFile))return null;
            const text=await this.app.vault.read(file);signal.throwIfAborted();
            if(!current()||file.path!==path||!readableText(path,this.settings))throw new DOMException("Read scope changed.","AbortError");
            return indexNote({path,text,metadata:readMetadata(text,parseYaml),modifiedAt:file.stat.mtime},target=>this.resolveIndexLink(path,target,settings));
          },resolve:(path,target)=>this.resolveIndexLink(path,target,settings),affected:paths=>this.notifySources(paths),persist:()=>this.persistIndex()});
        if(current()&&this.index.ready&&!this.indexUpdates.full&&!this.indexUpdates.pending.size)return;
      }catch(error){if(!(error instanceof DOMException&&error.name==="AbortError")||!this.active)throw error;}
    }
    throw new DOMException("Thread stopped.","AbortError");
  }
  private notifySources(paths:Set<string>):void{
    this.semantic.invalidate(paths);
    for(const modal of this.modals)if(modal instanceof ThreadModal)modal.invalidatePaths(paths);
    for(const leaf of this.app.workspace.getLeavesOfType(THREAD_VIEW))if(leaf.view instanceof BriefingView)leaf.view.sourcesChanged(paths);
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
    const allowed=readableText(path,this.settings)||(folder&&this.settings.allowedPaths.some(root=>isWithin(path,root)||isWithin(root,path)||path==="/"));
    if(!allowed)return;
    if(folder){this.scheduleIndex();for(const modal of this.modals)if(modal instanceof ThreadModal)modal.invalidate();
      for(const leaf of this.app.workspace.getLeavesOfType(THREAD_VIEW))if(leaf.view instanceof BriefingView)leaf.view.invalidate("Project folders changed. Refresh the project.");return;}
    const affected=this.indexUpdates.invalidate([path],this.settings);
    this.notifySources(affected);
    void this.persistIndex().catch(()=>new Notice("Thread could not scrub its derived cache. Check vault write access and rebuild."));
    this.queueIndex();
  }

  withDependencies(bundle:EvidenceBundle,settings:ThreadSettings):EvidenceBundle{
    if(!this.index.ready||JSON.stringify(settings)!==JSON.stringify(this.settings))throw new Error("Evidence index or scope changed. Refresh and try again.");
    const graph=this.index.graph(settings);const noteHashes={...bundle.noteHashes};
    for(const path of Object.keys(bundle.noteHashes)){
      const state=graph.assess(path);if(!state.usable)throw new Error(`Saved output needs source review: ${path}. Open Source freshness.`);
      for(const [dependency,hash]of Object.entries(state.dependencies)){
        if(noteHashes[dependency]&&noteHashes[dependency]!==hash)throw new Error("Source snapshots disagree. Rebuild the index and generate again.");noteHashes[dependency]=hash;
      }
    }
    return {...bundle,noteHashes};
  }
  async searchEvidence(query:string,vault:boolean,filters:SearchFilters,hybrid:boolean,settings:ThreadSettings,
    signal:AbortSignal,isCurrent:()=>boolean=()=>true,watch:(paths:string[])=>void=()=>{}):Promise<SearchResult>{
    if(!this.index.ready)await this.rebuildIndex();
    let snapshot:IndexEntry[]=[];
    const current=()=>{
      if(!this.active||!isCurrent()||JSON.stringify(settings)!==JSON.stringify(this.settings))return false;
      const graph=this.index.graph(settings),entries=new Map(this.index.entries.map(entry=>[entry.path,entry]));
      return snapshot.every(entry=>entries.get(entry.path)===entry&&graph.assess(entry.path).usable);
    };
    const assertCurrent=()=>{signal.throwIfAborted();if(!current())throw new DOMException("Search changed. Search again.","AbortError");};
    assertCurrent();
    const entries=this.index.projectEntries(settings,vault?null:settings.selectedProject);
    snapshot=filterEntries(entries,filters);
    const graph=this.index.graph(settings);
    watch([...new Set(snapshot.flatMap(entry=>[entry.path,...Object.keys(graph.assess(entry.path).dependencies)]))]);
    if(!hybrid||!settings.semanticSearch)return searchEntries(entries,query,filters);
    // Hash only the bounded candidate notes before transmitting their passages.
    const candidates=semanticCandidates(filterEntries(entries,filters),query).candidates;
    for(const entry of new Map(candidates.map(hit=>[hit.entry.path,hit.entry])).values()){
      assertCurrent();
      if(!readableText(entry.path,this.settings))throw new Error("Search source is outside read scope.");
      const file=this.app.vault.getAbstractFileByPath(entry.path);
      if(!(file instanceof TFile))throw new Error("Search source is missing. Refresh the index.");
      const hash=await contentHash(await this.app.vault.read(file));assertCurrent();
      if(file.path!==entry.path||hash!==entry.hash)throw new Error("Search source changed. Refresh the index.");
    }
    return this.semantic.search(entries,query,filters,settings.embeddingModel,new OllamaClient(settings.endpoint,settings.timeoutMs),signal,current);
  }
  async evidence(settings:ThreadSettings,signal:AbortSignal):Promise<EvidenceBundle>{
    if(!this.index.ready)await this.rebuildIndex();signal.throwIfAborted();
    if(JSON.stringify(settings)!==JSON.stringify(this.settings))throw new Error("Read scope changed.");
    const paths=this.index.projectEntries(settings,settings.selectedProject).map(e=>e.path);
    return this.evidenceFromPaths(paths,settings,signal);
  }
  async evidenceFromPaths(paths:string[],settings:ThreadSettings,signal:AbortSignal):Promise<EvidenceBundle>{
    if(!this.index.ready)await this.rebuildIndex();signal.throwIfAborted();
    const notes:SourceNote[]=[];const graph=this.index.graph(settings);
    for(const path of [...new Set(paths)]){
      signal.throwIfAborted();if(JSON.stringify(settings)!==JSON.stringify(this.settings)||!readableText(path,settings))throw new Error("Source is outside current read scope.");
      const entry=this.index.entries.find(e=>e.path===path);if(!entry||!graph.assess(path).usable)throw new Error(`Source unavailable or needs freshness review: ${path}.`);
      const file=this.app.vault.getAbstractFileByPath(path);if(!(file instanceof TFile))throw new Error(`Source missing: ${path}.`);
      const raw=await this.app.vault.read(file);signal.throwIfAborted();if(file.path!==path)throw new Error("Source moved while reading.");
      const fullHash=await contentHash(raw);if(fullHash!==entry.hash)throw new Error("Source changed since indexing. Rebuild and try again.");
      const metadata=readMetadata(raw,parseYaml);const projected=outputProjection(raw,metadata);
      notes.push({path,text:projected.text,metadata,modifiedAt:file.stat.mtime,fullHash});
    }
    const bundle=this.withDependencies(await buildEvidence(notes),settings);signal.throwIfAborted();
    if(!await this.evidenceCurrent(bundle,settings))throw new Error("Supporting evidence changed. Generate again.");signal.throwIfAborted();return bundle;
  }

  async evidenceCurrent(bundle: EvidenceBundle, settings: ThreadSettings): Promise<boolean> {
    if(!this.index.ready)await this.rebuildIndex();
    const graph=this.index.graph(settings),entries=new Map(this.index.entries.map(entry=>[entry.path,entry]));
    for(const [path,hash] of Object.entries(bundle.noteHashes)){
      const state=graph.assess(path);
      if(entries.get(path)?.hash!==hash||!state.usable||Object.entries(state.dependencies).some(([dependency,value])=>bundle.noteHashes[dependency]!==value))return false;
    }
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
