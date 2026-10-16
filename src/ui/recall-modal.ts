import { Setting } from "obsidian";
import { ThreadModal } from "./thread-modal.ts";
import { searchFilters } from "./search-filters.ts";
import { searchCoverageText } from "../retrieval/search.ts";

export class RecallModal extends ThreadModal {
  onOpen(): void {
    const el=this.contentEl;el.createEl("h2",{text:"Find evidence"});
    el.createEl("p", { text: 'Use words, an explicit note alias, or "quoted phrases". Quoted phrases are required; other words are ranked by relevance.' });
    let query="";let vault=false;
    new Setting(el).setName("Search text").addText(t=>{t.inputEl.setAttribute("aria-label","Search text");t.inputEl.maxLength=1000;t.onChange(v=>{query=v;this.invalidate("Search changed. Find passages again.");});});
    new Setting(el).setName("Search scope").addDropdown(d=>{d.selectEl.setAttribute("aria-label","Search scope");d.addOption("project","Selected project").addOption("vault","All allowed paths").onChange(v=>{vault=v==="vault";this.invalidate("Scope changed. Find passages again.");});});
    const filters = searchFilters(el, () => this.invalidate("Filters changed. Find passages again."));
    this.status=el.createEl("p",{attr:{role:"status","aria-live":"polite"}});
    const find=el.createEl("button",{text:"Find passages",cls:"mod-cta"});
    const rebuild=el.createEl("button",{text:"Rebuild index"});
    this.resultEl=el.createDiv();
    const run=async(force=false)=>{
      find.disabled=true;rebuild.disabled=true;
      this.status?.setText("Reading allowed notes...");
      const settings=structuredClone(this.plugin.settings);
      const requestedQuery=query;const requestedVault=vault;const epoch=this.epoch;
      const requestedFilters=structuredClone(filters);
      try{
        if(!requestedVault&&!settings.selectedProject)throw new Error("Select a project in Thread Settings first.");
        if(force||!this.plugin.index.ready)await this.plugin.rebuildIndex();
        if(this.closed||this.epoch!==epoch||!this.plugin.index.ready||JSON.stringify(settings)!==JSON.stringify(this.plugin.settings))return;
        const result=this.plugin.index.search(requestedQuery,settings,requestedVault?null:settings.selectedProject,requestedFilters);
        const hits=result.hits;
        this.resultEl?.empty();this.status?.setText(searchCoverageText(result.coverage));
        for(const hit of hits){
          const section=this.resultEl!.createEl("section");
          const open=section.createEl("button",{text:`${hit.entry.path}${hit.heading?` › ${hit.heading}`:""}`});
          section.createEl("p",{text:hit.excerpt});
          section.createEl("p", { text: `Matched terms: ${hit.matchedTerms?.join(", ") || "required phrase"}.`, cls: "thread-meta" });
          open.onclick=()=>{const epoch=this.epoch;void this.plugin.openIndexedSource(hit.entry.path,hit.entry.hash,hit.heading,()=>!this.closed&&this.epoch===epoch).catch(e=>this.status?.setText(e instanceof Error?e.message:"Source unavailable."));};
        }
      }catch(e){if(!this.closed)this.status?.setText(e instanceof Error?e.message:"Recall failed.");}
      finally{find.disabled=false;rebuild.disabled=false;}
    };
    find.onclick=()=>{void run();};rebuild.onclick=()=>{void run(true);};
  }
}
