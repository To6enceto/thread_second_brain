import { Setting } from "obsidian";
import { ThreadModal } from "./thread-modal.ts";
import { searchFilters, searchMethod,searchBudgetControls } from "./search-filters.ts";
import { hybridCoverageText } from "../retrieval/semantic.ts";
import { searchCoverageText } from "../retrieval/search.ts";

export class RecallModal extends ThreadModal {
  onOpen(): void {
    const el=this.contentEl;el.createEl("h2",{text:"Find evidence"});
    el.createEl("p", { text: 'Use words, an explicit note alias, or "quoted phrases". Quoted phrases are required; other words are ranked by relevance.' });
    let query="";let vault=false;let budget:ReturnType<typeof searchBudgetControls>|null=null;
    const edited=(message:string)=>{budget?.reset();this.invalidate(message);};
    new Setting(el).setName("Search text").addText(t=>{t.inputEl.setAttribute("aria-label","Search text");t.inputEl.maxLength=1000;t.onChange(v=>{query=v;edited("Search changed. Find passages again.");});});
    new Setting(el).setName("Search scope").addDropdown(d=>{d.selectEl.setAttribute("aria-label","Search scope");d.addOption("project","Selected project").addOption("vault","All allowed paths").onChange(v=>{vault=v==="vault";edited("Scope changed. Find passages again.");});});
    const filters = searchFilters(el, () => edited("Filters changed. Find passages again."));
    const method=searchMethod(el,this.plugin.settings.semanticSearch,()=>edited("Search method changed. Find passages again."));
    budget=searchBudgetControls(el,()=>this.invalidate("Search budget changed. Find passages again."),()=>{void run();},()=>!this.closed&&this.plugin.active);
    this.status=el.createEl("p",{attr:{role:"status","aria-live":"polite"}});
    const find=el.createEl("button",{text:"Find passages",cls:"mod-cta"});
    const rebuild=el.createEl("button",{text:"Rebuild index"});
    el.createEl("button",{text:"Cancel"}).onclick=()=>edited("Search canceled.");
    this.resultEl=el.createDiv();
    const run=async(force=false)=>{
      if(this.closed)return;this.invalidate();const controller=new AbortController();this.controller=controller;
      find.disabled=true;rebuild.disabled=true;
      this.status?.setText("Reading allowed notes...");
      const settings=structuredClone(this.plugin.settings);
      const requestedQuery=query;const requestedVault=vault;const epoch=this.epoch;
      const requestedFilters=structuredClone(filters),requestedLevel=budget!.level;
      try{
        if(!requestedVault&&!settings.selectedProject)throw new Error("Select a project in Thread Settings first.");
        if(force){await this.plugin.resetTextIndex();this.status?.setText("Text index rebuilt. Find passages again.");return;}
        if(!this.plugin.index.ready)await this.plugin.rebuildIndex();
        if(this.closed||this.epoch!==epoch||!this.plugin.index.ready||JSON.stringify(settings)!==JSON.stringify(this.plugin.settings))return;
        const result=await this.plugin.searchEvidence(requestedQuery,requestedVault,requestedFilters,method.hybrid,settings,controller.signal,()=>!this.closed&&epoch===this.epoch,paths=>this.watchPaths(paths),requestedLevel);
        if(controller.signal.aborted||this.closed||epoch!==this.epoch)return;
        const hits=result.hits;
        this.resultEl?.empty();this.status?.setText(`Keyword lane: ${searchCoverageText(result.coverage)}${result.hybrid?" "+hybridCoverageText(result.hybrid):""}`);
        for(const hit of hits){
          const section=this.resultEl!.createEl("section");
          const open=section.createEl("button",{text:`${hit.entry.path}${hit.heading?` › ${hit.heading}`:""}`});
          section.createEl("p",{text:hit.excerpt});
          section.createEl("p", { text: `Matched terms: ${hit.matchedTerms?.join(", ") || "semantic similarity or required phrase"}.`, cls: "thread-meta" });
          open.onclick=()=>{if(this.closed||epoch!==this.epoch)return;void this.plugin.openIndexedSource(hit.entry.path,hit.entry.hash,hit.heading,()=>!this.closed&&this.epoch===epoch).catch(e=>this.status?.setText(e instanceof Error?e.message:"Source unavailable."));};
        }
      }catch(e){if(!this.closed&&epoch===this.epoch&&!controller.signal.aborted)this.status?.setText(e instanceof Error?e.message:"Recall failed.");}
      finally{if(this.controller===controller)this.controller=null;find.disabled=false;rebuild.disabled=false;}
    };
    find.onclick=()=>{void run();};rebuild.onclick=()=>{void run(true);};
  }
}
