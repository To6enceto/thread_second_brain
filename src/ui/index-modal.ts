import { Setting } from "obsidian";
import { ThreadModal } from "./thread-modal.ts";
import { indexBudget, indexProfiles, type IndexProfile } from "../settings/index-budget.ts";
import { indexCoverageText } from "../vault/index-coverage.ts";

export class IndexModal extends ThreadModal {
  refreshState:()=>void=()=>{};
  override invalidate(message?:string):void{super.invalidate(message);this.watchPaths([]);this.refreshState();}
  onOpen():void {
    const root=this.contentEl;root.createEl("h2",{text:"Text index coverage and budgets"});root.createEl("p",{text:"Inspect current local text coverage. Index work changes only rebuildable cache data. Notes, read grants, settings outside the selected profile and durable history are preserved. Larger profiles use more local CPU, memory and storage; they do not enlarge model context."});
    this.watchPaths([]);let draft:IndexProfile=this.plugin.settings.indexProfile;const description=root.createEl("p",{cls:"thread-meta"});
    const describe=()=>{const budget=indexBudget(draft);description.setText(`Draft ${draft}: ${budget.maxFiles} files; ${budget.maxFileBytes} raw bytes/file; ${budget.maxReadBytes} raw bytes/run; ${budget.maxNoteChars} retained characters and ${budget.maxChunks} passages/note; ${budget.maxSections} nonempty section prefixes retained/note; ${budget.maxEntryBytes} serialized entry bytes. Admission is alphabetical. Overlapping passages count against character budgets.`);};
    new Setting(root).setName("Index budget profile").addDropdown(d=>{d.selectEl.setAttribute("aria-label","Index budget profile");for(const profile of indexProfiles)d.addOption(profile,profile);d.setValue(draft).onChange(value=>{if(this.closed||!indexProfiles.includes(value as IndexProfile))return;draft=value as IndexProfile;describe();});});describe();
    const save=root.createEl("button",{text:"Save index budget profile"});save.onclick=async()=>{
      if(this.closed||save.disabled)return;save.disabled=true;
      try{await this.plugin.updateSettings({...this.plugin.settings,indexProfile:draft});}
      catch(error){if(!this.closed)this.status?.setText(error instanceof Error?error.message:"Could not save profile. Check plugin settings access.");}
      finally{if(!this.closed){save.disabled=false;this.refreshState();}}
    };
    const resume=root.createEl("button",{text:"Resume indexing"}),rebuild=root.createEl("button",{text:"Rebuild text index",cls:"mod-cta"}),cancel=root.createEl("button",{text:"Cancel current indexing"});
    const run=async(full:boolean)=>{
      if(this.closed)return;
      try{if(full)await this.plugin.resetTextIndex();else await this.plugin.rebuildIndex();}
      catch(error){if(!this.closed&&this.plugin.indexProgress.phase!=="canceled")this.status?.setText(error instanceof Error?error.message:"Index unavailable. Inspect scope and rebuild.");}
      finally{if(!this.closed)this.refreshState();}
    };
    resume.onclick=()=>{if(!resume.disabled)void run(false);};rebuild.onclick=()=>{if(!rebuild.disabled)void run(true);};cancel.onclick=()=>{if(!this.closed&&!cancel.disabled)this.plugin.cancelIndexing();};
    this.status=root.createEl("p",{attr:{role:"status","aria-live":"polite"}});this.resultEl=root.createDiv();
    this.refreshState=()=>{
      if(this.closed)return;const progress=this.plugin.indexProgress,busy=progress.phase==="queued"||progress.phase==="running";
      resume.disabled=busy||this.plugin.index.ready;rebuild.disabled=busy;cancel.disabled=!busy;
      this.status?.setText(`Saved profile: ${this.plugin.settings.indexProfile}. ${progress.phase}: ${progress.detail} ${progress.done} of ${progress.total} current-cycle files processed.`);
      const results=this.resultEl!;results.empty();const coverage=this.plugin.index.coverage;
      if(!coverage)results.createEl("p",{text:"No completed coverage snapshot for this scope/profile. Indexing must finish before evidence is reused."});
      else{
        if(!this.plugin.index.ready)results.createEl("p",{text:"Index is unready. The following counts describe a provisional/previous snapshot; evidence reuse is disabled until work finishes."});
        results.createEl("p",{text:indexCoverageText(coverage)});results.createEl("p",{text:`Last index work: ${coverage.filesRead} read attempts; ${coverage.rawBytesRead} completed raw UTF-8 bytes; ${coverage.elapsedMs} ms. Skip attempts: file size ${coverage.sizeSkips}, read budget ${coverage.readBudgetSkips}; file-count omissions ${coverage.fileBudgetSkips}; entry-budget omissions ${coverage.entryBudgetSkips}. Timings depend on this computer and fixture; they are not a vault-size guarantee.`});
      }
      results.createEl("p",{text:"Section processing considers headings outside fences, reserves initial passages across bounded nonempty sections before extras, and keeps full raw hashes. Private evidence blocks and stale generated copies remain excluded. File/read/storage limits can omit notes; omitted text is unknown and stable-ID uniqueness is then unproven. Restore complete coverage for identity-dependent actions."});
      results.createEl("p",{text:"Cancel stops current work without completing a partial snapshot; Resume or Rebuild is explicit. A later ordinary vault event can start fresh work. If files were omitted, later note changes trigger a bounded full scan; otherwise edits reuse unaffected entries. Raw reads use the host's whole-file API with stat checks before reads and size/hash checks afterwards; external growth races are discarded, not streamed."});
      results.createEl("p",{text:"The index can reach later sections beyond the former 50000-character prefix. Search/context still have separate bounds; direct raw-note briefing context currently examines its own 50000-character prefix. A 16000-character model context is never expanded automatically."});
    };
    this.plugin.indexListeners.add(this.refreshState);this.refreshState();
  }
  override onClose():void{this.plugin.indexListeners.delete(this.refreshState);super.onClose();}
}
