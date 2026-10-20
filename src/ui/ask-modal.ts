import { Setting } from "obsidian";
import { ThreadModal } from "./thread-modal.ts";
import { NewNoteModal } from "./new-note-modal.ts";
import { ConversationSaveModal } from "./conversation-save-modal.ts";
import { buildEvidence,contextCoverageText,type EvidenceBundle } from "../vault/evidence.ts";
import { selectContext,type EvidenceChoice } from "../vault/workbench.ts";
import { hitsToNotes } from "../vault/index.ts";
import { OllamaClient } from "../intelligence/ollama.ts";
import { ANSWER_SCHEMA,validateAnswer,type Answer } from "../intelligence/answer.ts";
import { conversationContext, conversationPrompt, snapshotTurn, MAX_CONVERSATION_TURNS, type ConversationTurn } from "../intelligence/conversation.ts";
import { claimLabel, decisionContext } from "../intelligence/claims.ts";
import { createAnswerRecord, reviewedAnswerMarkdown, validateCorrection, type ClaimCorrections } from "../vault/answer-record.ts";
import type { Claim } from "../intelligence/briefing.ts";
import { localDay,noteName } from "../vault/workspace.ts";
import type { ThreadSettings } from "../settings/settings.ts";
import type {SearchLevel} from "../retrieval/budget.ts";
import { searchFilters,searchMethod,searchBudgetControls } from "./search-filters.ts";
import { hybridCoverageText } from "../retrieval/semantic.ts";
import { searchCoverageText,type SearchFilters } from "../retrieval/search.ts";

interface PreparedContext {question:string;vault:boolean;projectIdentity:string;settings:ThreadSettings;candidates:EvidenceBundle;choices:Record<string,EvidenceChoice>;}
export class AskModal extends ThreadModal {
  answer:Answer|null=null;
  bundle:EvidenceBundle|null=null;
  askButton:HTMLButtonElement|null=null;
  private prepared:PreparedContext|null=null;
  private inputs=0;
  private corrections:ClaimCorrections={};
  private previews=new Set<ThreadModal>();
  private generatedAt="";
  private turns:ConversationTurn[]=[];
  private historyEl:HTMLElement|null=null;
  private questionInput:HTMLTextAreaElement|null=null;
  private question="";
  private reuseButton:HTMLButtonElement|null=null;
  override watchPaths(paths:string[]):void{super.watchPaths([...paths,...this.turns.flatMap(turn=>Object.keys(turn.bundle.noteHashes))]);}
  override invalidatePaths(paths:Set<string>):void{
    const project=this.prepared?.settings.selectedProject??this.turns[0]?.settings.selectedProject;
    if(project&&[...paths].some(path=>path===project||path.slice(0,path.lastIndexOf("/"))===project)){this.invalidate();return;}
    super.invalidatePaths(paths);
  }
  private revokePreviews(message:string):void{for(const preview of this.previews)if(!preview.closed)preview.invalidate(message);this.previews.clear();}
  private resetCurrent(message="Retrieve evidence for this turn."):void{
    super.invalidate(message);this.revokePreviews(message);this.corrections={};this.answer=null;this.bundle=null;this.prepared=null;this.generatedAt="";
    this.watchPaths([]);if(!this.turns.length)this.dependencies=null;if(this.askButton)this.askButton.disabled=false;this.renderHistory();
  }
  override invalidate(message="Notes or settings changed. Start the conversation again."):void{
    this.turns=[];this.resetCurrent(message);this.dependencies=null;
  }
  override onClose():void{this.inputs++;this.invalidate("Ask closed. Start a new conversation.");super.onClose();}
  private changed(message:string,clearHistory=false):void{this.inputs++;if(clearHistory)this.invalidate(message);else this.resetCurrent(message);}
  private live(prepared:PreparedContext):boolean{return !this.closed&&this.plugin.active&&this.prepared===prepared&&JSON.stringify(prepared.settings)===JSON.stringify(this.plugin.settings);}
  private async historyCurrent(turns:readonly ConversationTurn[],settings:ThreadSettings,vault:boolean,identity:string):Promise<boolean>{
    if(this.closed||!this.plugin.active||JSON.stringify(settings)!==JSON.stringify(this.plugin.settings))return false;
    for(const turn of turns){
      if(turn.vault!==vault||turn.projectIdentity!==identity||JSON.stringify(turn.settings)!==JSON.stringify(settings)||!await this.plugin.evidenceCurrent(turn.bundle,settings))return false;
    }
    if(!vault&&this.plugin.projectIdentity(settings.selectedProject)!==identity)return false;
    return !this.closed&&this.plugin.active&&JSON.stringify(settings)===JSON.stringify(this.plugin.settings);
  }
  private renderHistory():void{
    if(this.reuseButton)this.reuseButton.disabled=!this.turns.length;
    const root=this.historyEl;if(!root)return;root.empty();
    root.createEl("p",{text:`Turn ${this.turns.length+1} of ${MAX_CONVERSATION_TURNS}. Earlier turns are held only in this open conversation.`,cls:"thread-meta"});
    const save=root.createEl("button",{text:"Save conversation"});save.disabled=!this.turns.length&&!this.answer;
    save.onclick=()=>{
      if(this.closed||save.disabled)return;
      try{
        const turns=[...this.turns],prepared=this.prepared;
        if(this.answer&&this.bundle&&prepared)turns.push(snapshotTurn({question:prepared.question,answer:this.answer,corrections:this.corrections,bundle:this.bundle,choices:prepared.choices,generatedAt:this.generatedAt,settings:prepared.settings,vault:prepared.vault,projectIdentity:prepared.projectIdentity},turns.length));
        if(!turns.length)throw new Error("Generate an answer before saving a conversation.");
        const revision=this.inputs,first=turns[0]!;
        const draft=new ConversationSaveModal(this.plugin,turns,async()=>!this.closed&&this.inputs===revision&&await this.historyCurrent(turns,first.settings,first.vault,first.projectIdentity)&&!this.closed&&this.inputs===revision);
        for(const old of this.previews)if(old.closed)this.previews.delete(old);this.previews.add(draft);this.plugin.modals.add(draft);draft.open();
      }catch(error){this.status?.setText(error instanceof Error?error.message:"Could not prepare conversation save.");}
    };
    for(const [index,turn] of this.turns.entries()){
      const details=root.createEl("details",{cls:"thread-conversation-turn"});details.createEl("summary",{text:`Earlier turn ${index+1}: ${turn.question}`});
      details.createEl("p",{text:`AI conversation context, not evidence. ${turn.generatedAt} · ${turn.settings.model}`,cls:"thread-meta"});
      for(const [i,claim] of turn.answer.answer.entries())details.createEl("p",{text:`${turn.corrections[i]?"User correction - ":""}${claimLabel(turn.corrections[i]?.kind??claim.kind)}: ${turn.corrections[i]?.text??claim.text}`});
      for(const gap of turn.answer.gaps)details.createEl("p",{text:gap,cls:"thread-meta"});
      const evidence=details.createEl("details");evidence.createEl("summary",{text:`Chosen evidence for turn ${index+1} (${turn.bundle.sources.length} passages)`});
      for(const source of turn.bundle.sources){
        evidence.createEl("button",{text:`Turn ${index+1} ${source.id}: ${source.path}${source.heading?` > ${source.heading}`:""}`,cls:"thread-source"}).onclick=async()=>{
          const epoch=this.epoch;
          try{
            if(!this.turns.includes(turn))return;
            const fresh=await this.historyCurrent(this.turns,turn.settings,turn.vault,turn.projectIdentity);
            if(this.closed||epoch!==this.epoch)return;
            if(!fresh){this.invalidate("Earlier evidence changed. Start again.");return;}
            await this.plugin.openIndexedSource(source.path,turn.bundle.noteHashes[source.path]!,source.heading,()=>!this.closed&&epoch===this.epoch&&this.turns.includes(turn));
          }catch(error){if(!this.closed&&epoch===this.epoch)this.invalidate(error instanceof Error?error.message:"Earlier evidence changed. Start again.");}
        };
        evidence.createEl("pre",{text:source.excerpt,cls:"thread-excerpt"});
      }
    }
  }
  onOpen():void{
    const el=this.contentEl;el.addClass("thread-ask");this.modalEl.addClass("thread-dialog");
    const header=el.createDiv({cls:"thread-modal-header"}),title=header.createDiv({cls:"thread-modal-title"});title.createEl("h2",{text:"Ask your vault"});
    title.createEl("span",{text:this.plugin.settings.selectedProject.split("/").pop()||"",cls:"thread-meta"});
    header.createEl("p",{text:"Retrieve passages, choose what to include or pin, then generate locally. Citations identify evidence; inspect whether each excerpt supports its claim.",cls:"thread-meta"});
    const form=el.createDiv({cls:"thread-ask-form"}),questionEl=form.createDiv({cls:"thread-question"}),options=form.createDiv({cls:"thread-search-options"});
    let vault=false;let budget:ReturnType<typeof searchBudgetControls>|null=null;
    const edited=(message:string,clearHistory=false)=>{budget?.reset();this.changed(message,clearHistory);};
    new Setting(questionEl).setName("Question").addTextArea(t=>{t.inputEl.setAttribute("aria-label","Question");t.inputEl.maxLength=1000;this.questionInput=t.inputEl;t.onChange(v=>{this.question=v;edited("Question changed. Retrieve passages again.");});});
    new Setting(options).setName("Answer scope").addDropdown(d=>{d.selectEl.setAttribute("aria-label","Answer scope");d.addOption("project","Selected project").addOption("vault","All allowed paths").onChange(v=>{vault=v==="vault";edited("Scope changed. Start a new conversation.",true);});});
    const filterEl=form.createDiv({cls:"thread-search-filters"});
    const filters=searchFilters(filterEl,()=>edited("Filters changed. Retrieve passages again."));
    const method=searchMethod(options,this.plugin.settings.semanticSearch,()=>edited("Search method changed. Retrieve passages again."));
    const budgetEl=form.createEl("details",{cls:"thread-search-budget"});budgetEl.createEl("summary",{text:"Search budget and coverage"});
    budget=searchBudgetControls(budgetEl,()=>this.changed("Search budget changed. Retrieve passages again."),()=>{void this.run(this.question.trim(),vault,structuredClone(filters),method.hybrid,budget!.level);},()=>!this.closed&&this.plugin.active);
    this.status=el.createEl("p",{attr:{role:"status","aria-live":"polite"}});
    const actions=options.createDiv({cls:"thread-actions thread-retrieve-actions"});
    this.askButton=actions.createEl("button",{text:"Retrieve evidence",cls:"mod-cta"});
    this.reuseButton=actions.createEl("button",{text:"Reuse previous evidence"});this.reuseButton.disabled=true;
    this.reuseButton.onclick=()=>this.reuse(this.question.trim(),vault);
    actions.createEl("button",{text:"Cancel"}).onclick=()=>edited("Canceled. Start a new conversation.",true);
    actions.createEl("button",{text:"Start new conversation"}).onclick=()=>{if(this.closed)return;this.question="";if(this.questionInput)this.questionInput.value="";edited("New conversation. Enter a question and retrieve evidence.",true);};
    this.historyEl=el.createDiv({cls:"thread-conversation-history"});this.renderHistory();
    this.resultEl=el.createDiv({cls:"thread-workbench"});this.askButton.onclick=()=>{void this.run(this.question.trim(),vault,structuredClone(filters),method.hybrid,budget!.level);};
  }
  async run(question:string,vault:boolean,filters:SearchFilters={},hybrid=false,level:SearchLevel="standard"):Promise<void>{
    if(this.closed)return;this.inputs++;this.resetCurrent();const epoch=this.epoch,settings=structuredClone(this.plugin.settings);
    if(!question||question.length>1000){this.status?.setText("Enter a question of up to 1000 characters.");return;}
    if(!vault&&!settings.selectedProject){this.status?.setText("Select a project in Settings first.");return;}
    const controller=new AbortController();this.controller=controller;this.askButton!.disabled=true;this.status?.setText("Retrieving permitted passages...");
    try{
      if(!this.plugin.index.ready)await this.plugin.rebuildIndex();controller.signal.throwIfAborted();
      const projectIdentity=vault?"":this.plugin.projectIdentity(settings.selectedProject);
      const historyFresh=await this.historyCurrent(this.turns,settings,vault,projectIdentity);
      if(this.closed||epoch!==this.epoch)return;
      if(!historyFresh){this.invalidate("Earlier evidence or scope changed. Start again.");return;}
      const search=await this.plugin.searchEvidence(question,vault,filters,hybrid,settings,controller.signal,()=>!this.closed&&epoch===this.epoch,paths=>this.watchPaths(paths),level);
      const candidates=this.plugin.withDependencies({...await buildEvidence(hitsToNotes(search.hits)),searchCoverage:search.coverage,hybridCoverage:search.hybrid},settings);
      const fresh=await this.plugin.evidenceCurrent(candidates,settings)&&await this.historyCurrent(this.turns,settings,vault,projectIdentity);
      controller.signal.throwIfAborted();if(this.closed||epoch!==this.epoch)return;
      if(!fresh){this.invalidate("Sources changed. Start again.");return;}
      const prepared={question,vault,projectIdentity,settings,candidates,choices:{}};this.prepared=prepared;this.watchBundle(candidates);this.renderWorkbench(prepared);
      this.status?.setText(candidates.sources.length?"Inspect evidence and exact context, then choose Generate. No answer has been generated.":"No eligible matching passages. Change the question, filters or allowed scope.");
    }catch(error){if(!this.closed&&epoch===this.epoch&&!controller.signal.aborted)this.status?.setText(error instanceof Error?error.message:"Could not retrieve evidence.");}
    finally{if(this.controller===controller){this.controller=null;this.askButton!.disabled=false;}}
  }
  private async reuse(question:string,vault:boolean):Promise<void>{
    if(this.closed||!this.turns.length)return;
    this.inputs++;this.resetCurrent();const epoch=this.epoch,turn=this.turns.at(-1)!,settings=structuredClone(this.plugin.settings);
    if(!question||question.length>1000){this.status?.setText("Enter a follow-up question of up to 1000 characters.");return;}
    this.status?.setText("Checking the previous chosen evidence...");
    try{
      const fresh=await this.historyCurrent(this.turns,settings,vault,turn.projectIdentity);
      if(this.closed||epoch!==this.epoch)return;
      if(!fresh){this.invalidate("Earlier evidence or scope changed. Start again.");return;}
      const candidates=structuredClone(turn.bundle);delete candidates.searchCoverage;delete candidates.hybridCoverage;
      const choices=Object.fromEntries(candidates.sources.map(source=>[source.id,turn.choices[source.id]??"include"])) as Record<string,EvidenceChoice>;
      const prepared={question,vault,projectIdentity:turn.projectIdentity,settings,candidates,choices};
      this.prepared=prepared;this.watchBundle(candidates);this.renderWorkbench(prepared);
      this.status?.setText("Previous chosen passages revalidated. Review the current context, then Generate. No new search was run.");
    }catch(error){if(!this.closed&&epoch===this.epoch)this.invalidate(error instanceof Error?error.message:"Could not reuse evidence. Start again.");}
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
      context.createEl("p",{text:contextCoverageText(bundle)});const details=context.createEl("details");details.createEl("summary",{text:"Exact source context sent to the model"});details.createEl("pre",{text:JSON.stringify(bundle.sources,null,2),cls:"thread-preview"});const earlier=conversationContext(this.turns,bundle);
      context.createEl("p",{text:`Earlier context: ${earlier.turns.length} of ${this.turns.length} turns; ${earlier.serialized.length}/4000 characters. Whole turns omitted: ${earlier.omitted.map(item=>`${item.turn} (${item.reason})`).join(", ")||"none"}.`,cls:"thread-meta"});
      const conversation=context.createEl("details");conversation.createEl("summary",{text:"Exact earlier conversation context sent to the model"});conversation.createEl("pre",{text:earlier.serialized,cls:"thread-preview"});
      context.createEl("p",{text:"Earlier AI and user corrections are context only. Current evidence supports the answer. Total prompt limit: 24000 characters.",cls:"thread-meta"});
      generate.disabled=!bundle.sources.length;
    };
    for(const source of prepared.candidates.sources){
      const row=evidence.createDiv({cls:"thread-evidence-card"}),top=row.createDiv({cls:"thread-evidence-top"});
      top.createEl("button",{text:`Open evidence ${source.id}`,cls:"thread-source",attr:{title:source.path}}).onclick=()=>{if(!this.live(prepared))return;void this.plugin.openIndexedSource(source.path,prepared.candidates.noteHashes[source.path]!,source.heading,()=>this.live(prepared)).catch(error=>{if(this.live(prepared))this.status?.setText(error instanceof Error?error.message:"Source unavailable.");});};
      new Setting(top).setName(`Use ${source.id}`).addDropdown(d=>{d.selectEl.setAttribute("aria-label",`Evidence choice ${source.id}`);d.addOption("include","Include").addOption("exclude","Exclude").addOption("pin","Pin first").setValue(prepared.choices[source.id]??"include").onChange(value=>{
        if(!this.live(prepared)||!["include","exclude","pin"].includes(value))return;
        prepared.choices[source.id]=value as EvidenceChoice;this.inputs++;this.epoch++;this.controller?.abort();this.controller=null;this.revokePreviews("Evidence choices changed. Generate a new preview.");this.corrections={};this.answer=null;this.bundle=null;this.generatedAt="";this.renderHistory();answerEl.empty();showContext();this.status?.setText("Evidence choices changed. Generate again from the renewed context.");
      });});
      row.createEl("p",{text:`${source.path.split("/").pop()}${source.heading?` › ${source.heading}`:""}`,cls:"thread-evidence-path",attr:{title:source.path}});
      row.createEl("pre",{text:source.excerpt,cls:"thread-excerpt"});
    }
    showContext();generate.onclick=()=>{if(this.live(prepared)&&!this.controller)return this.generate(prepared,chosen(),answerEl,generate);};
  }
  private async generate(prepared:PreparedContext,bundle:EvidenceBundle,answerEl:HTMLElement,button:HTMLButtonElement):Promise<void>{
    if(!bundle.sources.length||!this.live(prepared))return;
    this.inputs++;this.revokePreviews("Generating a new answer. Generate a new preview afterward.");this.corrections={};this.answer=null;this.bundle=null;this.generatedAt="";this.renderHistory();
    const epoch=this.epoch,controller=new AbortController();this.controller=controller;button.disabled=true;answerEl.empty();
    const current=()=>this.live(prepared)&&epoch===this.epoch&&!controller.signal.aborted;
    this.status?.setText("Generating locally from the chosen context...");
    try{
      const before=await this.plugin.evidenceCurrent(bundle,prepared.settings)&&await this.historyCurrent(this.turns,prepared.settings,prepared.vault,prepared.projectIdentity);
      if(!current())return;
      if(!before){this.invalidate("Evidence changed. Start again.");return;}
      const raw=await new OllamaClient(prepared.settings.endpoint,prepared.settings.timeoutMs).generate(prepared.settings.model,conversationPrompt(prepared.question,bundle,this.turns).prompt,controller.signal,ANSWER_SCHEMA);
      const answer=validateAnswer(raw,bundle);
      const after=await this.plugin.evidenceCurrent(bundle,prepared.settings)&&await this.historyCurrent(this.turns,prepared.settings,prepared.vault,prepared.projectIdentity);
      if(!current())return;
      if(!after){this.invalidate("Evidence changed. Start again.");return;}
      this.answer=answer;this.bundle=bundle;this.generatedAt=new Date().toISOString();this.renderAnswer(prepared,answer,bundle,answerEl,epoch,this.generatedAt);this.renderHistory();
      this.status?.setText(answer.supported?"Answer ready. Compare each claim with the cited excerpts.":"The chosen evidence does not establish an answer.");
    }catch(error){if(current())this.status?.setText(error instanceof Error?error.message:"Could not answer.");}
    finally{if(this.controller===controller){this.controller=null;if(this.live(prepared))button.disabled=false;}}
  }
  private renderAnswer(prepared:PreparedContext,answer:Answer,bundle:EvidenceBundle,root:HTMLElement,epoch:number,generatedAt:string):void{
    root.createEl("h3",{text:"Claims and supporting passages"});
    root.createEl("p",{text:"Recorded statements quote notes, not independently verified facts. Interpretations and proposed actions require your judgment.",cls:"thread-meta"});
    let previewButton:HTMLButtonElement|null=null,continueButton:HTMLButtonElement|null=null;
    const current=()=>this.live(prepared)&&epoch===this.epoch&&this.answer===answer&&this.bundle===bundle;
    const draftChanged=()=>{
      this.inputs++;this.revokePreviews("Answer draft changed. Generate a new preview.");
      try{createAnswerRecord(prepared.question,answer,bundle,prepared.settings.model,generatedAt,this.corrections);if(previewButton)previewButton.disabled=false;if(continueButton)continueButton.disabled=this.turns.length>=MAX_CONVERSATION_TURNS-1;this.status?.setText("Draft changed. Review a new exact preview before saving.");}
      catch(error){if(previewButton)previewButton.disabled=true;if(continueButton)continueButton.disabled=true;this.status?.setText(error instanceof Error?error.message:"Invalid correction.");}
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
    root.createEl("h3",{text:"Evidence gaps"});for(const gap of answer.gaps)root.createEl("p",{text:gap});
    continueButton=root.createEl("button",{text:"Continue with follow-up"});continueButton.disabled=this.turns.length>=MAX_CONVERSATION_TURNS-1;
    continueButton.onclick=async()=>{
      if(!current()||continueButton!.disabled||this.controller)return;
      const revision=this.inputs;
      try{
        const turn=snapshotTurn({question:prepared.question,answer,corrections:this.corrections,bundle,choices:prepared.choices,generatedAt,settings:prepared.settings,vault:prepared.vault,projectIdentity:prepared.projectIdentity},this.turns.length);
        const fresh=await this.plugin.evidenceCurrent(bundle,prepared.settings)&&await this.historyCurrent(this.turns,prepared.settings,prepared.vault,prepared.projectIdentity);
        if(!current()||revision!==this.inputs)return;
        if(!fresh){this.invalidate("Earlier evidence changed. Start again.");return;}
        this.turns.push(turn);this.question="";if(this.questionInput)this.questionInput.value="";
        this.changed("Enter a follow-up, then retrieve evidence or reuse the previous chosen passages.");this.questionInput?.focus();
      }catch(error){if(current())this.status?.setText(error instanceof Error?error.message:"Could not continue.");}
    };
    if(continueButton.disabled)root.createEl("p",{text:"Six-turn limit reached. Save this answer or start a new conversation.",cls:"thread-meta"});
    if(!answer.supported)return;
    root.createEl("p",{text:"Preview answer note saves this answer only. The earlier conversation remains in memory.",cls:"thread-meta"});
    let name=`Answer ${localDay()} ${crypto.randomUUID().slice(0,8)}`;
    new Setting(root).setName("New answer note name").addText(t=>{t.inputEl.setAttribute("aria-label","New answer note name");t.setValue(name).onChange(value=>{if(!current())return;name=value;draftChanged();});});
    previewButton=root.createEl("button",{text:"Preview answer note"});previewButton.onclick=()=>{
      try{
        if(!current())throw new Error("Answer changed. Generate again.");
        const folder=prepared.vault?prepared.settings.roles.knowledge:prepared.settings.selectedProject;if(!folder)throw new Error("Map a Knowledge folder to save vault-wide answers.");
        const record=createAnswerRecord(prepared.question,answer,bundle,prepared.settings.model,generatedAt,this.corrections),revision=this.inputs,history=[...this.turns];
        const note={path:`${folder}/Answers/${noteName(name)}.md`,content:reviewedAnswerMarkdown(record,bundle,prepared.projectIdentity)};
        const preview=new NewNoteModal(this.plugin,note,async()=>!this.closed&&this.inputs===revision&&this.plugin.active&&await this.plugin.evidenceCurrent(bundle,prepared.settings)&&await this.historyCurrent(history,prepared.settings,prepared.vault,prepared.projectIdentity)&&!this.closed&&this.inputs===revision);
        for(const old of this.previews)if(old.closed)this.previews.delete(old);this.previews.add(preview);this.plugin.modals.add(preview);preview.open();
      }catch(error){this.status?.setText(error instanceof Error?error.message:"Preview failed.");}
    };
  }
}
