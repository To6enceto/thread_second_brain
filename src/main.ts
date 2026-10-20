import {PdfModal} from "./ui/pdf-modal.ts";
import {ExportModal} from "./ui/export-modal.ts";
import {ProjectImportModal} from "./ui/import-modal.ts";
import {emptyImports,loadProjectImports,importRoot,type ImportState,type ImportPort} from "./portability/import.ts";
import {packagePath,byteHash} from "./portability/format.ts";
import {PACKAGE_LIMITS} from "./portability/format.ts";
import {exportDestination} from "./portability/write.ts";
import type {ExportPort} from "./portability/export.ts";
import {PdfChecks} from "./pdf/checks.ts";
import {readPdfSource,pdfEvidenceText} from "./pdf/record.ts";
import {readPdfOriginal} from "./pdf/original.ts";
import {mayReadPdf} from "./pdf/scope.ts";
import {searchBudget,type SearchLevel} from "./retrieval/budget.ts";
import { IndexModal } from "./ui/index-modal.ts";
import { indexBudget } from "./settings/index-budget.ts";
import { indexCoverage, retainIndexEntries, type IndexReadStats } from "./vault/index-coverage.ts";
import { HealthModal } from "./ui/health-modal.ts";
import { QuestionsModal } from "./ui/questions-modal.ts";
import { ProjectOverviewModal } from "./ui/project-overview-modal.ts";
import { TimelineModal } from "./ui/timeline-modal.ts";
import { questionReviewReferences } from "./vault/review-events.ts";
import { Plugin, TFile, TFolder, FileSystemAdapter, parseYaml, Notice, type Modal, type Editor } from "obsidian";
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
  indexCancelEpoch=0;
  indexListeners=new Set<()=>void>();
  indexProgress:{phase:"idle"|"queued"|"running"|"ready"|"canceled"|"failed";done:number;total:number;detail:string}={phase:"idle",done:0,total:0,detail:"Text index has not started."};
  private indexProgressChanged():void{for(const listener of this.indexListeners)listener();}
  private setIndexProgress(phase:typeof this.indexProgress.phase,done:number,total:number,detail:string):void{this.indexProgress={phase,done,total,detail};this.indexProgressChanged();}
  cancelIndexing():void{
    if(!this.indexUpdates.task&&!this.indexTimer)return;
    this.indexCancelEpoch++;this.indexUpdates.stop();if(this.indexTimer){clearTimeout(this.indexTimer);this.indexTimer=null;}
    this.index.ready=false;this.index.revision++;this.setIndexProgress("canceled",0,0,"Index work canceled. Pending work remains; rebuild explicitly when ready.");
    for(const modal of this.modals)if(modal instanceof ThreadModal)modal.invalidate("Index work canceled. Rebuild or refresh before reuse.");
    for(const leaf of this.app.workspace.getLeavesOfType(THREAD_VIEW))if(leaf.view instanceof BriefingView)leaf.view.invalidate("Index work canceled. Rebuild before Resume.");
  }
  semantic=new SemanticSearch();
  indexUpdates=new IndexUpdates(this.index);
  indexTimer: ReturnType<typeof setTimeout> | null=null;
  cacheWrite: Promise<void>=Promise.resolve();
  imports=new ImportRegistry();
  importsWarning="";
  active=true;
  projectImports:ImportState=emptyImports();
  projectImportsText:string|null=null;
  projectImportsWarning="";
  changes!:ChangeManager;
  changesWarning="";
  changesText="";
  renames:RenameMap={};
  renameWrite:Promise<void>=Promise.resolve();
  changeTicket={context:"",revision:-1,settings:""};

  async onload(): Promise<void> {
    this.active=true;
    this.settings = loadSettings(await this.loadData());
    try{if(await this.app.vault.adapter.exists(this.projectImportsPath())){const text=await this.app.vault.adapter.read(this.projectImportsPath());if(new TextEncoder().encode(text).length>16*1048576)throw Error('History exceeds metadata budget.');this.projectImports=loadProjectImports(JSON.parse(text));this.projectImportsText=text;}}
    catch{this.projectImportsWarning="Project import history is invalid or unavailable. Preserve project-imports.json and restore a known good copy; Thread will not overwrite it.";}
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
    this.registerObsidianProtocolHandler("thread", params => {
      if (!(this.app.vault.adapter instanceof FileSystemAdapter)
        || params.threadVault !== this.app.vault.adapter.getBasePath()) {
        new Notice("Thread launcher vault path does not match. Check vaultPath and vaultId in launcher.json.");
        return;
      }
      this.app.workspace.onLayoutReady(() => {
        if (this.active) void this.openThread().catch(() => new Notice("Thread could not open. Use the Open Thread command to retry."));
      });
    });
    this.settingsTab = new ThreadSettingTab(this.app, this);
    this.addSettingTab(this.settingsTab);
    this.addRibbonIcon("book-open", "Open Thread", () => { void this.openThread(); });
    this.addCommand({ id: "open-thread", name: "Open Thread", callback: () => { void this.openThread(); } });
    this.addCommand({ id: "create-workspace", name: "Create project workspace", callback: () => this.openWorkspace() });
    this.addCommand({ id:"find-evidence",name:"Find evidence",callback:()=>this.openRecall() });
    this.addCommand({ id:"ask-vault",name:"Ask your vault",callback:()=>this.openAsk() });
    this.addCommand({id:"project-questions",name:"Project questions",callback:()=>this.openQuestions()});
    this.addCommand({id:"extract-pdf",name:"Extract local PDF",callback:()=>this.openPdf()});
    this.addCommand({id:"export-project",name:"Export project checkpoint",callback:()=>this.openProjectExport()});
    this.addCommand({id:"import-project",name:"Import project package and recovery",callback:()=>this.openProjectImport()});
    this.addCommand({id:"index-coverage",name:"Text index coverage and budgets",callback:()=>this.openIndexCoverage()});
    this.addCommand({id:"vault-health",name:"Vault health and compatibility",callback:()=>this.openHealth()});
    this.addCommand({id:"all-projects",name:"All permitted projects",callback:()=>this.openProjectOverview()});
    this.addCommand({id:"project-timeline",name:"Project timeline",callback:()=>this.openTimeline()});
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
  openPdf():void{const modal=new PdfModal(this);this.modals.add(modal);modal.open();}
  openProjectExport():void{const modal=new ExportModal(this);this.modals.add(modal);modal.open();}
  openProjectImport():void{const modal=new ProjectImportModal(this);this.modals.add(modal);modal.open();}
  projectImportsPath():string{return `${this.manifest.dir??`${this.app.vault.configDir}/plugins/${this.manifest.id}`}/project-imports.json`;}
  async saveProjectImports(state:ImportState):Promise<void>{
    if(this.projectImportsWarning||!this.active)throw Error(this.projectImportsWarning||'Thread stopped.');
    try{const exists=await this.app.vault.adapter.exists(this.projectImportsPath()),before=exists?await this.app.vault.adapter.read(this.projectImportsPath()):null;if(before!==this.projectImportsText)throw Error('History changed in another instance. Reload Thread.');loadProjectImports(state);const text=JSON.stringify(state);if(new TextEncoder().encode(text).length>16*1048576)throw Error('History metadata budget exceeded.');await this.app.vault.adapter.write(this.projectImportsPath(),text);this.projectImportsText=text;}
    catch(error){this.projectImportsWarning='Project import history could not be saved safely. Preserve project-imports.json and partial copies, then reload Thread to inspect recovery.';throw error;}
  }
  acquireProjectImport():()=>void{
    const app=this.app as typeof this.app&{[key:symbol]:unknown},key=Symbol.for('thread.project-import-lease');if(app[key])throw Error('Another project import or recovery operation is running. Wait for it to finish.');const token={};app[key]=token;return()=>{if(app[key]===token)delete app[key];};
  }
  async readProjectPackage(path:string,current:()=>boolean):Promise<Uint8Array>{
    const check=()=>{packagePath(path);if(!path.endsWith('.thread-project.json')||this.settings.excludedPaths.some(p=>isWithin(path,p))||!this.active||!current())throw Error('Package is unavailable, excluded or changed. Select and validate again.');};check();const file=this.app.vault.getAbstractFileByPath(path);if(!(file instanceof TFile)||file.stat.size>PACKAGE_LIMITS.serializedBytes)throw Error('Select a visible package of at most48 MiB.');const bytes=new Uint8Array(await this.app.vault.readBinary(file));check();if(file.path!==path||this.app.vault.getAbstractFileByPath(path)!==file||bytes.length>PACKAGE_LIMITS.serializedBytes)throw Error('Selected package changed or exceeded its limit.');return bytes;
  }
  projectImportPort(current:()=>boolean):ImportPort{
    const check=(root:string,entries:ImportState['receipts'][number]['entries'])=>{if(!this.active||!current())throw Error('Import preview changed.');importRoot(root,this.settings);const aliases=new Map<string,string>();for(const e of entries){packagePath(e.path);if(!isWithin(e.path,root))throw Error('Invalid destination root.');const parts=e.path.split('/');for(let n=1;n<=parts.length;n++){const path=parts.slice(0,n).join('/');aliases.set(path.toLowerCase(),path);}}
      for(const file of this.app.vault.getAllLoadedFiles()){const expected=aliases.get(file.path.normalize('NFC').toLowerCase());if(expected&&expected!==file.path)throw Error('A destination collides by case or Unicode normalization. Choose a new folder.');}};
    return{current,check,kind:path=>{const file=this.app.vault.getAbstractFileByPath(path);return file instanceof TFile?'file':file instanceof TFolder?'folder':null;},hash:async path=>{if(!current())throw Error('Import changed.');const file=this.app.vault.getAbstractFileByPath(path);if(!(file instanceof TFile)||file.stat.size>PACKAGE_LIMITS.pdfBytes)throw Error('Imported copy is missing or exceeds its limit.');const bytes=new Uint8Array(await this.app.vault.readBinary(file));if(!current()||file.path!==path||bytes.length>PACKAGE_LIMITS.pdfBytes)throw Error('Imported copy changed.');return byteHash(bytes);},persist:state=>this.saveProjectImports(state),folder:async path=>{if(!current())throw Error('Import changed.');await this.app.vault.createFolder(path);},create:async(path,bytes)=>{if(!current())throw Error('Import changed.');await this.app.vault.createBinary(path,Uint8Array.from(bytes).buffer);}};
  }
  projectExportPort(current:()=>boolean):ExportPort{
    const settings=structuredClone(this.settings),snapshot=JSON.stringify(settings);
    const ready=()=>this.active&&current()&&snapshot===JSON.stringify(this.settings);
    const allowed=(path:string)=>ready()&&(readableText(path,settings)||mayReadPdf(path,settings));
    return{current:ready,parse:parseYaml,size:path=>{if(!allowed(path))return null;const file=this.app.vault.getAbstractFileByPath(path);return file instanceof TFile?file.stat.size:null;},
      readText:async path=>{if(!ready()||!readableText(path,settings))throw Error("Export source is outside read scope.");const file=this.app.vault.getAbstractFileByPath(path);if(!(file instanceof TFile)||file.stat.size>PACKAGE_LIMITS.textBytes)throw Error("Export source is missing or exceeds the 2 MiB text limit.");const text=await this.app.vault.read(file);if(!ready()||file.path!==path||!readableText(path,this.settings)||new TextEncoder().encode(text).length>PACKAGE_LIMITS.textBytes)throw Error("Export source changed or exceeded its byte budget.");return text;},
      readPdf:(path,signal)=>this.readPdf(path,settings,signal),resolve:(path,link)=>{const exact=this.app.vault.getAbstractFileByPath(link),file=exact instanceof TFile?exact:this.app.metadataCache.getFirstLinkpathDest(link,path);return file&&allowed(file.path)?file.path:null;}};
  }
  checkProjectPackageDestination(path:string):void{
    if(!this.active)throw Error("Thread stopped. Reopen and preview again.");exportDestination(path,this.settings.excludedPaths);
    const keys=new Set(path.split('/').map((_,i,parts)=>parts.slice(0,i+1).join('/').toLowerCase()));
    for(const file of this.app.vault.getAllLoadedFiles())if(keys.has(file.path.normalize('NFC').toLowerCase())&&!path.startsWith(file.path+'/')&&file.path!==path)throw Error("Destination collides with an existing path by case. Choose a new portable folder/name.");
  }
  async readPdf(path:string,settings:ThreadSettings,signal:AbortSignal):Promise<{hash:string;bytes:ArrayBuffer}>{
    const snapshot=JSON.stringify(settings);return readPdfOriginal(path,settings,{get:path=>{const file=this.app.vault.getAbstractFileByPath(path);return file instanceof TFile?file:null;},read:file=>this.app.vault.readBinary(file)},()=>this.active&&snapshot===JSON.stringify(this.settings),signal);
  }
  private async checkedPdf(checks:PdfChecks,path:string,settings:ThreadSettings,signal:AbortSignal):Promise<string|null>{
    if(!mayReadPdf(path,settings)||JSON.stringify(settings)!==JSON.stringify(this.settings))return null;
    return checks.verify(path,()=>{const file=this.app.vault.getAbstractFileByPath(path);return file instanceof TFile?file.stat.size:null;},()=>this.readPdf(path,settings,signal),signal);
  }
  async readPdfAsset(path:string):Promise<ArrayBuffer>{
    if(!this.active||!(path==="pdf-assets.json"||path==="pdf-extract-worker.js"||/^pdf-resources\/(?:cmaps|standard_fonts)\/[A-Za-z0-9_][A-Za-z0-9_.-]{0,99}$/.test(path)))throw Error("Unsupported local PDF asset.");
    return this.app.vault.adapter.readBinary(`${this.manifest.dir??`${this.app.vault.configDir}/plugins/${this.manifest.id}`}/${path}`);
  }
  openIndexCoverage():void{const modal=new IndexModal(this);this.modals.add(modal);modal.open();}
  openHealth():void{const modal=new HealthModal(this);this.modals.add(modal);modal.open();}
  openProjectOverview():void{const modal=new ProjectOverviewModal(this);this.modals.add(modal);modal.open();}
  openTimeline():void{const modal=new TimelineModal(this);this.modals.add(modal);modal.open();}
  openDecisions(): void {const modal=new DecisionModal(this);this.modals.add(modal);modal.open();}
  openCapture(): void {const modal=new CaptureModal(this);this.modals.add(modal);modal.open();}
  openChanges():void {const modal=new ChangeReviewModal(this);this.modals.add(modal);modal.open();}
  openDecisionReview(path=""):void{const modal=new DecisionReviewModal(this);modal.initialPath=path;this.modals.add(modal);modal.open();}
  openFreshness(path=""):void{const modal=new FreshnessModal(this);modal.initialPath=path;this.modals.add(modal);modal.open();}
  openReviewQueue():void{const modal=new ReviewQueueModal(this);this.modals.add(modal);modal.open();}
  async questionReviewReferences(path:string,hash:string){
    if(!readableText(path,this.settings))throw new Error("Question is unavailable in the current read scope.");
    const file=this.app.vault.getAbstractFileByPath(path);
    if(!(file instanceof TFile))throw new Error("Question is missing. Refresh the queue.");
    const raw=await this.app.vault.read(file);
    if(file.path!==path||!readableText(path,this.settings)||await contentHash(raw)!==hash)throw new Error("Question changed. Refresh the queue.");
    return questionReviewReferences(raw,parseYaml);
  }
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
          if(typeof hash!=="string"||!/^[a-f0-9]{64}$/.test(hash)||!(readableText(path,settings)||mayReadPdf(path,settings)))return false;noteHashes[path]=hash;
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
    return identityFromIndex(this.index.entries,path,this.index.ready,this.index.identityComplete);
  }

  private persistIndex():Promise<void>{
    const revision=this.index.revision,settings=JSON.stringify(this.settings),text=JSON.stringify({schemaVersion:2,entries:this.index.entries,coverage:this.index.coverage});
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
    this.semantic.clear();this.indexUpdates.reset();this.setIndexProgress("queued",0,0,"Index reset. Waiting to read current permitted text files.");
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
    const cancelEpoch=this.indexCancelEpoch;let statsSettings="",startedAt=performance.now(),pdfChecks=new PdfChecks(),pdfEpoch=this.indexUpdates.epoch,stats:IndexReadStats={rawBytesRead:0,filesRead:0,sizeSkips:0,readBudgetSkips:0,elapsedMs:0};
    while(this.active){
      if(cancelEpoch!==this.indexCancelEpoch)throw new DOMException("Index work canceled.","AbortError");
      if(this.index.ready&&!this.indexUpdates.full&&!this.indexUpdates.pending.size)return;
      const settings=structuredClone(this.settings),settingsText=JSON.stringify(settings),epoch=this.indexUpdates.epoch,budget=indexBudget(settings.indexProfile);
      if(epoch!==pdfEpoch){pdfChecks=new PdfChecks();pdfEpoch=epoch;}
      if(settingsText!==statsSettings){statsSettings=settingsText;startedAt=performance.now();stats={rawBytesRead:0,filesRead:0,sizeSkips:0,readBudgetSkips:0,elapsedMs:0};}
      const files=this.app.vault.getFiles().filter(file=>readableText(file.path,settings)).sort((a,b)=>a.path.localeCompare(b.path)),admitted=new Set(files.slice(0,budget.maxFiles).map(file=>file.path));let entryBudgetSkips=0;
      const current=()=>this.active&&cancelEpoch===this.indexCancelEpoch&&epoch===this.indexUpdates.epoch&&settingsText===JSON.stringify(this.settings);
      if(!this.indexUpdates.task)this.setIndexProgress("running",0,admitted.size,"Reading bounded permitted text sections...");
      const coverage=(entries:IndexEntry[])=>{stats.elapsedMs=Math.round(performance.now()-startedAt);return indexCoverage(settings.indexProfile,files.length,admitted.size,entries,stats,entryBudgetSkips);};
      try{
        await this.indexUpdates.flush({scope:settings,current,paths:()=>[...admitted],
          read:async(path,signal)=>{
            signal.throwIfAborted();if(!current()||!readableText(path,this.settings))throw new DOMException("Read scope changed.","AbortError");
            if(!admitted.has(path))return null;const file=this.app.vault.getAbstractFileByPath(path);if(!(file instanceof TFile))return null;
            if(file.stat.size>budget.maxFileBytes){stats.sizeSkips++;return null;}
            if(file.stat.size>budget.maxReadBytes-stats.rawBytesRead){stats.readBudgetSkips++;return null;}
            stats.filesRead++;const text=await this.app.vault.read(file);signal.throwIfAborted();
            if(!current()||file.path!==path||!readableText(path,this.settings))throw new DOMException("Read scope changed.","AbortError");
            if(text.length>budget.maxFileBytes){stats.sizeSkips++;return null;}
            const bytes=new TextEncoder().encode(text).length;stats.rawBytesRead+=bytes;
            if(bytes>budget.maxFileBytes){stats.sizeSkips++;return null;}if(stats.rawBytesRead>budget.maxReadBytes){stats.readBudgetSkips++;return null;}
            const entry=await indexNote({path,text,metadata:readMetadata(text,parseYaml),modifiedAt:file.stat.mtime},target=>this.resolveIndexLink(path,target,settings),{budget,signal});
            if(entry.pdf){const hash=await this.checkedPdf(pdfChecks,entry.pdf.path,settings,signal);signal.throwIfAborted();if(!current())throw new DOMException("PDF snapshot changed.","AbortError");if(hash)this.index.binaries.set(entry.pdf.path,hash);else this.index.binaries.delete(entry.pdf.path);}
            return entry;
          },
          retain:entries=>{
            const complete=this.index.identityComplete,previous=this.index.entries,kept=retainIndexEntries(entries,admitted,budget);entryBudgetSkips=kept.entryBudgetSkips;
            this.index.coverage=coverage(kept.entries);const paths=new Set(kept.entries.map(e=>e.path)),invalidate=new Set([...kept.removed,...previous.filter(e=>!paths.has(e.path)).map(e=>e.path)]);
            if(complete!==this.index.identityComplete)for(const entry of [...previous,...entries])invalidate.add(entry.path);
            return{entries:kept.entries,invalidate};
          },
          published:()=>{this.index.coverage=coverage(this.index.entries);this.indexProgressChanged();},
          progress:(done,total)=>{if(current())this.setIndexProgress("running",done,total,"Processing current permitted files; omissions and byte limits appear in coverage.");},
          resolve:(path,target)=>this.resolveIndexLink(path,target,settings),affected:paths=>this.notifySources(paths),persist:()=>this.persistIndex()});
        if(current()&&this.index.ready&&!this.indexUpdates.full&&!this.indexUpdates.pending.size){this.setIndexProgress("ready",this.indexProgress.done,this.indexProgress.total,"Text index snapshot ready. Inspect coverage before assuming completeness. "+pdfChecks.summary);return;}
      }catch(error){
        if(cancelEpoch!==this.indexCancelEpoch)throw new DOMException("Index work canceled.","AbortError");
        if(!(error instanceof DOMException&&error.name==="AbortError")||!this.active){if(this.active)this.setIndexProgress("failed",0,files.length,"Index work failed. Check vault access and rebuild; original notes and history are preserved.");throw error;}
      }
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
    const settings=structuredClone(this.settings),entry=this.index.entries.find(e=>e.path===path),original=this.index.binaries.get(path);
    if(entry?.pdf||original){
      const bundle=this.withDependencies({sources:[],truncated:false,noteHashes:{[path]:hash}},settings);
      if(!await this.evidenceCurrent(bundle,settings)||!isCurrent()||revision!==this.index.revision)throw Error("PDF evidence changed or access is unavailable. Extract a new source explicitly.");
      const raw=entry?.pdf?await this.app.vault.read(file):null;
      if(raw!==null&&await contentHash(raw)!==hash)throw Error("Extraction note changed. Search again.");
      const pdf=entry?.pdf,requested=heading?Number(/^PDF page (\d+)$/.exec(heading)?.[1]):pdf?.pages.find(p=>p.chars>0)?.page??1;
      if(!Number.isInteger(requested)||pdf&&!pdf.pages.some(p=>p.page===requested))throw Error("The selected PDF page is not in this extraction.");
      const target=this.app.vault.getAbstractFileByPath(pdf?.path??path);
      if(!(target instanceof TFile)||!isCurrent()||revision!==this.index.revision||JSON.stringify(settings)!==JSON.stringify(this.settings)||!mayReadPdf(target.path,this.settings))throw Error("PDF access changed. Search again.");
      await this.app.workspace.getLeaf(false).openFile(target,{eState:{subpath:`#page=${requested}`}});return;
    }
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
    for(const modal of this.modals)if(modal instanceof ProjectImportModal)modal.packageChanged(path,folder);
    if(!folder&&/\.pdf$/i.test(path)&&(mayReadPdf(path,this.settings)||this.index.binaries.has(path)||this.index.entries.some(e=>e.pdf?.path===path))){
      const affected=this.indexUpdates.invalidate([path],this.settings);this.notifySources(affected);void this.persistIndex().catch(()=>new Notice("Thread could not scrub PDF-derived cache. Check vault write access and rebuild."));this.queueIndex();return;
    }
    const allowed=readableText(path,this.settings)||(folder&&this.settings.allowedPaths.some(root=>isWithin(path,root)||isWithin(root,path)||path==="/"));
    if(!allowed)return;
    if(folder){this.scheduleIndex();for(const modal of this.modals)if(modal instanceof ThreadModal)modal.invalidate();
      for(const leaf of this.app.workspace.getLeavesOfType(THREAD_VIEW))if(leaf.view instanceof BriefingView)leaf.view.invalidate("Project folders changed. Refresh the project.");return;}
    if(this.index.coverage?.omittedFiles){
      const paths=new Set([...this.index.entries.map(e=>e.path),path]);this.scheduleIndex();this.notifySources(paths);return;
    }
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
    signal:AbortSignal,isCurrent:()=>boolean=()=>true,watch:(paths:string[])=>void=()=>{},level:SearchLevel="standard"):Promise<SearchResult>{
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
    const budget=searchBudget(level);
    const withCoverage=(result:SearchResult):SearchResult=>({...result,coverage:{...result.coverage,indexOmittedNotes:this.index.coverage?.omittedFiles??0,level:budget.level}});
    const verifyEntries=async(selected:IndexEntry[])=>{const noteHashes=Object.fromEntries(selected.map(e=>[e.path,e.hash]));if(!await this.evidenceCurrent(this.withDependencies({sources:[],truncated:false,noteHashes},settings),settings))throw Error("Search evidence or original PDF changed. Refresh and explicitly re-extract changed PDFs.");assertCurrent();};
    if(!hybrid||!settings.semanticSearch){const result=searchEntries(entries,query,filters,budget.results);await verifyEntries([...new Map(result.hits.map(h=>[h.entry.path,h.entry])).values()]);return withCoverage(result);}
    // Hash only the bounded candidate notes before transmitting their passages.
    const selection=await semanticCandidates(filterEntries(entries,filters),query,budget.level,signal,current),{candidates}=selection;
    await verifyEntries([...new Map(candidates.map(h=>[h.entry.path,h.entry])).values()]);
    for(const entry of new Map(candidates.map(hit=>[hit.entry.path,hit.entry])).values()){
      assertCurrent();
      if(!readableText(entry.path,this.settings))throw new Error("Search source is outside read scope.");
      const file=this.app.vault.getAbstractFileByPath(entry.path);
      if(!(file instanceof TFile))throw new Error("Search source is missing. Refresh the index.");
      const hash=await contentHash(await this.app.vault.read(file));assertCurrent();
      if(file.path!==entry.path||hash!==entry.hash)throw new Error("Search source changed. Refresh the index.");
    }
    const result=await this.semantic.search(entries,query,filters,settings.embeddingModel,new OllamaClient(settings.endpoint,settings.timeoutMs),signal,current,budget.level,selection);await verifyEntries([...new Map(result.hits.map(h=>[h.entry.path,h.entry])).values()]);return withCoverage(result);
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
      const metadata=readMetadata(raw,parseYaml),pdf=entry.pdf?await readPdfSource(raw,metadata):undefined;const projected=outputProjection(raw,metadata);
      notes.push({path,text:pdf?pdfEvidenceText(pdf.extraction):projected.text,metadata,modifiedAt:file.stat.mtime,fullHash,...(pdf?{pdf:pdf.record}:{})});
    }
    const bundle=this.withDependencies(await buildEvidence(notes),settings);signal.throwIfAborted();
    if(!await this.evidenceCurrent(bundle,settings))throw new Error("Supporting evidence changed. Generate again.");signal.throwIfAborted();return bundle;
  }

  async evidenceCurrent(bundle: EvidenceBundle, settings: ThreadSettings): Promise<boolean> {
    if(!this.index.ready)await this.rebuildIndex();
    const graph=this.index.graph(settings),entries=new Map(this.index.entries.map(entry=>[entry.path,entry]));
    for(const [path,hash] of Object.entries(bundle.noteHashes)){
      const state=graph.assess(path);
      if((this.index.binaries.get(path)??entries.get(path)?.hash)!==hash||!state.usable||Object.entries(state.dependencies).some(([dependency,value])=>bundle.noteHashes[dependency]!==value))return false;
    }
    return this.snapshotCurrent(bundle.noteHashes,settings);
  }
  /** Also supports explicit review of stale outputs; does not declare them fresh. */
  async snapshotCurrent(noteHashes:Record<string,string>,settings:ThreadSettings):Promise<boolean>{
    const revision=this.index.revision;
    if (JSON.stringify(settings) !== JSON.stringify(this.settings)) return false;
    const checks=new PdfChecks(),signal=new AbortController().signal;
    for (const [path, hash] of Object.entries(noteHashes)) {
      if(/\.pdf$/i.test(path)){if(await this.checkedPdf(checks,path,settings,signal)!==hash){this.invalidatePath(path);return false;}continue;}
      const file = this.app.vault.getAbstractFileByPath(path);
      if (!(file instanceof TFile) || !readableText(path, this.settings)) return false;
      if (await contentHash(await this.app.vault.read(file)) !== hash) return false;
      if(file.path!==path||!readableText(path,this.settings))return false;
    }
    return revision===this.index.revision&&JSON.stringify(settings)===JSON.stringify(this.settings);
  }
}
