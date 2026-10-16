import { disposedReviewQueue } from "../vault/review-events.ts";
import { ReviewActionModal } from "./review-action-modal.ts";
import { ThreadModal } from "./thread-modal.ts";
import { queueKinds, queueLabels, type QueueSource } from "../vault/review-queue.ts";

export class ReviewQueueModal extends ThreadModal {
  onOpen():void{
    this.contentEl.createEl("h2",{text:"Project review queue"});
    this.contentEl.createEl("p",{text:"Inspect recorded changes and follow up explicitly. Opening this queue does not run AI, change notes/statuses, resolve questions or satisfy conditions. Refresh to inspect a new snapshot."});
    this.status=this.contentEl.createEl("p",{attr:{role:"status","aria-live":"polite"}});
    const refresh=this.contentEl.createEl("button",{text:"Refresh review queue",cls:"mod-cta"});
    this.contentEl.createEl("button",{text:"Cancel refresh"}).onclick=()=>this.invalidate("Queue refresh canceled.");
    this.contentEl.createEl("button",{text:"Review changes and recovery"}).onclick=()=>this.plugin.openChanges();
    this.resultEl=this.contentEl.createDiv();
    const load=async()=>{
      this.invalidate("Reading current project review records...");const epoch=this.epoch,settings=structuredClone(this.plugin.settings),controller=new AbortController();this.controller=controller;refresh.disabled=true;
      try{
        await this.plugin.rebuildIndex();controller.signal.throwIfAborted();
        if(this.closed||epoch!==this.epoch||JSON.stringify(settings)!==JSON.stringify(this.plugin.settings))return;
        const queue=await disposedReviewQueue(this.plugin.index,settings,(path,hash)=>this.plugin.questionReviewReferences(path,hash),undefined,controller.signal);
        if(this.closed||epoch!==this.epoch||JSON.stringify(settings)!==JSON.stringify(this.plugin.settings))return;
        const root=this.resultEl!;
        this.watchPaths([...new Set([...this.plugin.index.projectRecords(settings,settings.selectedProject).map(entry=>entry.path),...queue.pending.flatMap(row=>Object.keys(row.snapshot?.hashes??{[row.item.path]:row.item.hash}))])]);
        root.createEl("p",{text:`${queue.project} - snapshot ${queue.day}; ${queue.records} indexed project records. Coverage is limited; expand the limits below.`,cls:"thread-meta"});
        const open=(parent:HTMLElement,source:QueueSource,label:string,heading="")=>{
          parent.createEl("button",{text:label,cls:"thread-source"}).onclick=()=>{void this.plugin.openIndexedSource(source.path,source.hash,heading,()=>!this.closed&&epoch===this.epoch)
            .catch(error=>this.status?.setText(error instanceof Error?error.message:"Source unavailable. Refresh the queue."));};
        };
        if(queue.baseline)open(root,queue.baseline,"Open recorded review baseline");
        for(const kind of queueKinds){
          const section=root.createEl("details",{cls:"thread-queue-group"}),items=queue.pending.filter(row=>row.item.kind===kind);section.open=kind==="changed-source"||kind==="decision-evidence";section.createEl("summary",{text:`${queueLabels[kind]} (${items.length} pending shown of ${queue.counts[kind]}; ${queue.candidateCounts[kind]} total candidates)`});
          if(!items.length)section.createEl("p",{text:"No items established in this snapshot.",cls:"thread-muted"});
          for(const disposition of items){
            const item=disposition.item;
            const row=section.createDiv({cls:"thread-queue-item"});open(row,item,item.path,item.heading);row.createEl("p",{text:item.text});
            for(const source of item.related)if(source.path!==item.path)open(row,source,`Current supporting note: ${source.path}`);
            if(kind==="decision-evidence"||kind==="revisit-date"||kind==="revisit-condition"){
              const action=row.createEl("button",{text:"Open decision evidence review"});action.disabled=!this.plugin.changePathAllowed(item.path);
              action.onclick=()=>this.plugin.openDecisionReview(item.path);
              if(action.disabled)row.createEl("p",{text:"This decision is outside current mapped write destinations. Open the record to review it manually; read permissions are not expanded."});
            }
            const record=row.createEl("button",{text:"Record review or follow-up"});record.disabled=!disposition.snapshot;record.onclick=()=>{if(this.closed||epoch!==this.epoch)return;const modal=new ReviewActionModal(this.plugin,disposition);this.plugin.modals.add(modal);modal.open();};
            if(!disposition.snapshot)row.createEl("p",{text:"Snapshot validation is unavailable. Review the source manually."});
            if(kind==="stale-output")row.createEl("button",{text:"Open Source freshness"}).onclick=()=>this.plugin.openFreshness(item.path);
          }
        }
        const handled=root.createEl("details");handled.createEl("summary",{text:`Handled snapshots (${queue.handled.length} shown)`});
        for(const row of queue.handled){const item=handled.createDiv();item.createEl("p",{text:`${row.disposition}: ${row.item.path} - ${queueLabels[row.item.kind]}`});if(row.event)open(item,row.event,"Open explicit review record");open(item,row.item,"Open current target",row.item.heading);if(row.item.kind==="stale-output")item.createEl("button",{text:"Open Source freshness"}).onclick=()=>this.plugin.openFreshness(row.item.path);}
        const limits=root.createEl("details");limits.createEl("summary",{text:"Coverage and review limits"});for(const limit of queue.limits)limits.createEl("p",{text:limit,cls:"thread-meta"});
        this.status?.setText("Review snapshot ready. Follow up in the source or an explicit review workflow; nothing has changed automatically.");
      }catch(error){if(!this.closed&&epoch===this.epoch&&!controller.signal.aborted)this.status?.setText(error instanceof Error?error.message:"Could not load review queue. Refresh or check scope.");}
      finally{if(this.controller===controller)this.controller=null;refresh.disabled=false;}
    };
    refresh.onclick=()=>{void load();};void load();
  }
}
