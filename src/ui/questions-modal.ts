import { Setting,parseYaml } from "obsidian";
import { ThreadModal } from "./thread-modal.ts";
import { NewNoteModal } from "./new-note-modal.ts";
import { questionMarkdown,questionRecord,updateQuestion,type QuestionStatus } from "../vault/questions.ts";
import { buildEvidence,readMetadata,type EvidenceBundle } from "../vault/evidence.ts";
import { localDay,noteName } from "../vault/workspace.ts";
import { contentHash } from "../vault/scope.ts";
import type { IndexEntry } from "../vault/index.ts";

export class QuestionsModal extends ThreadModal{
  private inputs=0;
  private clearChoices:()=>void=()=>{};
  override invalidate(message?:string):void{super.invalidate(message);this.clearChoices();}
  onOpen():void{
    const el=this.contentEl;el.createEl("h2",{text:"Project questions"});el.createEl("p",{text:"Create open questions or explicitly record an investigation, answer or reopening. Prior answers and reasons stay in Markdown. No model is needed. Legacy conversion creates a new copy and leaves the original unchanged."});
    let mode="new",name="",question="",state:QuestionStatus="investigating",answer="",reason="",day=localDay(),entries:IndexEntry[]=[],records:IndexEntry[]=[],legacy:{entry:IndexEntry;heading:string;text:string}[]=[],copied:{entry:IndexEntry;heading:string;text:string}|null=null,ready=false;
    const chosen=new Map<string,IndexEntry>();let questionInput:HTMLTextAreaElement,actionInput:HTMLSelectElement;
    const reset=()=>{this.inputs++;super.invalidate("Inputs changed. Prepare a new exact preview.");watch();if(ready)prepare.disabled=false;};
    new Setting(el).setName("Question action").addDropdown(d=>{actionInput=d.selectEl;d.selectEl.setAttribute("aria-label","Question action");d.addOption("new","Create open question").addOption("update","Update managed question").onChange(v=>{mode=v;reset();});});
    new Setting(el).setName("New question note name").addText(t=>{t.inputEl.setAttribute("aria-label","Question note name");t.onChange(v=>{name=v;reset();});});
    new Setting(el).setName("New question").addTextArea(t=>{questionInput=t.inputEl;t.inputEl.setAttribute("aria-label","New question");t.inputEl.maxLength=1000;t.onChange(v=>{question=v;reset();});});
    el.createEl("p",{text:"Optional: select a recognized legacy section and copy its text into a new question. Review and edit the question before previewing. No bulk conversion occurs."});
    const legacySelect=el.createEl("select",{attr:{"aria-label":"Legacy question section"}});
    el.createEl("button",{text:"Copy legacy section into new question"}).onclick=()=>{const source=legacy[Number(legacySelect.value)];if(!source||legacySelect.value==="")return;copied={...source,text:source.text.slice(0,1000)};question=copied.text;questionInput.value=question;mode="new";actionInput.value="new";reset();};
    el.createEl("p",{text:"Creation fields above affect new notes only; new questions always start open. Updates keep the original question text: choose an existing record, then enter its new state, your reason and an optional answer below."});
    const targets=el.createEl("select",{attr:{"aria-label":"Managed question to update"}});targets.onchange=()=>reset();
    el.createEl("button",{text:"Open selected question"}).onclick=()=>{
      const entry=records.find(e=>e.path===targets.value),epoch=this.epoch;if(!entry||this.closed)return;
      void this.plugin.openIndexedSource(entry.path,entry.hash,"",()=>!this.closed&&epoch===this.epoch).catch(error=>this.status?.setText(error instanceof Error?error.message:"Question unavailable. Refresh first."));
    };
    new Setting(el).setName("Record state").addDropdown(d=>{d.selectEl.setAttribute("aria-label","Question state");d.addOption("investigating","Investigating").addOption("answered","Answered - I record this answer").addOption("open","Open / reopen explicitly").onChange(v=>{if(["open","investigating","answered"].includes(v))state=v as QuestionStatus;reset();});});
    for(const[label,assign]of [["Question answer or working response",(v:string)=>answer=v],["Question update reason",(v:string)=>reason=v]] as const)new Setting(el).setName(label).addTextArea(t=>{t.inputEl.setAttribute("aria-label",label);t.inputEl.maxLength=5000;t.onChange(v=>{assign(v);reset();});});
    new Setting(el).setName("Question event date").addText(t=>{t.inputEl.type="date";t.inputEl.setAttribute("aria-label","Question event date");t.setValue(day).onChange(v=>{day=v;reset();});});
    el.createEl("p",{text:"Optional current evidence and related decisions (up to four). Adding a decision is a link only; its status never changes."});
    const sourceSelect=el.createEl("select",{attr:{"aria-label":"Question evidence or decision"}}),selectedEl=el.createDiv();
    const show=()=>{selectedEl.empty();for(const entry of chosen.values())selectedEl.createEl("button",{text:`Remove question evidence ${entry.path}`}).onclick=()=>{chosen.delete(entry.path);reset();show();};};
    el.createEl("button",{text:"Add question evidence or decision"}).onclick=()=>{const entry=entries.find(e=>e.path===sourceSelect.value);if(entry&&chosen.size<4){chosen.set(entry.path,entry);reset();show();}};
    const prepare=el.createEl("button",{text:"Preview question action",cls:"mod-cta"});prepare.disabled=true;
    el.createEl("button",{text:"Refresh questions"}).onclick=()=>{void load();};
    el.createEl("button",{text:"Cancel question action"}).onclick=()=>this.invalidate("Question action canceled. Refresh before continuing.");
    this.status=el.createEl("p",{attr:{role:"status","aria-live":"polite"}});this.resultEl=el.createDiv();
    const watch=()=>this.watchPaths([...new Set([...entries,...records,...legacy.map(v=>v.entry)].map(e=>e.path))]);
    this.clearChoices=()=>{ready=false;entries=[];records=[];legacy=[];chosen.clear();show();targets.replaceChildren(new Option("Refresh questions",""));sourceSelect.replaceChildren(new Option("Refresh evidence",""));legacySelect.replaceChildren(new Option("Refresh legacy sections",""));if(copied){copied=null;question="";questionInput.value="";}prepare.disabled=true;};
    const load=async()=>{
      this.invalidate("Loading permitted questions...");const epoch=this.epoch,settings=structuredClone(this.plugin.settings);
      try{
        await this.plugin.rebuildIndex();if(this.closed||epoch!==this.epoch||JSON.stringify(settings)!==JSON.stringify(this.plugin.settings))return;
        if(!settings.selectedProject)throw new Error("Select a project in Settings first.");
        entries=this.plugin.index.projectEntries(settings,null);records=this.plugin.index.projectRecords(settings,settings.selectedProject).filter(e=>e.metadata.type==="question");
        legacy=this.plugin.index.projectEntries(settings,settings.selectedProject).filter(e=>e.metadata.type!=="question").flatMap(entry=>entry.chunks.filter(c=>/^(?:open|unresolved) questions?$/i.test(c.heading.trim())).map(c=>({entry,heading:c.heading,text:c.excerpt})));
        targets.replaceChildren(new Option("Choose a managed question",""));for(const entry of records)targets.add(new Option(`${entry.path} - ${String(entry.metadata.status??"unknown")}`,entry.path));
        sourceSelect.replaceChildren(new Option("Choose current evidence or decision",""));for(const entry of entries)sourceSelect.add(new Option(`${entry.path} - ${String(entry.metadata.type??"note")} - ${String(entry.metadata.status??"")}`,entry.path));
        legacySelect.replaceChildren(new Option("Choose a legacy section",""));legacy.forEach((v,i)=>legacySelect.add(new Option(`${v.entry.path} > ${v.heading}`,String(i))));
        ready=true;watch();this.resultEl!.createEl("p",{text:`${records.length} managed question records; ${legacy.length} recognized legacy sections. Indexed coverage is bounded; no automatic conversion or resolution occurs.`});prepare.disabled=false;this.status?.setText("Ready. Choose an explicit action and review its exact preview. Unsupported or protected records need manual editing.");
      }catch(error){if(!this.closed&&epoch===this.epoch)this.status?.setText(error instanceof Error?error.message:"Could not load questions.");}
    };
    prepare.onclick=async()=>{
      if(prepare.disabled||this.controller)return;prepare.disabled=true;const controller=new AbortController();this.controller=controller;const epoch=this.epoch,inputs=this.inputs,settings=structuredClone(this.plugin.settings),approved={mode,name,question,state,answer,reason,day,path:targets.value,copied},selected=[...chosen.values()];
      const current=()=>!this.closed&&epoch===this.epoch&&inputs===this.inputs&&JSON.stringify(settings)===JSON.stringify(this.plugin.settings);
      try{
        if(!this.plugin.index.ready||!settings.selectedProject)throw new Error("Select a project and refresh questions first.");
        let bundle:EvidenceBundle=selected.length?await this.plugin.evidenceFromPaths(selected.map(e=>e.path),settings,controller.signal):{sources:[],noteHashes:{},truncated:false};
        for(const entry of selected)if(bundle.noteHashes[entry.path]!==entry.hash)throw new Error("Evidence changed. Refresh questions.");
        if(approved.mode==="new"){
          if(approved.copied){const origin=approved.copied,source=legacy.find(v=>v.entry.path===origin.entry.path&&v.heading===origin.heading);if(!source)throw new Error("Legacy source changed. Refresh first.");const original=await buildEvidence([{path:origin.entry.path,text:`## ${origin.heading}\n${origin.text}`,metadata:origin.entry.metadata,modifiedAt:origin.entry.modifiedAt,fullHash:origin.entry.hash}]);bundle={...bundle,sources:[...bundle.sources,...original.sources.map((s,i)=>({...s,id:`L${i+1}`}))],noteHashes:{...bundle.noteHashes,...original.noteHashes}};}
          bundle=this.plugin.withDependencies(bundle,settings);if(!await this.plugin.evidenceCurrent(bundle,settings)||!current())throw new Error("Evidence changed. Prepare a new preview.");
          const note={path:`${settings.selectedProject}/Questions/${noteName(approved.name)}.md`,content:questionMarkdown(approved.question,this.plugin.projectIdentity(settings.selectedProject),bundle,approved.day)};
          const captured=bundle,preview=new NewNoteModal(this.plugin,note,async()=>inputs===this.inputs&&this.plugin.active&&await this.plugin.evidenceCurrent(captured,settings)&&inputs===this.inputs);this.plugin.modals.add(preview);preview.open();
        }else{
          const entry=records.find(e=>e.path===approved.path);if(!entry||!this.plugin.changePathAllowed(entry.path))throw new Error("Choose a writable managed question. Protected original/source locations need manual editing.");
          const before=await this.plugin.readReviewedTarget(entry.path);if(before===null||await contentHash(before)!==entry.hash)throw new Error("Question changed. Refresh it first.");
          const metadata=readMetadata(before,parseYaml),record=questionRecord(metadata);if(this.plugin.index.entries.filter(e=>e.id===record.id).length!==1)throw new Error("Question ID is duplicated. Resolve it manually before updating.");
          bundle=this.plugin.withDependencies({...bundle,noteHashes:{...bundle.noteHashes,[entry.path]:entry.hash}},settings);
          if(!await this.plugin.evidenceCurrent(bundle,settings)||!current())throw new Error("Question/evidence changed. Prepare a new preview.");
          const after=updateQuestion(before,metadata,{status:approved.state,answer:approved.answer,reason:approved.reason,day:approved.day},bundle);
          await this.plugin.changes.propose([{path:entry.path,before,after}],this.plugin.changeContext(bundle,settings),current);if(current())this.plugin.openChanges();
        }
      }catch(error){if(!this.closed)this.status?.setText(error instanceof Error?error.message:"Could not prepare question action.");}
      finally{if(this.controller===controller){this.controller=null;if(current())prepare.disabled=false;}}
    };
    void load();
  }
}
