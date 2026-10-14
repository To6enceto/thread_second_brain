import { Setting,parseYaml } from "obsidian";
import { ThreadModal } from "./thread-modal.ts";
import { ANSWER_SCHEMA,answerPrompt,validateAnswer,type Answer } from "../intelligence/answer.ts";
import { OllamaClient } from "../intelligence/ollama.ts";
import { decisionComparison,decisionReviewBlock,reviewObservations,supersededStatus } from "../vault/decision-review.ts";
import { decisionMarkdown,type DecisionInput } from "../vault/decision.ts";
import { readMetadata } from "../vault/evidence.ts";
import type { EvidenceBundle } from "../vault/evidence.ts";
import type { ThreadSettings } from "../settings/settings.ts";
import { localDay,noteName } from "../vault/workspace.ts";

export class DecisionReviewModal extends ThreadModal {
  generateButton:HTMLButtonElement|null=null;
  proposalButton:HTMLButtonElement|null=null;
  clearChoices:()=>void=()=>{};
  assessment:{answer:Answer;bundle:EvidenceBundle;settings:ThreadSettings;path:string;before:string;epoch:number}|null=null;
  override invalidate(message?:string):void{super.invalidate(message);this.assessment=null;this.clearChoices();if(this.proposalButton)this.proposalButton.disabled=true;}
  onOpen():void{
    const el=this.contentEl;el.createEl("h2",{text:"Decision evidence review"});
    el.createEl("p",{text:"Select an existing decision and up to four evidence notes. Dates help you identify later evidence; capture and modification dates do not prove when events happened. Model observations are interpretations, never an accepted choice."});
    const decisions=el.createEl("select",{attr:{"aria-label":"Decision to review"}});
    const sources=el.createEl("select",{attr:{"aria-label":"New decision evidence"}});
    const selected=new Set<string>();const selectedEl=el.createDiv();
    const reset=()=>{super.invalidate("Selection changed. Assess this evidence again.");this.assessment=null;this.proposalButton!.disabled=true;};
    const show=()=>{selectedEl.empty();for(const path of selected)selectedEl.createEl("button",{text:`Remove ${path}`}).onclick=()=>{selected.delete(path);reset();show();};};
    decisions.onchange=()=>{selected.clear();show();reset();};
    el.createEl("button",{text:"Add new evidence"}).onclick=()=>{if(sources.value&&sources.value!==decisions.value&&selected.size<4){selected.add(sources.value);reset();show();}};
    this.clearChoices=()=>{selected.clear();show();decisions.replaceChildren(new Option("Refresh decisions",""));sources.replaceChildren(new Option("Refresh evidence",""));};
    this.generateButton=el.createEl("button",{text:"Assess selected evidence",cls:"mod-cta"});
    el.createEl("button",{text:"Cancel assessment"}).onclick=()=>{reset();this.status?.setText("Assessment canceled.");};
    this.status=el.createEl("p",{attr:{role:"status","aria-live":"polite"}});this.resultEl=el.createDiv();
    let action:"retain"|"annotate"|"supersede"="retain";let reasoning="";let replacementName="";
    new Setting(el).setName("Your decision action").addDropdown(d=>{d.selectEl.setAttribute("aria-label","Decision review action");d.addOption("retain","Retain current choice").addOption("annotate","Annotate current choice").addOption("supersede","Supersede — explicitly accept my replacement").onChange(v=>{if(v==="retain"||v==="annotate"||v==="supersede")action=v;});});
    new Setting(el).setName("Your review reasoning").addTextArea(t=>{t.inputEl.setAttribute("aria-label","Review reasoning");t.inputEl.maxLength=5000;t.onChange(v=>reasoning=v);});
    el.createEl("p",{text:"For Supersede, complete the replacement fields below. The original choice and reasoning remain in the vault."});
    new Setting(el).setName("Replacement note name").addText(t=>{t.inputEl.setAttribute("aria-label","Replacement note name");t.onChange(v=>replacementName=v);});
    const data:DecisionInput={question:"",choice:"",rationale:"",alternatives:"",constraints:"",revisit:"",status:"accepted",date:localDay()};
    for(const [key,label] of [["question","Replacement question"],["choice","Replacement choice"],["rationale","Replacement rationale"],["alternatives","Replacement alternatives"],["constraints","Replacement constraints"],["revisit","Replacement revisit condition"]] as const)new Setting(el).setName(label).addTextArea(t=>{t.inputEl.setAttribute("aria-label",label);t.inputEl.maxLength=5000;t.onChange(v=>data[key]=v);});
    this.proposalButton=el.createEl("button",{text:"Preview decision action",cls:"mod-cta"});this.proposalButton.disabled=true;
    const load=async()=>{
      reset();const epoch=this.epoch;const settings=structuredClone(this.plugin.settings);
      try{
        if(!this.plugin.index.ready)await this.plugin.rebuildIndex();
        if(this.closed||epoch!==this.epoch||JSON.stringify(settings)!==JSON.stringify(this.plugin.settings))return;
        decisions.replaceChildren(new Option("Choose a project decision",""));sources.replaceChildren(new Option("Choose allowed evidence",""));
        for(const entry of this.plugin.index.projectEntries(settings,settings.selectedProject||null)){
          if(entry.metadata.type==="decision"&&settings.selectedProject&&this.plugin.changePathAllowed(entry.path))decisions.add(new Option(`${entry.path} · ${String(entry.metadata.status??"unknown")} · ${String(entry.metadata.decided_on??"date unknown")}`,entry.path));
          sources.add(new Option(`${entry.path} · ${String(entry.metadata.recorded_on??entry.metadata.captured_on??"modified "+localDay(new Date(entry.modifiedAt)))}`,entry.path));
        }
        this.status?.setText("Choose a decision and evidence to compare.");
      }catch(e){this.status?.setText(e instanceof Error?e.message:"Could not load decisions.");}
    };
    el.createEl("button",{text:"Refresh decision review"}).onclick=()=>{void load();};
    this.generateButton.onclick=async()=>{
      if(this.controller)return;
      reset();const controller=new AbortController();this.controller=controller;const epoch=this.epoch;const settings=structuredClone(this.plugin.settings);const path=decisions.value;const paths=[...selected];this.generateButton!.disabled=true;
      try{
        if(!settings.selectedProject||!this.plugin.index.ready)throw new Error("Select a project and refresh evidence first.");
        if(!path||!paths.length)throw new Error("Choose a decision and at least one evidence note.");
        const before=await this.plugin.readReviewedTarget(path);if(before===null)throw new Error("The decision disappeared.");
        const bundle=decisionComparison(await this.plugin.evidenceFromPaths([path,...paths],settings,controller.signal),path);
        if(!bundle.sources.some(s=>s.path===path)||!bundle.sources.some(s=>s.path!==path))throw new Error("The evidence budget must include both the decision and selected evidence. Select smaller notes.");
        this.status?.setText("Comparing selected evidence locally...");
        const raw=await new OllamaClient(settings.endpoint,settings.timeoutMs).generate(settings.model,answerPrompt("Does the selected later evidence support revisiting this decision, and which constraints remain? Explain the specific tension and uncertainty.",bundle),controller.signal,ANSWER_SCHEMA);
        const answer=reviewObservations(validateAnswer(raw,bundle),bundle,path);
        if(!await this.plugin.evidenceCurrent(bundle,settings))throw new Error("Evidence changed. Assess again.");
        if(this.closed||epoch!==this.epoch||controller.signal.aborted)return;
        this.assessment={answer,bundle,settings,path,before,epoch};this.resultEl!.empty();
        for(const c of answer.answer)this.resultEl!.createEl("p",{text:`Interpretation / potentially conflicting evidence: ${c.text} (${c.sourceIds.join(", ")})`});
        for(const gap of answer.gaps)this.resultEl!.createEl("p",{text:`Gap: ${gap}`});
        for(const s of bundle.sources)this.resultEl!.createEl("button",{text:`${s.id}: ${s.path} › ${s.heading}`}).onclick=()=>{void this.plugin.openIndexedSource(s.path,bundle.noteHashes[s.path]!,s.heading,()=>!this.closed&&epoch===this.epoch).catch(e=>this.status?.setText(String(e)));};
        this.proposalButton!.disabled=false;this.status?.setText("Review the observations, enter your reasoning and choose an action. No notes have changed.");
      }catch(e){if(!this.closed&&epoch===this.epoch&&!controller.signal.aborted)this.status?.setText(e instanceof Error?e.message:"Assessment failed.");}
      finally{if(this.controller===controller)this.controller=null;this.generateButton!.disabled=false;}
    };
    this.proposalButton.onclick=async()=>{
      const reviewed=this.assessment;if(!reviewed)return;const approved={action,reasoning,name:replacementName,data:{...data}};this.proposalButton!.disabled=true;
      try{
        const {answer,bundle,settings,path,before,epoch}=reviewed;
        const current=()=>!this.closed&&epoch===this.epoch&&this.assessment===reviewed&&JSON.stringify(settings)===JSON.stringify(this.plugin.settings);
        if(!await this.plugin.evidenceCurrent(bundle,settings)||!current())throw new Error("Assessment is stale. Refresh and assess again.");
        const operations:{path:string;before:string|null;after:string}[]=[];let replacement="";let original=before;
        if(approved.action==="supersede"){
          original=supersededStatus(before,readMetadata(before,parseYaml).status);
          if(readMetadata(original,parseYaml).status!=="superseded")throw new Error("The YAML status could not be safely superseded. Normalize it manually first.");
          replacement=`${settings.selectedProject}/Decisions/${noteName(approved.name)}.md`;
          if(this.app.vault.getAbstractFileByPath(replacement))throw new Error("Replacement name already exists. Choose another name.");
          const content=decisionMarkdown(approved.data,this.plugin.projectIdentity(settings.selectedProject),bundle);
          operations.push({path:replacement,before:null,after:content});
        }
        operations.push({path,before,after:original+decisionReviewBlock(approved.action,approved.reasoning,answer,bundle,replacement)});
        await this.plugin.changes.propose(operations,this.plugin.changeContext(bundle,settings),current);
        if(current()){this.status?.setText("Decision action ready for exact before/after review.");this.plugin.openChanges();}
      }catch(e){if(!this.closed)this.status?.setText(e instanceof Error?e.message:"Could not propose decision action.");}
      finally{this.proposalButton!.disabled=!this.assessment;}
    };
    void load();
  }
}
