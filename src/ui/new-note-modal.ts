import { ThreadModal } from "./thread-modal.ts";
import type ThreadPlugin from "../main.ts";
import type { NewNote } from "../vault/workspace.ts";

export class NewNoteModal extends ThreadModal {
  note: NewNote;
  validate: ()=>Promise<boolean>;
  apply: HTMLButtonElement | null=null;
  applying=false;
  constructor(plugin:ThreadPlugin,note:NewNote,validate:()=>Promise<boolean>=async()=>true){super(plugin);this.note={...note};this.validate=validate;}
  override invalidate(message?:string): void {if(this.applying)return;super.invalidate(message);if(this.apply)this.apply.disabled=true;}
  protected async persist(approved:NewNote,validate:()=>Promise<void>,current:()=>boolean): Promise<void> {await this.plugin.createNotes([approved],validate,current);}
  onOpen(): void {
    this.contentEl.createEl("h2",{text:"Save a new note"});this.contentEl.createEl("p",{text:this.note.path});
    this.resultEl=this.contentEl.createDiv();this.resultEl.createEl("pre",{text:this.note.content,cls:"thread-preview"});
    this.status=this.contentEl.createEl("p",{text:"Review the exact contents. Existing notes are never overwritten.",attr:{role:"status","aria-live":"polite"}});
    this.apply=this.contentEl.createEl("button",{text:"Save previewed note",cls:"mod-cta"});
    this.apply.onclick=async()=>{
      if(this.apply!.disabled)return;this.apply!.disabled=true;this.applying=true;const epoch=this.epoch;const approved={...this.note};
      try{
        let validatedRevision=-1;let validatedSettings="";
        const validate=async()=>{
          const revision=this.plugin.index.revision;const settings=JSON.stringify(this.plugin.settings);
          if(this.closed||epoch!==this.epoch||!await this.validate())throw new Error("Evidence or settings changed. Generate a new preview.");
          if(this.closed||epoch!==this.epoch||revision!==this.plugin.index.revision||settings!==JSON.stringify(this.plugin.settings))throw new Error("Preview or evidence changed.");
          validatedRevision=revision;validatedSettings=settings;
        };
        await this.persist(approved,validate,()=>!this.closed&&epoch===this.epoch&&validatedRevision===this.plugin.index.revision&&validatedSettings===JSON.stringify(this.plugin.settings));
        if(!this.closed)this.status?.setText(`Saved ${approved.path}.`);
      }catch(e){if(!this.closed)this.status?.setText(e instanceof Error?e.message:"Save failed.");}
      finally{this.applying=false;}
    };
  }
}
