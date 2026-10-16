import { Notice,parseYaml,Setting } from "obsidian";
import { ThreadModal } from "./thread-modal.ts";
import type { ChangeBatch } from "../vault/changes.ts";
import { editableBody,lineDiff } from "../vault/change-draft.ts";
import { readableText } from "../vault/scope.ts";
import { FreshnessGraph,outputProjection,type FreshNote } from "../vault/freshness.ts";
import { readMetadata } from "../vault/evidence.ts";

export class ChangeReviewModal extends ThreadModal {
  undoId:string|null=null;
  running=false;
  draftId="";
  drafts=new Map<string,string>();
  dirty=false;
  draftRevision=0;
  applyButton:HTMLButtonElement|null=null;
  override invalidate(message?:string):void {this.drafts.clear();this.draftRevision++;super.invalidate(message);}

  onOpen():void{
    this.contentEl.createEl("h2",{text:"Review knowledge changes"});
    this.contentEl.createEl("p",{text:"Review every affected note. Originals are backed up before writes. Recovery and undo preserve later edits. History keeps the last 20 applied batches; filesystem changes are not atomic."});
    this.status=this.contentEl.createEl("p",{attr:{role:"status","aria-live":"polite"}});this.resultEl=this.contentEl.createDiv();
    this.contentEl.createEl("button",{text:"Refresh change review"}).onclick=()=>this.render();this.render();
  }
  private contextAllowed(batch:ChangeBatch):boolean{
    if(!batch.context)return true;
    try{const data=JSON.parse(batch.context) as {noteHashes:unknown};
      if(data.noteHashes===null||typeof data.noteHashes!=="object"||Array.isArray(data.noteHashes))return false;
      const paths=Object.keys(data.noteHashes);if(paths.length&&!this.plugin.index.ready)return false;
      // Applied/recovery batches retain validated original bytes. Use those exact
      // snapshots for their source context, never substitute newer provenance.
      const notes=new Map<string,FreshNote>(this.plugin.index.entries.map(note=>[note.path,note]));
      for(const op of batch.operations)if(op.before!==null&&op.beforeHash&&readableText(op.path,this.plugin.settings)){
        const metadata=readMetadata(op.before,parseYaml);const output=outputProjection(op.before,metadata).output;
        notes.set(op.path,{path:op.path,hash:op.beforeHash,metadata,...(typeof metadata.id==="string"?{id:metadata.id}:{}),...(output?{output}:{})});
      }
      const graph=new FreshnessGraph([...notes.values()],this.plugin.settings,this.plugin.index.renames);
      return Object.entries(data.noteHashes).every(([path,hash])=>typeof hash==="string"&&readableText(path,this.plugin.settings)&&graph.scopeAllows(path,hash));}
    catch{return false;}
  }
  private allowed(batch:ChangeBatch):boolean{return this.contextAllowed(batch)&&batch.operations.every(op=>this.plugin.changePathAllowed(op.path));}
  private diff(before:string,after:string,row:HTMLElement):void{
    const diff=lineDiff(before,after),changed=diff.lines.filter(line=>line.kind!=="same");
    row.createEl("p",{text:`${changed.filter(line=>line.kind==="added").length} added lines; ${changed.filter(line=>line.kind==="removed").length} removed lines. ${diff.minimal?"":"Large edit: a bounded bulk comparison is shown. "}Line endings count as changes. Full exact contents are available below.`});
    const visible=new Set<number>();
    diff.lines.forEach((line,i)=>{if(line.kind!=="same")for(let j=Math.max(0,i-2);j<=Math.min(diff.lines.length-1,i+2);j++)visible.add(j);});
    const indices=[...visible].sort((a,b)=>a-b),pre=row.createEl("pre",{cls:"thread-diff",attr:{"aria-label":"Changed lines, plus means added and minus means removed"}});
    let previous=-1;
    for(const i of indices.slice(0,500)){
      if(previous!==i-1)pre.createEl("span",{text:"... unchanged lines ...",cls:"thread-diff-same"});
      const line=diff.lines[i]!;pre.createEl("span",{text:`${line.kind==="added"?"+":line.kind==="removed"?"-":" "} ${line.text.replace(/\r?\n$/,"")}`,cls:`thread-diff-${line.kind}`});previous=i;
    }
    if(!changed.length)pre.setText("No content changes.");
    if(indices.length>500)row.createEl("p",{text:"Diff display shortened to 500 lines. Review the full exact contents before approval."});
  }
  private preview(batch:ChangeBatch,undo=false,editable=false):void{
    if(!this.contextAllowed(batch)){this.resultEl!.createEl("p",{text:"Supporting source snapshots changed, are unavailable or outside current read scope. Cached contents are hidden. Resolve source access before reviewing, or inspect the durable changes.json journal for manual recovery."});return;}
    for(const op of batch.operations){
      const row=this.resultEl!.createEl("section");row.createEl("h3",{text:op.path});
      if(!this.plugin.changePathAllowed(op.path)){row.createEl("p",{text:"Target outside current read/write scope. Its cached contents are hidden."});continue;}
      row.createEl("button",{text:"Open current note"}).onclick=()=>{void this.plugin.openChangeTarget(op.path).catch(e=>this.status?.setText(e instanceof Error?e.message:"Target unavailable."));};
      const before=undo?op.after:op.before??"",after=undo?op.before??"":op.after;
      this.diff(before,after,row);
      const exact=row.createEl("details");exact.createEl("summary",{text:"Full exact contents"});
      exact.createEl("h4",{text:undo?"Expected applied contents":"Before"});exact.createEl("pre",{text:undo?op.after:op.before??"New note - no original contents",cls:"thread-preview"});
      exact.createEl("h4",{text:undo?"Restore original":"After"});exact.createEl("pre",{text:undo?op.before??"Move this unchanged created note to Obsidian's local trash.":op.after,cls:"thread-preview"});
      if(editable){
        const editor=row.createEl("details",{cls:"thread-draft-editor"});editor.createEl("summary",{text:"Edit proposed body"});
        editor.createEl("p",{text:"Properties and provenance marker lines stay fixed. Your draft is not saved to a note. Every edit requires Renew exact preview. Unsaved drafts are discarded on close or source/scope changes."});
        new Setting(editor).setName("Proposed Markdown body").addTextArea(text=>{
          text.inputEl.setAttribute("aria-label",`Draft body for ${op.path}`);text.inputEl.maxLength=1048576;
          text.setValue(this.drafts.get(op.path)??editableBody(op.after).body).onChange(value=>{
            this.drafts.set(op.path,value);this.dirty=true;this.draftRevision++;
            if(this.applyButton)this.applyButton.disabled=true;
            this.status?.setText("Draft changed. Renew exact preview, then review the entire group before applying.");
          });
        });
      }
    }
  }
  private async run(action:()=>Promise<void>,success:string):Promise<void>{
    if(this.running)return;this.running=true;for(const control of this.contentEl.querySelectorAll<HTMLButtonElement|HTMLTextAreaElement>("button, textarea"))control.disabled=true;
    this.status?.setText("Checking and applying the reviewed operation...");
    try{await action();if(!this.closed)this.status?.setText(success);else new Notice(success);}
    catch(e){const message=e instanceof Error?e.message:"Change failed. Inspect recovery.";if(!this.closed)this.status?.setText(message);else new Notice(message);}
    finally{this.running=false;if(!this.closed){for(const control of this.contentEl.querySelectorAll<HTMLButtonElement|HTMLTextAreaElement>("button, textarea"))control.disabled=false;this.render(false);}}
  }
  render(clearStatus=true):void{
    if(this.closed||this.running)return;if(clearStatus)this.status?.setText("");this.resultEl!.empty();
    if(this.plugin.changesWarning){this.status?.setText(this.plugin.changesWarning);return;}
    this.applyButton=null;
    const state=this.plugin.changes.state;
    if(state.recovery){
      const recovery=state.recovery;this.resultEl!.createEl("h3",{text:"Recovery required"});
      this.resultEl!.createEl("p",{text:`Affected paths: ${recovery.paths.join(", ")}. Recovery restores the last stable batch state; unrelated later edits are left intact.`});
      this.resultEl!.createEl("p",{text:"1. Preserve changes.json and a copy of affected notes. 2. Open each current note and compare with the exact recovery preview. 3. Recover only when current contents match a stored batch state. If later edits conflict, preserve them and reconcile manually; do not delete the journal or broaden read permissions as a shortcut."});
      this.preview(recovery.batch,recovery.action==="apply");
      const restore=this.resultEl!.createEl("button",{text:"Recover previewed batch",cls:"mod-cta"});restore.disabled=!this.allowed(recovery.batch);
      restore.onclick=()=>{void this.run(()=>this.plugin.changes.recover(recovery.batch.id),"Recovery completed. Inspect the restored notes.");};
      return;
    }
    if(state.pending){
      const proposal=state.pending;
      if(this.draftId!==proposal.id){this.draftId=proposal.id;this.drafts.clear();this.dirty=false;}
      this.resultEl!.createEl("h3",{text:`Proposal ${proposal.status} · ${new Date(proposal.createdAt).toLocaleString()}`});
      this.resultEl!.createEl("p",{text:`Review all ${proposal.operations.length} related operations together. Approval applies to this exact proposal: ${proposal.id}.`});
      if(proposal.status==="stale")this.resultEl!.createEl("p",{text:"This proposal is stale. Preserve any draft you need, reject it, refresh evidence and generate a new proposal. Thread will not overwrite current notes to repair a conflict."});
      this.preview(proposal,false,proposal.status==="pending"&&this.allowed(proposal));
      if(proposal.status==="pending"&&this.allowed(proposal)){
        const renew=this.resultEl!.createEl("button",{text:"Renew exact preview"});
        renew.onclick=()=>{
          const revision=this.draftRevision,epoch=this.epoch;
          const bodies=proposal.operations.map(op=>this.drafts.get(op.path)??editableBody(op.after).body);
          void this.run(()=>this.plugin.changes.revise(proposal.id,bodies,()=>!this.closed&&epoch===this.epoch&&revision===this.draftRevision),"Exact preview renewed. Review every operation, then apply explicitly.");
        };
      }
      try{const context=JSON.parse(proposal.context) as {noteHashes?:Record<string,string>};
        for(const [path,hash] of Object.entries(context.noteHashes??{}))if(readableText(path,this.plugin.settings)){
          this.resultEl!.createEl("button",{text:`Source: ${path}`}).onclick=()=>{const epoch=this.epoch;void this.plugin.openIndexedSource(path,hash,"",()=>!this.closed&&this.epoch===epoch).catch(e=>this.status?.setText(e instanceof Error?e.message:"Source unavailable."));};
        }
      }catch{/* Human-only proposals have no source context. */}
      const apply=this.resultEl!.createEl("button",{text:"Apply previewed changes",cls:"mod-cta"});this.applyButton=apply;apply.disabled=this.dirty||proposal.status!=="pending"||!this.allowed(proposal);
      apply.onclick=()=>{if(this.dirty){this.status?.setText("Renew exact preview before applying edited drafts.");return;}void this.run(()=>this.plugin.changes.apply(proposal.id),"Applied reviewed changes. Originals remain in the last 20 batches.");};
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
