import { Setting } from "obsidian";
import { ThreadModal } from "./thread-modal.ts";
import { NewNoteModal } from "./new-note-modal.ts";
import { buildEvidence, contextCoverageText, type EvidenceBundle } from "../vault/evidence.ts";
import { hitsToNotes } from "../vault/index.ts";
import { OllamaClient } from "../intelligence/ollama.ts";
import { ANSWER_SCHEMA, answerPrompt, validateAnswer, answerMarkdown, type Answer } from "../intelligence/answer.ts";
import { localDay, noteName } from "../vault/workspace.ts";
import type { ThreadSettings } from "../settings/settings.ts";
import { searchFilters, searchMethod } from "./search-filters.ts";
import { hybridCoverageText } from "../retrieval/semantic.ts";
import { searchCoverageText, type SearchFilters } from "../retrieval/search.ts";

export class AskModal extends ThreadModal {
  answer: Answer | null=null;
  bundle: EvidenceBundle | null=null;
  askButton: HTMLButtonElement | null=null;
  override invalidate(message?:string): void {super.invalidate(message);this.answer=null;this.bundle=null;if(this.askButton)this.askButton.disabled=false;}
  onOpen(): void {
    const el=this.contentEl;el.createEl("h2",{text:"Ask your vault"});
    el.createEl("p",{text:"Answers use the chosen retrieval method within your explicit read scope. A valid citation identifies a passage; check whether it supports the claim."});
    let question="";let vault=false;
    new Setting(el).setName("Question").addTextArea(t=>{t.inputEl.setAttribute("aria-label","Question");t.inputEl.maxLength=1000;t.onChange(v=>{question=v;this.invalidate("Question changed. Ask again.");});});
    new Setting(el).setName("Answer scope").addDropdown(d=>{d.selectEl.setAttribute("aria-label","Answer scope");d.addOption("project","Selected project").addOption("vault","All allowed paths").onChange(v=>{vault=v==="vault";this.invalidate("Scope changed. Ask again.");});});
    const filters=searchFilters(el,()=>this.invalidate("Filters changed. Ask again."));
    const method=searchMethod(el,this.plugin.settings.semanticSearch,()=>this.invalidate("Search method changed. Ask again."));
    this.status=el.createEl("p",{attr:{role:"status","aria-live":"polite"}});
    this.askButton=el.createEl("button",{text:"Ask locally",cls:"mod-cta"});
    el.createEl("button",{text:"Cancel"}).onclick=()=>this.invalidate("Generation canceled. You can ask again.");
    this.resultEl=el.createDiv();
    this.askButton.onclick=()=>{void this.run(question.trim(),vault,structuredClone(filters),method.hybrid);};
  }
  async run(question:string,vault:boolean,filters:SearchFilters={},hybrid=false): Promise<void> {
    if(this.closed)return;
    this.invalidate();const epoch=this.epoch;const settings=structuredClone(this.plugin.settings);
    if(!question||question.length>1000){this.status?.setText("Enter a question of up to 1000 characters.");return;}
    if(!vault&&!settings.selectedProject){this.status?.setText("Select a project in Settings first.");return;}
    const controller=new AbortController();this.controller=controller;this.askButton!.disabled=true;
    this.status?.setText("Finding allowed evidence and generating locally...");
    try{
      if(!this.plugin.index.ready)await this.plugin.rebuildIndex();controller.signal.throwIfAborted();
      const search=await this.plugin.searchEvidence(question,vault,filters,hybrid,settings,controller.signal,()=>!this.closed&&epoch===this.epoch);
      const bundle=this.plugin.withDependencies({...await buildEvidence(hitsToNotes(search.hits)),searchCoverage:search.coverage,hybridCoverage:search.hybrid},settings);controller.signal.throwIfAborted();
      if(!await this.plugin.evidenceCurrent(bundle,settings))throw new Error("Supporting sources changed. Ask again.");controller.signal.throwIfAborted();
      let answer:Answer;
      if(!bundle.sources.length)answer={supported:false,answer:[],gaps:["No matching eligible passages. Try more specific words or change the allowed scope."]};
      else{
        const raw=await new OllamaClient(settings.endpoint,settings.timeoutMs).generate(settings.model,answerPrompt(question,bundle),controller.signal,ANSWER_SCHEMA);
        answer=validateAnswer(raw,bundle);
      }
      const current=await this.plugin.evidenceCurrent(bundle,settings);
      if(this.closed||epoch!==this.epoch||controller.signal.aborted)return;
      if(!current)throw new Error("Evidence changed. Ask again.");
      this.answer=answer;this.bundle=bundle;this.renderAnswer(question,vault,answer,bundle,settings,epoch);
      this.status?.setText(answer.supported?"Answer ready. Check the supporting passages.":"The available evidence does not establish an answer.");
    }catch(e){if(!this.closed&&epoch===this.epoch&&!controller.signal.aborted)this.status?.setText(e instanceof Error?e.message:"Could not answer.");}
    finally{if(this.controller===controller){this.controller=null;this.askButton!.disabled=false;}}
  }
  private renderAnswer(question:string,vault:boolean,answer:Answer,bundle:EvidenceBundle,settings:ThreadSettings,epoch:number): void {
    const root=this.resultEl!;root.empty();
    if(bundle.searchCoverage)root.createEl("p",{text:`Keyword lane: ${searchCoverageText(bundle.searchCoverage)}`,cls:"thread-meta"});
    if(bundle.hybridCoverage)root.createEl("p",{text:hybridCoverageText(bundle.hybridCoverage),cls:"thread-meta"});
    root.createEl("p",{text:contextCoverageText(bundle),cls:"thread-meta"});
    for(const claim of answer.answer){
      root.createEl("p",{text:`${claim.kind}: ${claim.text}`});
      for(const id of claim.sourceIds){const source=bundle.sources.find(s=>s.id===id)!;
        root.createEl("button",{text:`${id}: ${source.path}${source.heading?` › ${source.heading}`:""}`}).onclick=()=>{
          void this.plugin.openIndexedSource(source.path,bundle.noteHashes[source.path]!,source.heading,()=>!this.closed&&this.epoch===epoch).catch(e=>this.status?.setText(e instanceof Error?e.message:"Source unavailable."));
        };
      }
    }
    root.createEl("h3",{text:"Evidence gaps"});for(const gap of answer.gaps)root.createEl("p",{text:gap});
    if(!answer.supported)return;
    let name=`Answer ${localDay()} ${crypto.randomUUID().slice(0,8)}`;
    new Setting(root).setName("New answer note name").addText(t=>{t.inputEl.setAttribute("aria-label","New answer note name");t.setValue(name).onChange(v=>name=v);});
    root.createEl("button",{text:"Preview answer note"}).onclick=()=>{
      try{
        if(this.closed||this.epoch!==epoch)throw new Error("Answer changed. Ask again.");
        const folder=vault?settings.roles.knowledge:settings.selectedProject;
        if(!folder)throw new Error("Map a Knowledge folder in Settings to save vault-wide answers.");
        const path=`${folder}/Answers/${noteName(name)}.md`;
        const content=answerMarkdown(question,answer,bundle,settings.model,vault?"":this.plugin.projectIdentity(settings.selectedProject));
        const modal=new NewNoteModal(this.plugin,{path,content},()=>this.plugin.evidenceCurrent(bundle,settings));
        this.plugin.modals.add(modal);modal.open();
      }catch(e){this.status?.setText(e instanceof Error?e.message:"Preview failed.");}
    };
  }
}
