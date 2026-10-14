import { Setting } from "obsidian";
import { ThreadModal } from "./thread-modal.ts";
import { NewNoteModal } from "./new-note-modal.ts";
import { decisionMarkdown, type DecisionInput } from "../vault/decision.ts";
import { localDay, noteName } from "../vault/workspace.ts";
import { buildEvidence } from "../vault/evidence.ts";
import type { IndexEntry } from "../vault/index.ts";

export class DecisionModal extends ThreadModal {
  clearEvidence:()=>void=()=>{};
  previewButton:HTMLButtonElement|null=null;
  override invalidate(message?:string): void {super.invalidate(message);this.clearEvidence();if(this.previewButton)this.previewButton.disabled=true;}
  onOpen(): void {
    const el=this.contentEl;el.createEl("h2",{text:"Project decisions"});
    el.createEl("p",{text:"Record your choice. Proposed is the default; select Accepted only when you explicitly accept it. Existing decisions, including superseded ones, remain available below."});
    let name="";const data:DecisionInput={question:"",choice:"",alternatives:"",rationale:"",constraints:"",revisit:"",status:"proposed",date:localDay()};
    new Setting(el).setName("New decision note name").addText(t=>{t.inputEl.setAttribute("aria-label","New decision note name");t.onChange(v=>name=v);});
    const fields=[['question','Question'],['choice','Choice'],['alternatives','Alternatives'],['rationale','Rationale'],['constraints','Constraints'],['revisit','Revisit when']] as const;
    for(const [key,label] of fields)new Setting(el).setName(label).addTextArea(t=>{t.inputEl.setAttribute("aria-label",label);t.inputEl.maxLength=5000;t.onChange(v=>data[key]=v);});
    new Setting(el).setName("Decision status").addDropdown(d=>{d.selectEl.setAttribute("aria-label","Decision status");d.addOption("proposed","Proposed").addOption("accepted","Accepted — I accept this choice").onChange(v=>{if(v==="proposed"||v==="accepted")data.status=v;});});
    new Setting(el).setName("Decision date").addText(t=>{t.inputEl.type="date";t.inputEl.setAttribute("aria-label","Decision date");t.setValue(data.date).onChange(v=>data.date=v);});
    let entries:IndexEntry[]=[];let chosenPath="";const selected=new Map<string,IndexEntry>();
    const evidence=el.createDiv();const sourceSelect=document.createElement("select");sourceSelect.setAttribute("aria-label","Decision evidence");evidence.appendChild(sourceSelect);
    sourceSelect.onchange=()=>chosenPath=sourceSelect.value;
    const selectedEl=el.createDiv();
    evidence.createEl("button",{text:"Add selected evidence"}).onclick=()=>{
      const entry=entries.find(e=>e.path===chosenPath);
      if(entry&&selected.size<10){selected.set(entry.path,entry);renderSelected();}
    };
    const renderSelected=()=>{selectedEl.empty();for(const entry of selected.values())selectedEl.createEl("button",{text:`Remove ${entry.path}`}).onclick=()=>{selected.delete(entry.path);renderSelected();};};
    this.clearEvidence=()=>{entries=[];selected.clear();renderSelected();chosenPath="";sourceSelect.replaceChildren(new Option("Refresh eligible evidence", ""));};
    this.status=el.createEl("p",{attr:{role:"status","aria-live":"polite"}});
    const preview=el.createEl("button",{text:"Preview decision note",cls:"mod-cta"});
    this.previewButton=preview;preview.disabled=true;
    preview.onclick=async()=>{
      const epoch=this.epoch;const settings=structuredClone(this.plugin.settings);const approved={...data};const approvedName=name;
      try{
        if(!settings.selectedProject)throw new Error("Select a project in Settings first.");
        if(!this.plugin.index.ready)throw new Error("Project evidence is still loading. Refresh decisions before previewing.");
        const bundle=this.plugin.withDependencies(await buildEvidence([...selected.values()].map(entry=>({path:entry.path,text:entry.chunks[0]?.excerpt??"",metadata:entry.metadata,modifiedAt:entry.modifiedAt,fullHash:entry.hash}))),settings);
        if(!await this.plugin.evidenceCurrent(bundle,settings)||this.closed||epoch!==this.epoch)throw new Error("Evidence changed. Refresh decisions and select current evidence.");
        const content=decisionMarkdown(approved,this.plugin.projectIdentity(settings.selectedProject),bundle);
        const path=`${settings.selectedProject}/Decisions/${noteName(approvedName)}.md`;
        const modal=new NewNoteModal(this.plugin,{path,content},()=>this.plugin.evidenceCurrent(bundle,settings));this.plugin.modals.add(modal);modal.open();
      }catch(e){this.status?.setText(e instanceof Error?e.message:"Preview failed.");}
    };
    el.createEl("button",{text:"Refresh decisions and evidence"}).onclick=()=>{void load();};
    el.createEl("h3",{text:"Recorded decisions"});this.resultEl=el.createDiv();
    const load=async()=>{
      const epoch=this.epoch;const settings=structuredClone(this.plugin.settings);
      try{
        if(!this.plugin.index.ready)await this.plugin.rebuildIndex();
        if(this.closed||epoch!==this.epoch||JSON.stringify(settings)!==JSON.stringify(this.plugin.settings))return;
        entries=this.plugin.index.projectEntries(settings,null);
        sourceSelect.replaceChildren(new Option("Choose eligible evidence", ""));for(const entry of entries)sourceSelect.add(new Option(entry.path,entry.path));
        selected.clear();renderSelected();chosenPath="";this.resultEl!.empty();
        const decisions=settings.selectedProject?this.plugin.index.projectEntries(settings,settings.selectedProject).filter(e=>e.metadata.type==="decision"):[];
        for(const entry of decisions){const row=this.resultEl!.createDiv();row.createEl("span",{text:`${String(entry.metadata.status??"status not recorded")}: `});
          row.createEl("button",{text:entry.path}).onclick=()=>{void this.plugin.openIndexedSource(entry.path,entry.hash,"",()=>!this.closed&&epoch===this.epoch).catch(e=>this.status?.setText(e instanceof Error?e.message:"Source unavailable."));};
        }
        preview.disabled=!settings.selectedProject;
        this.status?.setText(settings.selectedProject?`${decisions.length} recorded decisions. Evidence is optional; missing fields stay explicit.`:"Select a project in Thread Settings first.");
      }catch(e){if(!this.closed)this.status?.setText(e instanceof Error?e.message:"Could not load decisions.");}
    };
    void load();
  }
}
