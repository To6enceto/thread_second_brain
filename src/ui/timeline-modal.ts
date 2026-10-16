import { Setting, TFile, TFolder } from "obsidian";
import { ThreadModal } from "./thread-modal.ts";
import { NewNoteModal } from "./new-note-modal.ts";
import { milestoneMarkdown, projectTimeline } from "../vault/timeline.ts";
import { localDay, noteName } from "../vault/workspace.ts";
import { contentHash, readableText } from "../vault/scope.ts";
import type { ThreadSettings } from "../settings/settings.ts";

export class TimelineModal extends ThreadModal {
  inputs=0;
  preview:HTMLButtonElement|null=null;
  clearIdentity:()=>void=()=>{};
  override invalidate(message?:string):void {super.invalidate(message);this.clearIdentity();if(this.preview)this.preview.disabled=true;}
  private async identityCurrent(settings:ThreadSettings,id:string,hashes:Record<string,string>,inputs:number):Promise<boolean>{
    const valid=()=>!this.closed&&this.plugin.active&&inputs===this.inputs&&JSON.stringify(settings)===JSON.stringify(this.plugin.settings)&&this.app.vault.getAbstractFileByPath(settings.selectedProject) instanceof TFolder;
    if(!valid())return false;if(!this.plugin.index.ready)await this.plugin.rebuildIndex();
    const revision=this.plugin.index.revision,entries=this.plugin.index.entries;
    if(!valid()||!this.plugin.index.projectRecords(settings,settings.selectedProject).length||this.plugin.projectIdentity(settings.selectedProject)!==id)return false;
    for(const [path,hash]of Object.entries(hashes)){
      if(!valid()||!readableText(path,this.plugin.settings))return false;const file=this.app.vault.getAbstractFileByPath(path);if(!(file instanceof TFile))return false;
      const raw=await this.app.vault.read(file);if(file.path!==path||!valid()||!readableText(path,this.plugin.settings)||await contentHash(raw)!==hash)return false;
    }
    return valid()&&this.plugin.index.ready&&revision===this.plugin.index.revision&&entries===this.plugin.index.entries&&this.plugin.projectIdentity(settings.selectedProject)===id;
  }
  onOpen():void {
    const el=this.contentEl;el.createEl("h2",{text:"Project timeline"});el.createEl("p",{text:"Read recorded chronology without AI. Dates describe explicit note fields or headings; capture and file modification dates are separate. This is not a complete historical event log."});
    const refresh=el.createEl("button",{text:"Refresh timeline",cls:"mod-cta"});el.createEl("button",{text:"Cancel timeline refresh"}).onclick=()=>this.invalidate("Timeline refresh canceled. Refresh when ready.");
    this.status=el.createEl("p",{attr:{role:"status","aria-live":"polite"}});
    const form=el.createEl("details");form.createEl("summary",{text:"Record a user-reported milestone"});form.createEl("p",{text:"Record your own milestone on or before today. A record is not independent verification of an achievement. Saving creates a new note after exact review."});
    let name=`Milestone ${localDay()} ${crypto.randomUUID().slice(0,6)}`,title="",detail="",day=localDay(),identity:{settings:ThreadSettings;id:string;hashes:Record<string,string>}|null=null;
    this.clearIdentity=()=>{identity=null;};const changed=()=>{this.inputs++;this.status?.setText("Milestone inputs changed. Prepare a new exact preview.");};
    for(const[label,initial,assign]of [["Milestone note name",name,(v:string)=>name=v],["Milestone title",title,(v:string)=>title=v]] as const)new Setting(form).setName(label).addText(t=>{t.inputEl.setAttribute("aria-label",label);t.inputEl.maxLength=label==="Milestone title"?200:100;t.setValue(initial).onChange(v=>{assign(v);changed();});});
    new Setting(form).setName("Milestone detail").addTextArea(t=>{t.inputEl.setAttribute("aria-label","Milestone detail");t.inputEl.maxLength=5000;t.onChange(v=>{detail=v;changed();});});
    new Setting(form).setName("User-reported milestone event date").addText(t=>{t.inputEl.setAttribute("aria-label","Milestone event date");t.inputEl.type="date";t.inputEl.max=localDay();t.setValue(day).onChange(v=>{day=v;changed();});});
    this.preview=form.createEl("button",{text:"Preview milestone note",cls:"mod-cta"});this.preview.disabled=true;
    this.preview.onclick=async()=>{
      if(!identity||this.preview!.disabled)return;const captured=identity,inputs=this.inputs,approved={name,title,detail,day};this.preview!.disabled=true;
      try{
        if(!await this.identityCurrent(captured.settings,captured.id,captured.hashes,inputs))throw new Error("Project identity, inputs or permissions changed. Refresh the timeline and prepare again.");
        const note={path:`${captured.settings.selectedProject}/Milestones/${noteName(approved.name)}.md`,content:milestoneMarkdown(captured.id,approved.title,approved.detail,approved.day)};
        if(!this.plugin.changePathAllowed(note.path))throw new Error("This project is outside current mapped write destinations. Select a writable project or record the milestone manually; read permissions stay unchanged.");
        const modal=new NewNoteModal(this.plugin,note,()=>this.identityCurrent(captured.settings,captured.id,captured.hashes,inputs));this.plugin.modals.add(modal);modal.open();this.status?.setText("Exact milestone preview ready. The new note does not change prior records.");
      }catch(error){if(!this.closed)this.status?.setText(error instanceof Error?error.message:"Could not prepare milestone.");}
      finally{if(!this.closed&&identity===captured)this.preview!.disabled=false;}
    };
    this.resultEl=el.createDiv();
    const load=async()=>{
      this.invalidate("Loading recorded chronology...");const epoch=this.epoch,settings=structuredClone(this.plugin.settings),controller=new AbortController();this.controller=controller;refresh.disabled=true;
      const current=()=>!this.closed&&epoch===this.epoch&&!controller.signal.aborted&&JSON.stringify(settings)===JSON.stringify(this.plugin.settings);
      try{
        await this.plugin.rebuildIndex();if(!current())return;const timeline=projectTimeline(this.plugin.index,settings),id=this.plugin.projectIdentity(settings.selectedProject),records=this.plugin.index.projectRecords(settings,settings.selectedProject);
        this.watchPaths([...records.map(e=>e.path),...timeline.events.flatMap(e=>e.related?[e.related.path]:[])]);
        identity={settings,id,hashes:Object.fromEntries(records.filter(e=>e.path.slice(0,e.path.lastIndexOf("/"))===settings.selectedProject&&e.metadata.type==="project").map(e=>[e.path,e.hash]))};
        const root=this.resultEl!;root.createEl("p",{text:`${settings.selectedProject}: showing ${timeline.events.length} of ${timeline.total} recognized events; ${timeline.unknown} have unknown chronology. Examined ${timeline.examined} of ${timeline.records} project records.`});
        for(const known of [true,false]){
          const events=timeline.events.filter(e=>Boolean(e.day)===known);if(!events.length)continue;root.createEl("h3",{text:known?"Recorded dates (newest first)":"Chronology unknown"});const list=root.createEl("ol",{cls:"thread-timeline"});
          for(const event of events){
            const row=list.createEl("li");row.createEl("p",{text:`${event.day??"Unknown date"} - ${event.kind} (${event.dateBasis})`});row.createEl("p",{text:event.text});row.createEl("p",{text:`${event.capture}; file modified: ${event.modified} (not an event-date claim).`,cls:"thread-meta"});
            const open=(path:string,hash:string,heading:string,label:string)=>{row.createEl("button",{text:label,cls:"thread-source"}).onclick=()=>{void this.plugin.openIndexedSource(path,hash,heading,current).catch(error=>this.status?.setText(error instanceof Error?error.message:"Source unavailable. Refresh the timeline."));};};
            if(event.usable)open(event.path,event.hash,event.heading,event.path);else{row.createEl("p",{text:"Record evidence is stale or unsupported; excerpts are hidden. Inspect Source freshness or normalize the record manually."});row.createEl("button",{text:"Open Source freshness"}).onclick=()=>{if(current())this.plugin.openFreshness(event.path);};}
            if(event.related)open(event.related.path,event.related.hash,"",`Current note at recorded replacement path: ${event.related.path}`);
          }
        }
        if(!timeline.total)root.createEl("p",{text:"No recognized timeline events yet. Existing notes stay unchanged; optionally record a milestone or session."});
        const limits=root.createEl("details");limits.createEl("summary",{text:"Chronology and coverage limits"});for(const limit of timeline.limits)limits.createEl("p",{text:limit,cls:"thread-meta"});
        this.preview!.disabled=false;this.status?.setText("Timeline ready. Nothing changed or ran inference.");
      }catch(error){if(current())this.status?.setText(error instanceof Error?error.message:"Could not load the timeline.");}
      finally{if(this.controller===controller)this.controller=null;refresh.disabled=false;}
    };
    refresh.onclick=()=>{void load();};void load();
  }
}
