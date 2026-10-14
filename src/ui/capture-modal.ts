import { Setting } from "obsidian";
import { ThreadModal } from "./thread-modal.ts";
import { NewNoteModal } from "./new-note-modal.ts";
import type ThreadPlugin from "../main.ts";
import { captureMarkdown, importFileName, suggestProject } from "../vault/capture.ts";
import { localDay, noteName, type NewNote } from "../vault/workspace.ts";

class CapturePreviewModal extends NewNoteModal {
  importHash:string|null;
  constructor(plugin:ThreadPlugin,note:NewNote,validate:()=>Promise<boolean>,hash:string|null){super(plugin,note,validate);this.importHash=hash;}
  protected override async persist(note:NewNote,validate:()=>Promise<void>,current:()=>boolean): Promise<void> {
    if(!this.importHash){await super.persist(note,validate,current);return;}
    if(this.plugin.importsWarning)throw new Error(this.plugin.importsWarning);
    await this.plugin.imports.run(this.importHash,note.path,path=>Boolean(this.app.vault.getAbstractFileByPath(path)),
      ()=>super.persist(note,validate,current),value=>this.app.vault.adapter.write(this.plugin.importsPath(),value));
  }
}

export class CaptureModal extends ThreadModal {
  clearChoices:()=>void=()=>{};
  override invalidate(message?:string): void {super.invalidate(message);this.clearChoices();}
  onOpen(): void {
    const el=this.contentEl;el.createEl("h2",{text:"Capture a thought or source"});
    el.createEl("p",{text:"Choose a UTF-8 Markdown/text file up to 2 MB, or type a thought. Original files stay untouched. No URLs or attachments are fetched."});
    let text="";let original="";let imported=false;let url="";let name=`Capture ${localDay()} ${crypto.randomUUID().slice(0,8)}`;let project="";
    const file=el.createEl("input",{attr:{type:"file",accept:".md,.txt","aria-label":"Import Markdown or text"}});
    let textArea:HTMLTextAreaElement;
    new Setting(el).setName("Captured text").addTextArea(t=>{textArea=t.inputEl;t.inputEl.setAttribute("aria-label","Captured text");t.onChange(v=>{if(!imported)text=v;});});
    let selection=0;
    const chooseThought=el.createEl("button",{text:"Use a typed thought"});chooseThought.onclick=()=>{selection++;imported=false;original="";file.value="";text=textArea.value;textArea.readOnly=false;preview.disabled=!this.plugin.index.ready;};
    new Setting(el).setName("New source note name").addText(t=>{t.inputEl.setAttribute("aria-label","New source note name");t.setValue(name).onChange(v=>name=v);});
    new Setting(el).setName("Original URL (optional)").addText(t=>{t.inputEl.setAttribute("aria-label","Original URL");t.inputEl.maxLength=2000;t.onChange(v=>url=v);});
    const projectSelect=el.createEl("select",{attr:{"aria-label":"Capture project association"}});projectSelect.add(new Option("No project association",""));projectSelect.onchange=()=>project=projectSelect.value;
    const suggestionEl=el.createDiv();let suggestionPath="";
    const suggest=el.createEl("button",{text:"Suggest project"});suggest.onclick=()=>{
      const match=suggestProject(text,this.plugin.index.projectEntries(this.plugin.settings,null));suggestionPath=match?.path.slice(0,match.path.lastIndexOf("/"))??"";
      suggestionEl.setText(match?`Suggestion: ${suggestionPath}. This does not assign the source.`:"No project suggestion from current allowed notes.");
    };
    el.createEl("button",{text:"Use suggested project"}).onclick=()=>{if(suggestionPath&&[...projectSelect.options].some(o=>o.value===suggestionPath)){project=suggestionPath;projectSelect.value=project;}};
    this.status=el.createEl("p",{attr:{role:"status","aria-live":"polite"}});this.resultEl=el.createDiv();
    file.onchange=async()=>{
      const token=++selection;const chosen=file.files?.[0];if(!chosen)return;
      text="";original="";imported=false;textArea.value="";textArea.readOnly=false;preview.disabled=true;
      try{
        importFileName(chosen.name,chosen.size);const decoded=new TextDecoder("utf-8",{fatal:true,ignoreBOM:true}).decode(await chosen.arrayBuffer());
        if(this.closed||token!==selection)return;
        text=decoded;original=chosen.name;imported=true;textArea.value=decoded;textArea.readOnly=true;
        preview.disabled=!this.plugin.index.ready;
        this.status?.setText(`Loaded ${chosen.name}. Exact decoded original text is preserved; preview before saving.`);
      }catch(e){this.status?.setText(e instanceof Error?e.message:"Could not read this UTF-8 text file.");}
    };
    const preview=el.createEl("button",{text:"Preview captured note",cls:"mod-cta"});preview.disabled=true;
    this.clearChoices=()=>{project="";suggestionPath="";suggestionEl.empty();projectSelect.replaceChildren(new Option("Refresh eligible projects",""));preview.disabled=true;};
    preview.onclick=async()=>{
      const epoch=this.epoch;const settings=structuredClone(this.plugin.settings);const approved={text,original,imported,url,name,project};
      try{
        if(!this.plugin.index.ready)throw new Error("Refresh projects before previewing.");
        const root=approved.imported?settings.roles.sources:settings.roles.inbox;if(!root)throw new Error(`Map the ${approved.imported?"Sources":"Inbox"} folder in Thread Settings first.`);
        const identity=approved.project?this.plugin.projectIdentity(approved.project):"";
        const noteHashes=Object.fromEntries(this.plugin.index.projectEntries(settings,null)
          .filter(e=>approved.project&&e.metadata.type==="project"&&e.path.slice(0,e.path.lastIndexOf("/"))===approved.project).map(e=>[e.path,e.hash]));
        const association={sources:[],truncated:false,noteHashes};
        const captured=await captureMarkdown(approved.text,approved.original,identity,approved.url,approved.imported);
        if(this.closed||epoch!==this.epoch||JSON.stringify(settings)!==JSON.stringify(this.plugin.settings))throw new Error("Settings or notes changed. Refresh and preview again.");
        if(approved.imported&&this.plugin.importsWarning)throw new Error(this.plugin.importsWarning);
        const previous=approved.imported?this.plugin.imports.duplicate(captured.hash,path=>Boolean(this.app.vault.getAbstractFileByPath(path))):null;
        if(previous)throw new Error(`This exact input was already imported at ${previous}. That note may have changed.`);
        const note={path:`${root}/${noteName(approved.name)}.md`,content:captured.content};
        const modal=new CapturePreviewModal(this.plugin,note,()=>this.plugin.evidenceCurrent(association,settings),approved.imported?captured.hash:null);this.plugin.modals.add(modal);modal.open();
      }catch(e){this.status?.setText(e instanceof Error?e.message:"Preview failed.");}
    };
    const refresh=async()=>{
      const epoch=this.epoch;try{
        if(!this.plugin.index.ready)await this.plugin.rebuildIndex();if(this.closed||epoch!==this.epoch)return;
        projectSelect.replaceChildren(new Option("No project association",""));project="";suggestionPath="";suggestionEl.empty();
        for(const entry of this.plugin.index.projectEntries(this.plugin.settings,null).filter(e=>e.metadata.type==="project")){
          const path=entry.path.slice(0,entry.path.lastIndexOf("/"));projectSelect.add(new Option(path,path));
        }
        preview.disabled=false;this.status?.setText("Capture is ready. Project association stays empty until you select one.");
      }catch(e){if(!this.closed)this.status?.setText(e instanceof Error?e.message:"Could not load projects.");}
    };
    el.createEl("button",{text:"Refresh projects"}).onclick=()=>{void refresh();};
    el.createEl("button",{text:"Rebuild import history from allowed notes"}).onclick=()=>{void this.plugin.rebuildImports().then(()=>this.status?.setText("Import history rebuilt from currently allowed source notes."),()=>this.status?.setText("Could not rebuild history. Check vault write access."));};
    void refresh();
  }
}
