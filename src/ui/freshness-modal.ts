import { Setting } from "obsidian";
import { ThreadModal } from "./thread-modal.ts";
import { ANSWER_SCHEMA,answerPrompt,validateAnswer } from "../intelligence/answer.ts";
import { OllamaClient } from "../intelligence/ollama.ts";
import { refreshedMarkdown } from "../vault/knowledge.ts";
import { noteName } from "../vault/workspace.ts";
import { readableText } from "../vault/scope.ts";

export class FreshnessModal extends ThreadModal{
  generateButton:HTMLButtonElement|null=null;
  clearChoices:()=>void=()=>{};
  override invalidate(message?:string):void{super.invalidate(message);this.clearChoices();if(this.generateButton)this.generateButton.disabled=true;}
  onOpen():void{
    const el=this.contentEl;el.createEl("h2",{text:"Source freshness"});el.createEl("p",{text:"Checks supporting source notes conservatively: properties or unrelated edits can also require refresh. Stale, missing, excluded or ambiguous dependencies are omitted from AI recall. Stable IDs follow allowed renames; legacy notes use observed rename metadata. Original notes remain unchanged."});
    const outputs=el.createEl("select",{attr:{"aria-label":"Output to refresh"}});const sources=el.createEl("select",{attr:{"aria-label":"Refresh source"}});const selected=new Set<string>();const selectedEl=el.createDiv();let name="";let setName:(value:string)=>void=()=>{};
    const showSelected=()=>{selectedEl.empty();for(const path of selected)selectedEl.createEl("button",{text:`Remove ${path}`}).onclick=()=>{selected.delete(path);this.inputsChanged();showSelected();};};
    new Setting(el).setName("New version note name in Reviews").addText(t=>{t.inputEl.setAttribute("aria-label","Refreshed note name");setName=value=>{name=value;t.setValue(value);};t.onChange(v=>{name=v;this.inputsChanged();});});
    el.createEl("button",{text:"Add refresh source"}).onclick=()=>{if(sources.value&&selected.size<5){selected.add(sources.value);this.inputsChanged();showSelected();}};
    this.generateButton=el.createEl("button",{text:"Generate refreshed version",cls:"mod-cta"});this.generateButton.disabled=true;el.createEl("button",{text:"Cancel refresh generation"}).onclick=()=>{this.inputsChanged();this.status?.setText("Refresh generation canceled.");};
    this.status=el.createEl("p",{attr:{role:"status","aria-live":"polite"}});this.resultEl=el.createDiv();
    el.createEl("button",{text:"Review changes"}).onclick=()=>this.plugin.openChanges();
    this.clearChoices=()=>{selected.clear();showSelected();outputs.replaceChildren(new Option("Refresh freshness status",""));sources.replaceChildren(new Option("Refresh current sources",""));};
    const choose=()=>{
      this.inputsChanged();selected.clear();showSelected();this.resultEl!.empty();
      const settings=this.plugin.settings;const entry=this.plugin.index.entries.find(e=>e.path===outputs.value&&readableText(e.path,settings));
      sources.replaceChildren(new Option("Choose current allowed source",""));
      if(!entry){this.generateButton!.disabled=true;return;}
      setName(`${entry.title.slice(0,80)} refreshed`);const graph=this.plugin.index.graph(settings);const state=graph.assess(entry.path);
      const epoch=this.epoch;this.resultEl!.createEl("h3",{text:`${state.state}: ${entry.path}`});this.resultEl!.createEl("p",{text:state.reason});
      this.resultEl!.createEl("button",{text:"Open original output"}).onclick=()=>{void this.plugin.openIndexedSource(entry.path,entry.hash,"",()=>!this.closed&&epoch===this.epoch).catch(e=>this.status?.setText(String(e)));};
      const eligible=this.plugin.index.projectEntries(settings,null).filter(e=>e.path!==entry.path);
      for(const source of eligible)sources.add(new Option(source.path,source.path));
      for(const ref of state.references){
        const row=this.resultEl!.createDiv();row.createEl("p",{text:`${ref.state}: ${ref.ref.path}${ref.path&&ref.path!==ref.ref.path?` → ${ref.path}`:""}. ${ref.reason}`});
        if(ref.path&&ref.hash){const path=ref.path,hash=ref.hash;row.createEl("button",{text:`Open current source: ${path}`}).onclick=()=>{void this.plugin.openIndexedSource(path,hash,ref.ref.heading,()=>!this.closed&&epoch===this.epoch).catch(e=>this.status?.setText(String(e)));};if(eligible.some(e=>e.path===path)&&selected.size<5)selected.add(path);}
      }
      showSelected();this.generateButton!.disabled=false;this.status?.setText("Review source status. Select up to five current sources, including replacements for unavailable evidence. Generate a new reviewed synthesis in Reviews; the original output will be retained.");
    };
    outputs.onchange=choose;
    const load=async()=>{
      this.invalidate("Checking allowed source notes...");const epoch=this.epoch;const settings=structuredClone(this.plugin.settings);
      try{
        await this.plugin.rebuildIndex();if(this.closed||epoch!==this.epoch||JSON.stringify(settings)!==JSON.stringify(this.plugin.settings))return;
        outputs.replaceChildren(new Option("Choose a generated output",""));const graph=this.plugin.index.graph(settings);let count=0;
        for(const entry of this.plugin.index.entries.filter(e=>e.output&&readableText(e.path,settings))){outputs.add(new Option(`${graph.assess(entry.path).state}: ${entry.path}`,entry.path));count++;}
        this.status?.setText(count?`${count} generated outputs checked. Choose one to inspect.`:"No tracked generated outputs in allowed paths yet.");
      }catch(e){if(!this.closed)this.status?.setText(e instanceof Error?e.message:"Could not inspect freshness.");}
    };
    el.createEl("button",{text:"Refresh freshness status"}).onclick=()=>{void load();};
    this.generateButton.onclick=async()=>{
      if(this.controller)return;const approved={path:outputs.value,name,paths:[...selected]};const settings=structuredClone(this.plugin.settings);this.inputsChanged();const controller=new AbortController();this.controller=controller;const epoch=this.epoch;this.generateButton!.disabled=true;
      const current=()=>!this.closed&&epoch===this.epoch&&!controller.signal.aborted&&JSON.stringify(settings)===JSON.stringify(this.plugin.settings);
      try{
        if(this.plugin.changesWarning)throw new Error(this.plugin.changesWarning);
        if(this.plugin.changes.state.pending||this.plugin.changes.state.recovery)throw new Error("Review pending changes or resolve recovery before generating a new version.");
        const original=this.plugin.index.entries.find(e=>e.path===approved.path&&e.output&&readableText(e.path,settings));if(!original||!this.plugin.index.ready)throw new Error("Refresh freshness status and choose an allowed output first.");
        if(!approved.paths.length)throw new Error("Select at least one current source or an explicit replacement.");
        if(!settings.roles.reviews)throw new Error("Map a Reviews folder and allow it for conflict checks first.");const title=noteName(approved.name);const target=`${settings.roles.reviews}/${title}.md`;
        if(!this.plugin.changePathAllowed(target))throw new Error("Allow the mapped Reviews destination in read paths and keep it outside exclusions.");if(this.app.vault.getAbstractFileByPath(target))throw new Error("That version name already exists. Choose a new name.");
        const bundle=await this.plugin.evidenceFromPaths(approved.paths,settings,controller.signal);if(!bundle.sources.length)throw new Error("No usable current text in selected sources.");if(!current())return;
        this.status?.setText("Generating a refreshed synthesis locally from selected current sources...");
        const raw=await new OllamaClient(settings.endpoint,settings.timeoutMs).generate(settings.model,answerPrompt(`Synthesize current evidence for ${title}. Preserve uncertainty and distinguish facts, interpretations and suggestions.`,bundle),controller.signal,ANSWER_SCHEMA);
        const answer=validateAnswer(raw,bundle);if(!answer.supported)throw new Error(answer.gaps.join(" "));
        if(!current()||!await this.plugin.evidenceCurrent(bundle,settings))throw new Error("Sources changed. Generate again.");if(!current())return;
        const content=refreshedMarkdown(title,answer,bundle,settings.model,original.path,typeof original.metadata.project==="string"?original.metadata.project:"");
        await this.plugin.changes.propose([{path:target,before:null,after:content}],this.plugin.changeContext(bundle,settings),current);
        if(current()){this.status?.setText("New version ready. Review exact contents before applying; the original output is unchanged.");this.plugin.openChanges();}
      }catch(e){if(current())this.status?.setText(e instanceof Error?e.message:"Could not refresh output.");}
      finally{if(this.controller===controller)this.controller=null;if(!this.closed&&epoch===this.epoch)this.generateButton!.disabled=false;}
    };
    void load();
  }
  private inputsChanged():void{super.invalidate("Selection changed. Generate from the current sources.");if(this.generateButton)this.generateButton.disabled=!this.plugin.index.ready;}
}
