import { Setting } from "obsidian";
import { ThreadModal } from "./thread-modal.ts";
import { NewNoteModal } from "./new-note-modal.ts";
import { OllamaClient } from "../intelligence/ollama.ts";
import { SESSION_SCHEMA,sessionPrompt,validateSession,sessionMarkdown } from "../vault/session.ts";
import { localDay,noteName } from "../vault/workspace.ts";

export class SessionModal extends ThreadModal {
  generateButton:HTMLButtonElement|null=null;
  previewButton:HTMLButtonElement|null=null;
  override invalidate(message?:string):void{super.invalidate(message);if(this.previewButton)this.previewButton.disabled=true;if(this.generateButton)this.generateButton.disabled=false;}
  onOpen():void{
    const el=this.contentEl;el.createEl("h2",{text:"Session wrap-up"});el.createEl("p",{text:`Project: ${this.plugin.settings.selectedProject||"Select a project in Settings"}. Report your progress, generate a sourced summary, then review and save a new session note. Suggestions never accept decisions.`});
    let name=`${localDay()} Wrap-up`;let report="";
    const changed=()=>this.invalidate("Inputs changed. Generate a new wrap-up.");
    new Setting(el).setName("Session note name").addText(t=>{t.inputEl.setAttribute("aria-label","Session note name");t.setValue(name).onChange(v=>{name=v;changed();});});
    new Setting(el).setName("Your reported progress (optional)").addTextArea(t=>{t.inputEl.setAttribute("aria-label","Reported progress");t.inputEl.maxLength=5000;t.onChange(v=>{report=v;changed();});});
    this.generateButton=el.createEl("button",{text:"Generate session wrap-up",cls:"mod-cta"});el.createEl("button",{text:"Cancel wrap-up"}).onclick=()=>this.invalidate("Wrap-up canceled.");
    this.status=el.createEl("p",{attr:{role:"status","aria-live":"polite"}});this.resultEl=el.createDiv();this.previewButton=el.createEl("button",{text:"Preview session note",cls:"mod-cta"});this.previewButton.disabled=true;
    this.generateButton.onclick=async()=>{
      if(this.controller)return;this.invalidate();const controller=new AbortController();this.controller=controller;const epoch=this.epoch;const settings=structuredClone(this.plugin.settings);const approved={name,report};this.generateButton!.disabled=true;
      const current=()=>!this.closed&&epoch===this.epoch&&!controller.signal.aborted&&JSON.stringify(settings)===JSON.stringify(this.plugin.settings);
      try{
        if(!settings.selectedProject)throw new Error("Select an allowed project first.");const target=`${settings.selectedProject}/Sessions/${noteName(approved.name)}.md`;
        if(!this.plugin.index.ready)await this.plugin.rebuildIndex();if(!current())return;
        const project=this.plugin.projectIdentity(settings.selectedProject);this.status?.setText("Reading recorded project context...");
        const bundle=await this.plugin.evidence(settings,controller.signal);
        if(!bundle.sources.length)throw new Error("Add eligible project notes before generating a sourced wrap-up.");
        if(!current()||!await this.plugin.evidenceCurrent(bundle,settings))throw new Error("Project evidence changed. Generate again.");
        this.status?.setText("Generating a local session summary...");
        const raw=await new OllamaClient(settings.endpoint,settings.timeoutMs).generate(settings.model,sessionPrompt(bundle),controller.signal,SESSION_SCHEMA);
        const result=validateSession(raw,bundle);
        if(!current()||!await this.plugin.evidenceCurrent(bundle,settings))throw new Error("Project evidence changed. Generate again.");
        if(!current())return;
        const content=sessionMarkdown(approved.report,result,bundle,settings.model,project);this.resultEl!.createEl("pre",{text:content,cls:"thread-preview"});
        for(const s of bundle.sources)this.resultEl!.createEl("button",{text:`${s.id}: ${s.path} › ${s.heading}`}).onclick=()=>{void this.plugin.openIndexedSource(s.path,bundle.noteHashes[s.path]!,s.heading,current).catch(e=>this.status?.setText(String(e)));};
        this.previewButton!.disabled=false;this.previewButton!.onclick=()=>{
          if(!current())return;const preview=new NewNoteModal(this.plugin,{path:target,content},async()=>current()&&await this.plugin.evidenceCurrent(bundle,settings));this.plugin.modals.add(preview);preview.open();
        };
        this.status?.setText("Review the user report, recorded context, questions and suggested next step. Nothing is saved until you approve the note preview.");
      }catch(e){if(current())this.status?.setText(e instanceof Error?e.message:"Wrap-up failed.");}
      finally{if(this.controller===controller)this.controller=null;if(!this.closed&&epoch===this.epoch)this.generateButton!.disabled=false;}
    };
  }
}
