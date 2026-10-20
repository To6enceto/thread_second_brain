import { Setting } from "obsidian";
import { ThreadModal } from "./thread-modal.ts";
import { NewNoteModal } from "./new-note-modal.ts";
import { buildEvidence,contextCoverageText,type EvidenceBundle } from "../vault/evidence.ts";
import { selectContext,type EvidenceChoice } from "../vault/workbench.ts";
import { hitsToNotes } from "../vault/index.ts";
import { OllamaClient } from "../intelligence/ollama.ts";
import { ANSWER_SCHEMA,answerPrompt,validateAnswer,type Answer } from "../intelligence/answer.ts";
import { claimLabel, decisionContext } from "../intelligence/claims.ts";
import { createAnswerRecord, reviewedAnswerMarkdown, validateCorrection, type ClaimCorrections } from "../vault/answer-record.ts";
import type { Claim } from "../intelligence/briefing.ts";
import { localDay,noteName } from "../vault/workspace.ts";
import type { ThreadSettings } from "../settings/settings.ts";
import type {SearchLevel} from "../retrieval/budget.ts";
import { searchFilters,searchMethod,searchBudgetControls } from "./search-filters.ts";
import { hybridCoverageText } from "../retrieval/semantic.ts";
import { searchCoverageText,type SearchFilters } from "../retrieval/search.ts";

interface PreparedContext {question:string;vault:boolean;settings:ThreadSettings;candidates:EvidenceBundle;choices:Record<string,EvidenceChoice>;}
export class AskModal extends ThreadModal {
  answer:Answer|null=null;
  bundle:EvidenceBundle|null=null;
  askButton:HTMLButtonElement|null=null;
  private prepared:PreparedContext|null=null;
  private inputs=0;
  private corrections:ClaimCorrections={};
  private previews=new Set<NewNoteModal>();
  private revokePreviews(message:string):void{for(const preview of this.previews)if(!preview.closed)preview.invalidate(message);this.previews.clear();}
  override invalidate(message?:string):void{super.invalidate(message);this.revokePreviews(message??"Answer or sources changed. Generate a new preview.");this.corrections={};this.answer=null;this.bundle=null;this.prepared=null;if(this.askButton)this.askButton.disabled=false;}
  override onClose():void{this.inputs++;this.revokePreviews("Answer closed. Generate a new preview.");this.corrections={};this.answer=null;this.bundle=null;this.prepared=null;super.onClose();}
  private changed(message:string):void{this.inputs++;this.invalidate(message);}
  private live(prepared:PreparedContext):boolean{return !this.closed&&this.plugin.active&&this.prepared===prepared&&JSON.stringify(prepared.settings)===JSON.stringify(this.plugin.settings);}
  onOpen():void{
    const el=this.contentEl;el.addClass("thread-ask");this.modalEl.addClass("thread-dialog");
    const header=el.createDiv({cls:"thread-modal-header"}),title=header.createDiv({cls:"thread-modal-title"});title.createEl("h2",{text:"Ask your vault"});
    title.createEl("span",{text:this.plugin.settings.selectedProject.split("/").pop()||"",cls:"thread-meta"});
    header.createEl("p",{text:"Retrieve passages, choose what to include or pin, then generate locally. Citations identify evidence; inspect whether each excerpt supports its claim.",cls:"thread-meta"});
    const form=el.createDiv({cls:"thread-ask-form"}),questionEl=form.createDiv({cls:"thread-question"}),options=form.createDiv({cls:"thread-search-options"});
    let question="",vault=false;let budget:ReturnType<typeof searchBudgetControls>|null=null;
    const edited=(message:string)=>{budget?.reset();this.changed(message);};
    new Setting(questionEl).setName("Question").addTextArea(t=>{t.inputEl.setAttribute("aria-label","Question");t.inputEl.maxLength=1000;t.onChange(v=>{question=v;edited("Question changed. Retrieve passages again.");});});
    new Setting(options).setName("Answer scope").addDropdown(d=>{d.selectEl.setAttribute("aria-label","Answer scope");d.addOption("project","Selected project").addOption("vault","All allowed paths").onChange(v=>{vault=v==="vault";edited("Scope changed. Retrieve passages again.");});});
    const filterEl=form.createDiv({cls:"thread-search-filters"});
    const filters=searchFilters(filterEl,()=>edited("Filters changed. Retrieve passages again."));
    const method=searchMethod(options,this.plugin.settings.semanticSearch,()=>edited("Search method changed. Retrieve passages again."));
    const budgetEl=form.createEl("details",{cls:"thread-search-budget"});budgetEl.createEl("summary",{text:"Search budget and coverage"});
    budget=searchBudgetControls(budgetEl,()=>this.changed("Search budget changed. Retrieve passages again."),()=>{void this.run(question.trim(),vault,structuredClone(filters),method.hybrid,budget!.level);},()=>!this.closed&&this.plugin.active);
    this.status=el.createEl("p",{attr:{role:"status","aria-live":"polite"}});
    const actions=options.createDiv({cls:"thread-actions thread-retrieve-actions"});
    this.askButton=actions.createEl("button",{text:"Retrieve evidence",cls:"mod-cta"});
    actions.createEl("button",{text:"Cancel"}).onclick=()=>edited("Canceled. Retrieve evidence to start again.");
    this.resultEl=el.createDiv({cls:"thread-workbench"});this.askButton.onclick=()=>{void this.run(question.trim(),vault,structuredClone(filters),method.hybrid,budget!.level);};
  }
  async run(question:string,vault:boolean,filters:SearchFilters={},hybrid=false,level:SearchLevel="standard"):Promise<void>{
    if(this.closed)return;this.inputs++;this.invalidate();const epoch=this.epoch,settings=structuredClone(this.plugin.settings);
    if(!question||question.length>1000){this.status?.setText("Enter a question of up to 1000 characters.");return;}
    if(!vault&&!settings.selectedProject){this.status?.setText("Select a project in Settings first.");return;}
    const controller=new AbortController();this.controller=controller;this.askButton!.disabled=true;this.status?.setText("Retrieving permitted passages...");
    try{
      if(!this.plugin.index.ready)await this.plugin.rebuildIndex();controller.signal.throwIfAborted();
      const search=await this.plugin.searchEvidence(question,vault,filters,hybrid,settings,controller.signal,()=>!this.closed&&epoch===this.epoch,paths=>this.watchPaths(paths),level);
      const candidates=this.plugin.withDependencies({...await buildEvidence(hitsToNotes(search.hits)),searchCoverage:search.coverage,hybridCoverage:search.hybrid},settings);
      if(!await this.plugin.evidenceCurrent(candidates,settings))throw new Error("Sources changed. Retrieve passages again.");
      controller.signal.throwIfAborted();if(this.closed||epoch!==this.epoch)return;
      const prepared={question,vault,settings,candidates,choices:{}};this.prepared=prepared;this.watchBundle(candidates);this.renderWorkbench(prepared);
      this.status?.setText(candidates.sources.length?"Inspect evidence and exact context, then choose Generate. No answer has been generated.":"No eligible matching passages. Change the question, filters or allowed scope.");
    }catch(error){if(!this.closed&&epoch===this.epoch&&!controller.signal.aborted)this.status?.setText(error instanceof Error?error.message:"Could not retrieve evidence.");}
    finally{if(this.controller===controller){this.controller=null;this.askButton!.disabled=false;}}
  }
  private renderWorkbench(prepared:PreparedContext):void{
    const root=this.resultEl!;root.empty();root.createEl("h3",{text:"Evidence workbench"});
    if(prepared.candidates.searchCoverage)root.createEl("p",{text:searchCoverageText(prepared.candidates.searchCoverage),cls:"thread-meta"});
    if(prepared.candidates.hybridCoverage)root.createEl("p",{text:hybridCoverageText(prepared.candidates.hybridCoverage),cls:"thread-meta"});
    root.createEl("p",{text:"Choices apply to this request only. Pins go first within the same bounded context; omitted search/index content stays omitted."});
    const columns=root.createDiv({cls:"thread-workbench-columns"}),evidence=columns.createDiv({cls:"thread-evidence-list"}),sidebar=columns.createDiv({cls:"thread-context-panel"});
    const context=sidebar.createDiv({cls:"thread-chosen-context"});
    const generate=sidebar.createEl("button",{text:"Generate from chosen evidence",cls:"mod-cta"});
    const answerEl=sidebar.createDiv({cls:"thread-answer-preview"});
    const chosen=()=>this.plugin.withDependencies(selectContext(prepared.candidates,prepared.choices),prepared.settings);
    const showContext=()=>{
      const bundle=chosen();context.empty();context.createEl("h4",{text:"Context for the model",cls:"thread-label"});
      const bar=context.createDiv({cls:"thread-context-bar",attr:{"aria-hidden":"true"}});
      for(const source of prepared.candidates.sources){
        const included=bundle.sources.some(selected=>selected.id===source.id);
        const state=prepared.choices[source.id]==="exclude"?"excluded":included?prepared.choices[source.id]==="pin"?"pinned":"included":"omitted";
        bar.createDiv({cls:`thread-context-${state}`,attr:{title:`${source.id}: ${state}`}});
      }
      context.createEl("p",{text:`${bundle.sources.length} of ${prepared.candidates.sources.length} passages included; ${bundle.sources.filter(source=>prepared.choices[source.id]==="pin").length} pinned first; ${prepared.candidates.sources.filter(source=>prepared.choices[source.id]==="exclude").length} explicitly excluded.`});
      context.createEl("p",{text:contextCoverageText(bundle)});const details=context.createEl("details");details.createEl("summary",{text:"Exact source context sent to the model"});details.createEl("pre",{text:JSON.stringify(bundle.sources,null,2),cls:"thread-preview"});generate.disabled=!bundle.sources.length;
    };
    for(const source of prepared.candidates.sources){
      const row=evidence.createDiv({cls:"thread-evidence-card"}),top=row.createDiv({cls:"thread-evidence-top"});
      top.createEl("button",{text:`Open evidence ${source.id}`,cls:"thread-source",attr:{title:source.path}}).onclick=()=>{if(!this.live(prepared))return;void this.plugin.openIndexedSource(source.path,prepared.candidates.noteHashes[source.path]!,source.heading,()=>this.live(prepared)).catch(error=>{if(this.live(prepared))this.status?.setText(error instanceof Error?error.message:"Source unavailable.");});};
      new Setting(top).setName(`Use ${source.id}`).addDropdown(d=>{d.selectEl.setAttribute("aria-label",`Evidence choice ${source.id}`);d.addOption("include","Include").addOption("exclude","Exclude").addOption("pin","Pin first").onChange(value=>{
        if(!this.live(prepared)||!["include","exclude","pin"].includes(value))return;
        prepared.choices[source.id]=value as EvidenceChoice;this.inputs++;this.epoch++;this.controller?.abort();this.controller=null;this.revokePreviews("Evidence choices changed. Generate a new preview.");this.corrections={};this.answer=null;this.bundle=null;answerEl.empty();showContext();this.status?.setText("Evidence choices changed. Generate again from the renewed context.");
      });});
      row.createEl("p",{text:`${source.path.split("/").pop()}${source.heading?` › ${source.heading}`:""}`,cls:"thread-evidence-path",attr:{title:source.path}});
      row.createEl("pre",{text:source.excerpt,cls:"thread-excerpt"});
    }
    showContext();generate.onclick=()=>{if(this.live(prepared)&&!this.controller)return this.generate(prepared,chosen(),answerEl,generate);};
  }
  private async generate(prepared:PreparedContext,bundle:EvidenceBundle,answerEl:HTMLElement,button:HTMLButtonElement):Promise<void>{
    if(!bundle.sources.length||!this.live(prepared))return;
    this.inputs++;this.revokePreviews("Generating a new answer. Generate a new preview afterward.");this.corrections={};this.answer=null;this.bundle=null;
    const epoch=this.epoch,controller=new AbortController();this.controller=controller;button.disabled=true;answerEl.empty();
    const current=()=>this.live(prepared)&&epoch===this.epoch&&!controller.signal.aborted;
    this.status?.setText("Generating locally from the chosen context...");
    try{
      if(!await this.plugin.evidenceCurrent(bundle,prepared.settings)||!current())throw new Error("Evidence changed. Retrieve passages again.");
      const raw=await new OllamaClient(prepared.settings.endpoint,prepared.settings.timeoutMs).generate(prepared.settings.model,answerPrompt(prepared.question,bundle),controller.signal,ANSWER_SCHEMA);
      const answer=validateAnswer(raw,bundle);
      if(!await this.plugin.evidenceCurrent(bundle,prepared.settings)||!current())throw new Error("Evidence changed. Retrieve passages again.");
      this.answer=answer;this.bundle=bundle;this.renderAnswer(prepared,answer,bundle,answerEl,epoch,new Date().toISOString());
      this.status?.setText(answer.supported?"Answer ready. Compare each claim with the cited excerpts.":"The chosen evidence does not establish an answer.");
    }catch(error){if(current())this.status?.setText(error instanceof Error?error.message:"Could not answer.");}
    finally{if(this.controller===controller){this.controller=null;if(this.live(prepared))button.disabled=false;}}
  }
  private renderAnswer(prepared:PreparedContext,answer:Answer,bundle:EvidenceBundle,root:HTMLElement,epoch:number,generatedAt:string):void{
    root.createEl("h3",{text:"Claims and supporting passages"});
    root.createEl("p",{text:"Recorded statements quote notes, not independently verified facts. Interpretations and proposed actions require your judgment.",cls:"thread-meta"});
    let previewButton:HTMLButtonElement|null=null;
    const current=()=>this.live(prepared)&&epoch===this.epoch&&this.answer===answer&&this.bundle===bundle;
    const draftChanged=()=>{
      this.inputs++;this.revokePreviews("Answer draft changed. Generate a new preview.");
      try{createAnswerRecord(prepared.question,answer,bundle,prepared.settings.model,generatedAt,this.corrections);if(previewButton)previewButton.disabled=false;this.status?.setText("Draft changed. Review a new exact preview before saving.");}
      catch(error){if(previewButton)previewButton.disabled=true;this.status?.setText(error instanceof Error?error.message:"Invalid correction.");}
    };
    for(const [index,claim] of answer.answer.entries()){
      const row=root.createDiv({cls:"thread-claim-evidence"});const text=row.createDiv().createEl("p",{text:`${claimLabel(claim.kind)}: ${claim.text}`});text.createEl("span",{text:` ${claim.sourceIds.join(", ")}`,cls:"thread-citation-ids"});const evidence=row.createDiv();
      const status=decisionContext(claim,bundle);if(status)row.createEl("p",{text:status,cls:"thread-meta"});
      if(claim.modelKind)row.createEl("p",{text:`Model classification: ${claim.modelKind}; adjusted using the cited records.`,cls:"thread-meta"});
      for(const id of claim.sourceIds){const source=bundle.sources.find(s=>s.id===id)!;evidence.createEl("pre",{text:source.excerpt,cls:"thread-excerpt"});
        evidence.createEl("button",{text:`${id}: ${source.path}${source.heading?` > ${source.heading}`:""}`,cls:"thread-source"}).onclick=()=>{if(!this.live(prepared)||epoch!==this.epoch)return;void this.plugin.openIndexedSource(source.path,bundle.noteHashes[source.path]!,source.heading,()=>this.live(prepared)&&epoch===this.epoch).catch(error=>{if(this.live(prepared))this.status?.setText(error instanceof Error?error.message:"Source unavailable.");});};
      }
      const editor=row.createEl("details",{cls:"thread-claim-editor"});editor.createEl("summary",{text:`Edit claim ${index+1}`});
      editor.createEl("p",{text:`Original model (${claim.modelKind??claim.kind}): ${claim.text}`,cls:"thread-meta"});
      editor.createEl("p",{text:"Your correction keeps the original output and source citations. Choosing Recorded statement does not verify truth.",cls:"thread-meta"});
      let draftText=claim.text,draftKind=claim.kind;
      const edited=()=>{
        if(!current())return;
        this.corrections[index]={text:draftText,kind:draftKind,correctedAt:new Date().toISOString()};
        draftChanged();
        try{const correction=validateCorrection(this.corrections[index]);text.setText(`User correction - ${claimLabel(correction.kind)}: ${correction.text}`);text.createEl("span",{text:` ${claim.sourceIds.join(", ")}`,cls:"thread-citation-ids"});}
        catch{text.setText("Correction is incomplete. Enter valid text before previewing.");}
      };
      new Setting(editor).setName("Classification").addDropdown(d=>{d.selectEl.setAttribute("aria-label",`Claim classification ${index+1}`);for(const kind of ["fact","interpretation","suggestion"] as const)d.addOption(kind,claimLabel(kind));d.setValue(draftKind).onChange(value=>{if(!["fact","interpretation","suggestion"].includes(value))return;draftKind=value as Claim["kind"];edited();});});
      new Setting(editor).setName("Claim text").addTextArea(t=>{t.inputEl.setAttribute("aria-label",`Claim text ${index+1}`);t.inputEl.maxLength=1200;t.setValue(draftText).onChange(value=>{draftText=value;edited();});});
    }
    root.createEl("h3",{text:"Evidence gaps"});for(const gap of answer.gaps)root.createEl("p",{text:gap});if(!answer.supported)return;
    let name=`Answer ${localDay()} ${crypto.randomUUID().slice(0,8)}`;
    new Setting(root).setName("New answer note name").addText(t=>{t.inputEl.setAttribute("aria-label","New answer note name");t.setValue(name).onChange(value=>{if(!current())return;name=value;draftChanged();});});
    previewButton=root.createEl("button",{text:"Preview answer note"});previewButton.onclick=()=>{
      try{
        if(!current())throw new Error("Answer changed. Generate again.");
        const folder=prepared.vault?prepared.settings.roles.knowledge:prepared.settings.selectedProject;if(!folder)throw new Error("Map a Knowledge folder to save vault-wide answers.");
        const record=createAnswerRecord(prepared.question,answer,bundle,prepared.settings.model,generatedAt,this.corrections),revision=this.inputs;
        const note={path:`${folder}/Answers/${noteName(name)}.md`,content:reviewedAnswerMarkdown(record,bundle,prepared.vault?"":this.plugin.projectIdentity(prepared.settings.selectedProject))};
        const preview=new NewNoteModal(this.plugin,note,async()=>!this.closed&&this.inputs===revision&&this.plugin.active&&await this.plugin.evidenceCurrent(bundle,prepared.settings)&&!this.closed&&this.inputs===revision);
        for(const old of this.previews)if(old.closed)this.previews.delete(old);this.previews.add(preview);this.plugin.modals.add(preview);preview.open();
      }catch(error){this.status?.setText(error instanceof Error?error.message:"Preview failed.");}
    };
  }
}
