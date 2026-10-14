import { Setting } from "obsidian";
import { ThreadModal } from "./thread-modal.ts";

export class RecallModal extends ThreadModal {
  onOpen(): void {
    const el=this.contentEl;el.createEl("h2",{text:"Find evidence"});
    let query="";let vault=false;
    new Setting(el).setName("Search text").addText(t=>{t.inputEl.setAttribute("aria-label","Search text");t.onChange(v=>{query=v;this.invalidate("Search changed. Find passages again.");});});
    new Setting(el).setName("Search scope").addDropdown(d=>{d.selectEl.setAttribute("aria-label","Search scope");d.addOption("project","Selected project").addOption("vault","All allowed paths").onChange(v=>{vault=v==="vault";this.invalidate("Scope changed. Find passages again.");});});
    this.status=el.createEl("p",{attr:{role:"status","aria-live":"polite"}});
    const find=el.createEl("button",{text:"Find passages",cls:"mod-cta"});
    const rebuild=el.createEl("button",{text:"Rebuild index"});
    this.resultEl=el.createDiv();
    const run=async(force=false)=>{
      find.disabled=true;rebuild.disabled=true;
      this.status?.setText("Reading allowed notes...");
      const settings=structuredClone(this.plugin.settings);
      const requestedQuery=query;const requestedVault=vault;const epoch=this.epoch;
      try{
        if(!requestedVault&&!settings.selectedProject)throw new Error("Select a project in Thread Settings first.");
        if(force||!this.plugin.index.ready)await this.plugin.rebuildIndex();
        if(this.closed||this.epoch!==epoch||!this.plugin.index.ready||JSON.stringify(settings)!==JSON.stringify(this.plugin.settings))return;
        const hits=this.plugin.index.recall(requestedQuery,settings,requestedVault?null:settings.selectedProject);
        this.resultEl?.empty();this.status?.setText(`${hits.length} matching passages. Text matching covers the first 50000 characters per note; no semantic search.`);
        for(const hit of hits){
          const section=this.resultEl!.createEl("section");
          const open=section.createEl("button",{text:`${hit.entry.path}${hit.heading?` › ${hit.heading}`:""}`});
          section.createEl("p",{text:hit.excerpt});
          open.onclick=()=>{const epoch=this.epoch;void this.plugin.openIndexedSource(hit.entry.path,hit.entry.hash,hit.heading,()=>!this.closed&&this.epoch===epoch).catch(e=>this.status?.setText(e instanceof Error?e.message:"Source unavailable."));};
        }
      }catch(e){if(!this.closed)this.status?.setText(e instanceof Error?e.message:"Recall failed.");}
      finally{find.disabled=false;rebuild.disabled=false;}
    };
    find.onclick=()=>{void run();};rebuild.onclick=()=>{void run(true);};
  }
}
