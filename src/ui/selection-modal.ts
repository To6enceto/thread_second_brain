import { Setting } from "obsidian";
import { ThreadModal } from "./thread-modal.ts";
import { NewNoteModal } from "./new-note-modal.ts";
import { selectionQuery,selectionDraft,type SelectionSnapshot,type SelectionAction } from "../vault/selection.ts";
import { contextCoverageText,type EvidenceBundle } from "../vault/evidence.ts";
import { ANSWER_SCHEMA,answerPrompt,validateAnswer,answerMarkdown } from "../intelligence/answer.ts";
import { OllamaClient } from "../intelligence/ollama.ts";
import { localDay,noteName } from "../vault/workspace.ts";
import { searchCoverageText } from "../retrieval/search.ts";
import type { ThreadSettings } from "../settings/settings.ts";

const titles={ask:"Ask about selected text",related:"Find evidence related to selected text",question:"Draft a question from selected text",decision:"Draft a decision from selected text"};
export class SelectionModal extends ThreadModal {
  sourceSnapshot!:SelectionSnapshot;
  bundle!:EvidenceBundle;
  action:SelectionAction="ask";
  private valid=true;
  private settingsSnapshot!:ThreadSettings;
  private runButton:HTMLButtonElement|null=null;
  private inputs=0;
  override invalidate(message="Notes or settings changed. Select saved text again."):void{
    super.invalidate(message);this.valid=false;this.contentEl.empty();this.contentEl.createEl("h2",{text:titles[this.action]});
    this.status=this.contentEl.createEl("p",{text:message,attr:{role:"status","aria-live":"polite"}});
  }
  private live(epoch:number):boolean{return this.valid&&!this.closed&&this.plugin.active&&epoch===this.epoch&&JSON.stringify(this.settingsSnapshot)===JSON.stringify(this.plugin.settings);}
  private begin():number{this.inputs++;super.invalidate("Selection inputs changed. Run the action again.");this.watchBundle(this.bundle);if(this.valid&&this.runButton)this.runButton.disabled=false;return this.epoch;}
  private previewValidation():()=>Promise<boolean>{
    const inputs=this.inputs,bundle=this.bundle,settings=this.settingsSnapshot;
    // Creating a new destination folder invalidates the parent display. The
    // exact preview still validates its own inputs, scope and source hashes.
    return async()=>inputs===this.inputs&&this.plugin.active&&await this.plugin.evidenceCurrent(bundle,settings)&&inputs===this.inputs;
  }
  private async current(epoch:number,bundle=this.bundle):Promise<void>{
    if(!this.live(epoch)||!await this.plugin.evidenceCurrent(bundle,this.settingsSnapshot)||!this.live(epoch))throw new Error("Selection or evidence changed. Select saved text again.");
  }
  onOpen():void{
    this.settingsSnapshot=structuredClone(this.plugin.settings);this.watchBundle(this.bundle);
    const el=this.contentEl;el.createEl("h2",{text:titles[this.action]});
    el.createEl("p",{text:"Only the selected saved text is supplied to Ask. Related search explicitly uses all allowed paths. No command saves a note or accepts a decision automatically."});
    el.createEl("button",{text:`Selected source: ${this.sourceSnapshot.path}`,cls:"thread-source"}).onclick=()=>{
      const epoch=this.epoch;void this.plugin.openIndexedSource(this.sourceSnapshot.path,this.sourceSnapshot.hash,"",()=>this.live(epoch)).catch(error=>{if(this.live(epoch))this.status?.setText(error instanceof Error?error.message:"Source unavailable.");});
    };
    el.createEl("pre",{text:this.sourceSnapshot.text,cls:"thread-excerpt"});
    let question="",choice="",reason="",name=`Selection ${localDay()} ${crypto.randomUUID().slice(0,8)}`;
    if(this.action!=="related")new Setting(el).setName("Your question").addTextArea(text=>{
      text.inputEl.setAttribute("aria-label","Selection question");text.inputEl.maxLength=1000;text.onChange(value=>{question=value;this.begin();});
    });
    if(this.action==="decision"){
      el.createEl("p",{text:"This shortcut creates a proposed decision only. Enter your choice and reasoning; acceptance remains a separate explicit workflow."});
      for(const label of ["Choice","Reasoning"] as const)new Setting(el).setName(label).addTextArea(text=>{
        text.inputEl.setAttribute("aria-label",`Selection ${label.toLowerCase()}`);text.inputEl.maxLength=5000;text.onChange(value=>{if(label==="Choice")choice=value;else reason=value;this.begin();});
      });
    }
    if(this.action==="question"||this.action==="decision"){
      el.createEl("p",{text:`Draft destination project: ${this.settingsSnapshot.selectedProject||"Select a project in Settings first"}. Review the exact new note before saving.`});
      new Setting(el).setName("New draft note name").addText(text=>{text.inputEl.setAttribute("aria-label","Selection note name");text.setValue(name).onChange(value=>name=value);});
    }
    const label=this.action==="ask"?"Ask locally about selection":this.action==="related"?"Find related allowed evidence":"Preview selection draft";
    const run=el.createEl("button",{text:label,cls:"mod-cta"});
    this.runButton=run;
    el.createEl("button",{text:"Cancel selection action"}).onclick=()=>{this.begin();this.status?.setText("Selection action canceled. No notes changed.");run.disabled=false;};
    this.status=el.createEl("p",{text:"Ready. Review the selected source and choose an action.",attr:{role:"status","aria-live":"polite"}});this.resultEl=el.createDiv();
    run.onclick=async()=>{
      if(!this.valid||this.closed||this.controller)return;
      const epoch=this.begin(),controller=new AbortController();this.controller=controller;run.disabled=true;
      const settings=this.settingsSnapshot,approved={question:question.trim(),choice,reason,name};
      try{
        await this.current(epoch);controller.signal.throwIfAborted();
        if(this.action==="related"){
          const query=selectionQuery(this.sourceSnapshot.text);if(!query)throw new Error("Select words to find related evidence.");
          this.status?.setText("Searching all currently allowed paths without AI...");
          const search=await this.plugin.searchEvidence(query,true,{},false,settings,controller.signal,()=>this.live(epoch),paths=>this.watchPaths([...Object.keys(this.bundle.noteHashes),...paths]));
          const checked=this.plugin.withDependencies({sources:[],truncated:false,noteHashes:{...Object.fromEntries(search.hits.map(hit=>[hit.entry.path,hit.entry.hash])),...this.bundle.noteHashes}},settings);
          this.watchBundle(checked);await this.current(epoch,checked);controller.signal.throwIfAborted();
          this.resultEl!.createEl("p",{text:`All allowed paths. ${searchCoverageText(search.coverage)}`});
          for(const hit of search.hits){
            const row=this.resultEl!.createDiv();row.createEl("p",{text:hit.excerpt,cls:"thread-excerpt"});
            row.createEl("button",{text:hit.entry.path,cls:"thread-source"}).onclick=()=>{void this.plugin.openIndexedSource(hit.entry.path,hit.entry.hash,hit.heading,()=>this.live(epoch)).catch(error=>{if(this.live(epoch))this.status?.setText(error instanceof Error?error.message:"Source unavailable.");});};
          }
          this.status?.setText(`Found ${search.hits.length} related passages. Text matching does not establish support.`);
        }else if(this.action==="ask"){
          if(!approved.question||approved.question.length>1000)throw new Error("Enter a question of up to 1000 characters.");
          this.status?.setText("Generating locally from the selected passage only...");
          const raw=await new OllamaClient(settings.endpoint,settings.timeoutMs).generate(settings.model,answerPrompt(approved.question,this.bundle),controller.signal,ANSWER_SCHEMA);
          const answer=validateAnswer(raw,this.bundle);await this.current(epoch);controller.signal.throwIfAborted();
          this.resultEl!.createEl("p",{text:contextCoverageText(this.bundle),cls:"thread-meta"});
          for(const claim of answer.answer)this.resultEl!.createEl("p",{text:`${claim.kind}: ${claim.text} (${claim.sourceIds.join(", ")})`});
          for(const gap of answer.gaps)this.resultEl!.createEl("p",{text:`Gap: ${gap}`});
          if(answer.supported){
            let answerName=`Selected answer ${localDay()} ${crypto.randomUUID().slice(0,8)}`;
            new Setting(this.resultEl!).setName("New answer note name").addText(text=>{text.inputEl.setAttribute("aria-label","Selected answer note name");text.setValue(answerName).onChange(value=>answerName=value);});
            this.resultEl!.createEl("button",{text:"Preview selected answer"}).onclick=()=>{
              try{
                if(!this.live(epoch))return;const folder=settings.roles.knowledge;if(!folder)throw new Error("Map a Knowledge folder to save this selection-scoped answer.");
                const note={path:`${folder}/Answers/${noteName(answerName)}.md`,content:answerMarkdown(approved.question,answer,this.bundle,settings.model)};
                const preview=new NewNoteModal(this.plugin,note,this.previewValidation());this.plugin.modals.add(preview);preview.open();
              }catch(error){if(this.live(epoch))this.status?.setText(error instanceof Error?error.message:"Could not preview answer.");}
            };
          }
          this.status?.setText(answer.supported?"Answer ready from selected evidence. Inspect its support before saving.":"The selected evidence does not establish an answer.");
        }else{
          const project=settings.selectedProject;if(!project)throw new Error("Choose a project in Settings before preparing a draft.");
          const content=selectionDraft(this.action,approved.question,approved.choice,approved.reason,this.plugin.projectIdentity(project),this.bundle);
          const path=`${project}/${this.action==="decision"?"Decisions":"Questions"}/${noteName(approved.name)}.md`;
          await this.current(epoch);controller.signal.throwIfAborted();
          const preview=new NewNoteModal(this.plugin,{path,content},this.previewValidation());this.plugin.modals.add(preview);preview.open();
          this.status?.setText("Draft preview ready. Nothing is saved until you approve its exact contents.");
        }
      }catch(error){if(this.live(epoch)&&!controller.signal.aborted)this.status?.setText(error instanceof Error?error.message:"Could not complete this selection action.");}
      finally{if(this.controller===controller){this.controller=null;if(this.live(epoch))run.disabled=false;}}
    };
  }
}
