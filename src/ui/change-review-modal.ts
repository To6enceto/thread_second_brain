import { Notice } from "obsidian";
import { ThreadModal } from "./thread-modal.ts";
import type { ChangeBatch } from "../vault/changes.ts";
import { readableText } from "../vault/scope.ts";

export class ChangeReviewModal extends ThreadModal {
  undoId:string|null=null;
  running=false;
  override invalidate(message?:string):void {if(this.running)return;super.invalidate(message);}
  onOpen():void{
    this.contentEl.createEl("h2",{text:"Review knowledge changes"});
    this.contentEl.createEl("p",{text:"Review every affected note. Originals are backed up before writes. Recovery and undo preserve later edits. History keeps the last 20 applied batches; filesystem changes are not atomic."});
    this.status=this.contentEl.createEl("p",{attr:{role:"status","aria-live":"polite"}});this.resultEl=this.contentEl.createDiv();
    this.contentEl.createEl("button",{text:"Refresh change review"}).onclick=()=>this.render();this.render();
  }
  private contextAllowed(batch:ChangeBatch):boolean{
    if(!batch.context)return true;
    try{const data=JSON.parse(batch.context) as {noteHashes:unknown};return data.noteHashes!==null&&typeof data.noteHashes==="object"&&!Array.isArray(data.noteHashes)&&Object.keys(data.noteHashes).every(path=>readableText(path,this.plugin.settings));}
    catch{return false;}
  }
  private allowed(batch:ChangeBatch):boolean{return this.contextAllowed(batch)&&batch.operations.every(op=>this.plugin.changePathAllowed(op.path));}
  private preview(batch:ChangeBatch,undo=false):void{
    if(!this.contextAllowed(batch)){this.resultEl!.createEl("p",{text:"Source read scope changed. Cached note contents are hidden; restore their allowed scope before reviewing this batch."});return;}
    for(const op of batch.operations){
      const row=this.resultEl!.createEl("section");row.createEl("h3",{text:op.path});
      if(!this.plugin.changePathAllowed(op.path)){row.createEl("p",{text:"Target outside current read/write scope. Its cached contents are hidden."});continue;}
      row.createEl("button",{text:"Open current note"}).onclick=()=>{void this.plugin.openChangeTarget(op.path).catch(e=>this.status?.setText(e instanceof Error?e.message:"Target unavailable."));};
      row.createEl("h4",{text:undo?"Expected applied contents":"Before"});row.createEl("pre",{text:undo?op.after:op.before??"New note — no original contents",cls:"thread-preview"});
      row.createEl("h4",{text:undo?"Restore original":"After"});row.createEl("pre",{text:undo?op.before??"Move this unchanged created note to Obsidian's local trash.":op.after,cls:"thread-preview"});
    }
  }
  private async run(action:()=>Promise<void>,success:string):Promise<void>{
    if(this.running)return;this.running=true;for(const button of this.contentEl.querySelectorAll("button"))button.disabled=true;
    this.status?.setText("Checking and applying the reviewed operation...");
    try{await action();if(!this.closed)this.status?.setText(success);else new Notice(success);}
    catch(e){const message=e instanceof Error?e.message:"Change failed. Inspect recovery.";if(!this.closed)this.status?.setText(message);else new Notice(message);}
    finally{this.running=false;if(!this.closed){for(const button of this.contentEl.querySelectorAll("button"))button.disabled=false;this.render(false);}}
  }
  render(clearStatus=true):void{
    if(this.closed||this.running)return;if(clearStatus)this.status?.setText("");this.resultEl!.empty();
    if(this.plugin.changesWarning){this.status?.setText(this.plugin.changesWarning);return;}
    const state=this.plugin.changes.state;
    if(state.recovery){
      const recovery=state.recovery;this.resultEl!.createEl("h3",{text:"Recovery required"});
      this.resultEl!.createEl("p",{text:`Affected paths: ${recovery.paths.join(", ")}. Recovery restores the last stable batch state; unrelated later edits are left intact.`});
      this.preview(recovery.batch,recovery.action==="apply");
      const restore=this.resultEl!.createEl("button",{text:"Recover previewed batch",cls:"mod-cta"});restore.disabled=!this.allowed(recovery.batch);
      restore.onclick=()=>{void this.run(()=>this.plugin.changes.recover(recovery.batch.id),"Recovery completed. Inspect the restored notes.");};
      return;
    }
    if(state.pending){
      const proposal=state.pending;this.resultEl!.createEl("h3",{text:`Proposal ${proposal.status} · ${new Date(proposal.createdAt).toLocaleString()}`});this.preview(proposal);
      try{const context=JSON.parse(proposal.context) as {noteHashes?:Record<string,string>};
        for(const [path,hash] of Object.entries(context.noteHashes??{}))if(readableText(path,this.plugin.settings)){
          this.resultEl!.createEl("button",{text:`Source: ${path}`}).onclick=()=>{const epoch=this.epoch;void this.plugin.openIndexedSource(path,hash,"",()=>!this.closed&&this.epoch===epoch).catch(e=>this.status?.setText(e instanceof Error?e.message:"Source unavailable."));};
        }
      }catch{/* Human-only proposals have no source context. */}
      const apply=this.resultEl!.createEl("button",{text:"Apply previewed changes",cls:"mod-cta"});apply.disabled=proposal.status!=="pending"||!this.allowed(proposal);
      apply.onclick=()=>{void this.run(()=>this.plugin.changes.apply(proposal.id),"Applied reviewed changes. Originals remain in the last 20 batches.");};
      this.resultEl!.createEl("button",{text:"Reject proposal"}).onclick=()=>{void this.run(()=>this.plugin.changes.reject(proposal.id),"Proposal rejected; no notes were changed.");};
    }else this.resultEl!.createEl("p",{text:"No pending proposal. Choose Knowledge updates to prepare one."});
    this.resultEl!.createEl("h3",{text:"Applied history"});
    for(const batch of [...state.history].reverse()){
      const row=this.resultEl!.createDiv();row.createEl("p",{text:`${new Date(batch.createdAt).toLocaleString()} · ${batch.operations.map(o=>o.path).join(", ")}${batch.undone?" · undone":""}`});
      if(!batch.undone){const show=row.createEl("button",{text:"Preview undo"});show.disabled=Boolean(state.pending)||!this.allowed(batch);show.onclick=()=>{this.undoId=batch.id;this.render();};}
    }
    const undo=state.history.find(b=>b.id===this.undoId&&!b.undone);
    if(undo&&!state.pending){
      this.resultEl!.createEl("h3",{text:"Undo preview"});this.preview(undo,true);
      const apply=this.resultEl!.createEl("button",{text:"Undo previewed batch"});apply.disabled=!this.allowed(undo);apply.onclick=()=>{void this.run(()=>this.plugin.changes.undo(undo.id),"Undo completed.");};
    }
  }
}
