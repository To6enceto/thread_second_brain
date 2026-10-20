import { Setting, TFile } from "obsidian";
import type ThreadPlugin from "../main.ts";
import { ThreadModal } from "./thread-modal.ts";
import { NewNoteModal } from "./new-note-modal.ts";
import { reviewSnapshot, reviewEventMarkdown, type DisposedItem, type ReviewSnapshot } from "../vault/review-events.ts";
import { questionMarkdown } from "../vault/questions.ts";
import { contentHash, readableText } from "../vault/scope.ts";
import { localDay, noteName } from "../vault/workspace.ts";
import { escapeMarkdown } from "../intelligence/answer.ts";

export class ReviewActionModal extends ThreadModal {
  row:DisposedItem;
  inputs=0;
  invalidated=false;
  prepare:HTMLButtonElement|null=null;
  constructor(plugin:ThreadPlugin,row:DisposedItem){super(plugin);this.row=row;}
  override invalidate(message?:string):void {super.invalidate(message);this.invalidated=true;if(this.prepare)this.prepare.disabled=true;}
  private async current(snapshot:ReviewSnapshot,settings:ThreadPlugin["settings"],inputs:number):Promise<boolean>{
    const allowed=()=>!this.closed&&this.plugin.active&&inputs===this.inputs&&JSON.stringify(settings)===JSON.stringify(this.plugin.settings);
    if(!allowed())return false;
    if(!this.plugin.index.ready)await this.plugin.rebuildIndex();
    const revision=this.plugin.index.revision,entries=this.plugin.index.entries;
    const now=await reviewSnapshot(this.plugin.index,settings,this.row.item,(path,hash)=>this.plugin.questionReviewReferences(path,hash));
    if(!allowed()||this.plugin.index.revision!==revision||now.key!==snapshot.key||now.digest!==snapshot.digest)return false;
    if(Object.keys(snapshot.hashes).some(path=>/\.pdf$/i.test(path)))return allowed()&&await this.plugin.snapshotCurrent(snapshot.hashes,settings)&&allowed()&&revision===this.plugin.index.revision&&entries===this.plugin.index.entries;
    for(const [path,hash]of Object.entries(snapshot.hashes)){
      if(!allowed()||!readableText(path,this.plugin.settings))return false;
      const file=this.app.vault.getAbstractFileByPath(path);if(!(file instanceof TFile))return false;
      const raw=await this.app.vault.read(file);
      if(file.path!==path||!allowed()||!readableText(path,this.plugin.settings)||await contentHash(raw)!==hash)return false;
    }
    return allowed()&&this.plugin.index.ready&&revision===this.plugin.index.revision&&entries===this.plugin.index.entries;
  }
  onOpen():void{
    const el=this.contentEl,snapshot=this.row.snapshot;el.createEl("h2",{text:"Record explicit review action"});
    el.createEl("p",{text:"This creates a separate Markdown record. The target, its status and its source freshness stay unchanged. Review every exact new-note preview before saving."});
    let action="reviewed",name=`Review ${localDay()} ${crypto.randomUUID().slice(0,6)}`,reason="",revisit="",question="";
    const reset=()=>{this.inputs++;this.controller?.abort();this.controller=null;if(this.prepare&&!this.invalidated)this.prepare.disabled=false;this.status?.setText(this.invalidated?"Sources changed. Close this action and refresh the queue.":"Inputs changed. Prepare an exact new preview.");};
    new Setting(el).setName("Review action").addDropdown(d=>{d.selectEl.setAttribute("aria-label","Review action");d.addOption("reviewed","Reviewed / no change").addOption("snoozed","Revisit on a future date").addOption("question","Draft a follow-up question").onChange(v=>{action=v;reset();});});
    new Setting(el).setName("New review or question note name").addText(t=>{t.inputEl.setAttribute("aria-label","Review note name");t.setValue(name).onChange(v=>{name=v;reset();});});
    new Setting(el).setName("Your review reason").addTextArea(t=>{t.inputEl.setAttribute("aria-label","Review reason");t.inputEl.maxLength=5000;t.onChange(v=>{reason=v;reset();});});
    new Setting(el).setName("Revisit date for snooze").addText(t=>{t.inputEl.type="date";t.inputEl.setAttribute("aria-label","Review revisit date");t.onChange(v=>{revisit=v;reset();});});
    new Setting(el).setName("Follow-up question (question action only)").addTextArea(t=>{t.inputEl.setAttribute("aria-label","Review follow-up question");t.inputEl.maxLength=1000;t.onChange(v=>{question=v;reset();});});
    this.prepare=el.createEl("button",{text:"Preview review action",cls:"mod-cta"});this.prepare.disabled=!snapshot;
    el.createEl("button",{text:"Cancel review action"}).onclick=()=>this.close();
    this.status=el.createEl("p",{text:snapshot?"Ready. No changes or inference have run.":"Snapshot validation is unavailable. Review this source manually.",attr:{role:"status","aria-live":"polite"}});
    this.resultEl=el.createDiv();this.resultEl.createEl("p",{text:`${this.row.item.path} - ${this.row.item.kind}`});this.resultEl.createEl("p",{text:this.row.item.text});
    this.watchPaths(Object.keys(snapshot?.hashes??{}));
    this.prepare.onclick=async()=>{
      if(this.prepare!.disabled||!snapshot)return;this.prepare!.disabled=true;const epoch=this.epoch,inputs=this.inputs,settings=structuredClone(this.plugin.settings),captured={action,name,reason,revisit,question};
      try{
        if(!await this.current(snapshot,settings,inputs))throw new Error("Review sources changed. Close this action and refresh the queue.");
        const project=this.plugin.projectIdentity(settings.selectedProject);let content:string,folder:string;
        if(captured.action==="question"){
          if(!captured.reason.trim()||captured.reason.length>5000)throw new Error("Enter your follow-up reason (up to 5000 characters).");
          content=questionMarkdown(captured.question,project,{sources:[],noteHashes:{},truncated:false})
            +`\n## Follow-up reason\n\n${escapeMarkdown(captured.reason.trim())}\n\n## Review origin (not supporting evidence)\n\n<!-- thread:question-evidence -->\n[${escapeMarkdown(this.row.item.path)}](<${encodeURI(this.row.item.path).replace(/#/g,"%23")}>)\nSnapshot key: ${snapshot.key}\nSnapshot digest: ${snapshot.digest}\n<!-- /thread:question-evidence -->\n`;
          folder="Questions";
        }else{
          if(captured.action!=="reviewed"&&captured.action!=="snoozed")throw new Error("Choose a valid review action.");
          content=reviewEventMarkdown(project,snapshot,this.row.item,captured.action,captured.reason,captured.revisit);folder="Reviews";
        }
        const modal=new NewNoteModal(this.plugin,{path:`${settings.selectedProject}/${folder}/${noteName(captured.name)}.md`,content},()=>this.current(snapshot,settings,inputs));this.plugin.modals.add(modal);modal.open();
        this.status?.setText("Exact new-note preview ready. Saving is explicit and refuses existing destinations.");
      }catch(error){if(!this.closed)this.status?.setText(error instanceof Error?error.message:"Could not prepare review action.");}
      finally{if(!this.closed&&epoch===this.epoch&&inputs===this.inputs)this.prepare!.disabled=false;}
    };
  }
}
