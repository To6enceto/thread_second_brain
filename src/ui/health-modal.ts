import { Setting, TFile, parseYaml } from "obsidian";
import type ThreadPlugin from "../main.ts";
import type { ThreadSettings } from "../settings/settings.ts";
import { ThreadModal } from "./thread-modal.ts";
import { healthHeadings, healthMetadata, inspectVaultHealth, recognizedHeadings, repairHealthDate, repairHealthHeading, type HealthIssue } from "../vault/health.ts";
import { contentHash, readableText } from "../vault/scope.ts";
import { verifyThenOpenSource } from "../vault/source-link.ts";

async function readHealthNote(plugin:ThreadPlugin,path:string,hash:string,current:()=>boolean,maxBytes=1048576):Promise<string> {
  const valid=()=>current()&&plugin.active&&readableText(path,plugin.settings);
  if(!valid())throw new Error("Note is no longer permitted. Refresh vault health.");const file=plugin.app.vault.getAbstractFileByPath(path);
  if(!(file instanceof TFile)||file.stat.size>maxBytes)throw new Error("Note is missing or exceeds the inspection budget. Inspect it manually.");
  const raw=await plugin.app.vault.read(file);if(file.path!==path||!valid()||new TextEncoder().encode(raw).length>maxBytes||await contentHash(raw)!==hash||!valid())throw new Error("Note or permissions changed. Refresh vault health.");return raw;
}

export class HealthRepairModal extends ThreadModal {
  issue:HealthIssue;
  settings:ThreadSettings;
  inputs=0;
  clear:()=>void=()=>{};
  constructor(plugin:ThreadPlugin,issue:HealthIssue,settings:ThreadSettings){super(plugin);this.issue=issue;this.settings=settings;}
  override invalidate(message?:string):void{super.invalidate(message);this.clear();}
  onOpen():void {
    const root=this.contentEl;root.createEl("h2",{text:"Prepare one compatibility repair"});root.createEl("p",{text:this.issue.path});root.createEl("p",{text:this.issue.effect});root.createEl("p",{text:"Enter the recorded date yourself or explicitly choose which existing heading has the stated meaning. This prepares one proposal. Review its exact before/after diff and apply separately; no IDs, associations or other records change automatically."});
    let before:string|null=null,value="",headingAt="";
    const changed=()=>{this.inputs++;this.status?.setText("Inputs changed. Prepare a new exact repair proposal.");};
    if(this.issue.dateKey)new Setting(root).setName(`Actual ${this.issue.dateKey} date`).addText(t=>{t.inputEl.setAttribute("aria-label","Actual recorded date");t.inputEl.type="date";t.onChange(v=>{value=v;changed();});});
    const headings=root.createEl("select",{attr:{"aria-label":"Existing heading to rename"}}),targets=root.createEl("select",{attr:{"aria-label":"Recognized replacement heading"}});headings.hidden=targets.hidden=this.issue.kind!=="heading";headings.onchange=()=>{headingAt=headings.value;changed();};targets.onchange=()=>{value=targets.value;changed();};
    const prepare=root.createEl("button",{text:"Prepare exact repair proposal",cls:"mod-cta"});prepare.disabled=true;
    this.status=root.createEl("p",{attr:{role:"status","aria-live":"polite"}});this.resultEl=root.createDiv();this.watchPaths([this.issue.path]);
    this.clear=()=>{before=null;prepare.disabled=true;headings.replaceChildren(new Option("Refresh vault health",""));targets.replaceChildren(new Option("Refresh vault health",""));};
    const epoch=this.epoch,settings=structuredClone(this.settings),current=()=>!this.closed&&epoch===this.epoch&&this.plugin.active&&JSON.stringify(settings)===JSON.stringify(this.plugin.settings);
    const load=async()=>{
      try{
        before=await readHealthNote(this.plugin,this.issue.path,this.issue.hash,current);if(!current())return;
        if(!this.plugin.changePathAllowed(this.issue.path)||!this.plugin.index.graph(settings).assess(this.issue.path).usable)throw new Error("This note is protected, unsupported or stale. Preserve it and follow the manual guidance; permissions stay unchanged.");
        const metadata=healthMetadata(before,parseYaml),entry=this.plugin.index.entries.find(e=>e.path===this.issue.path);
        if(entry?.id&&!this.plugin.index.idUnambiguous(entry.id))throw new Error("Ambiguous identities or incomplete index coverage need manual reconciliation before repair.");
        headings.replaceChildren(new Option("Choose the intended existing heading",""));for(const heading of healthHeadings(before,metadata))headings.add(new Option(heading.heading,String(heading.at)));
        targets.replaceChildren(new Option("Choose its explicit recorded meaning",""));for(const heading of recognizedHeadings(metadata))targets.add(new Option(heading,heading));
        if(!current())return;prepare.disabled=false;this.status?.setText("Ready for one explicit correction. No proposal or write has run.");
      }catch(error){if(current())this.status?.setText(error instanceof Error?error.message:"Inspection failed. Normalize the note manually.");}
    };
    prepare.onclick=async()=>{
      if(prepare.disabled||before===null)return;prepare.disabled=true;const inputs=this.inputs,approved={before,value,headingAt};const valid=()=>current()&&inputs===this.inputs;
      try{
        if(!valid()||!this.plugin.changePathAllowed(this.issue.path)||await readHealthNote(this.plugin,this.issue.path,this.issue.hash,valid)!==approved.before)throw new Error("Note, inputs or permissions changed. Refresh vault health.");
        const entry=this.plugin.index.entries.find(e=>e.path===this.issue.path);if(!entry||entry.hash!==this.issue.hash||entry.id&&!this.plugin.index.idUnambiguous(entry.id))throw new Error("Note identity changed or is ambiguous. Refresh vault health.");
        const after=this.issue.dateKey?repairHealthDate(approved.before,this.issue.dateKey,approved.value,parseYaml):approved.headingAt!==""?repairHealthHeading(approved.before,Number(approved.headingAt),approved.value,parseYaml):null;
        if(after===null)throw new Error("Choose one existing heading and its explicit replacement meaning.");
        const bundle=this.plugin.withDependencies({sources:[],truncated:false,noteHashes:{[this.issue.path]:this.issue.hash}},settings);
        if(!await this.plugin.evidenceCurrent(bundle,settings)||!valid())throw new Error("Source, inputs or scope changed. Prepare a fresh proposal.");
        await this.plugin.changes.propose([{path:this.issue.path,before:approved.before,after}],this.plugin.changeContext(bundle,settings),valid);if(valid())this.plugin.openChanges();
      }catch(error){if(!this.closed)this.status?.setText(error instanceof Error?error.message:"Could not prepare repair. Inspect the original note manually.");}
      finally{if(current()&&before!==null)prepare.disabled=false;}
    };
    void load();
  }
}

export class HealthModal extends ThreadModal {
  onOpen():void {
    const root=this.contentEl;root.createEl("h2",{text:"Vault health and compatibility"});root.createEl("p",{text:"Inspect concrete compatibility gaps in permitted indexed notes. This is an on-demand bounded diagnostic, not a health score or automatic cleanup. Unavailable reference paths and copied contents stay hidden."});
    const refresh=root.createEl("button",{text:"Scan permitted notes",cls:"mod-cta"});root.createEl("button",{text:"Cancel health scan"}).onclick=()=>this.invalidate("Health scan canceled. No notes changed.");
    root.createEl("button",{text:"Review changes and recovery"}).onclick=()=>this.plugin.openChanges();this.status=root.createEl("p",{attr:{role:"status","aria-live":"polite"}});this.resultEl=root.createDiv();
    const scan=async()=>{
      this.invalidate("Checking current permitted notes...");const epoch=this.epoch,settings=structuredClone(this.plugin.settings),controller=new AbortController();this.controller=controller;refresh.disabled=true;
      const current=()=>!this.closed&&epoch===this.epoch&&!controller.signal.aborted&&this.plugin.active&&JSON.stringify(settings)===JSON.stringify(this.plugin.settings);
      try{
        await this.plugin.rebuildIndex();if(!current())return;
        const report=await inspectVaultHealth(this.plugin.index,settings,{
          parse:parseYaml,
          read:async(entry,maxBytes)=>{if(!current()||!readableText(entry.path,this.plugin.settings))throw new Error("Permissions changed. Refresh vault health.");const file=this.app.vault.getAbstractFileByPath(entry.path);if(!(file instanceof TFile))throw new Error("A note disappeared. Refresh vault health.");if(file.stat.size>maxBytes)return null;return readHealthNote(this.plugin,entry.path,entry.hash,current,maxBytes);},
          resolve:(path,link)=>{if(!current())return null;const exact=this.app.vault.getAbstractFileByPath(link),file=exact instanceof TFile?exact:this.app.metadataCache.getFirstLinkpathDest(link,path);return file&&readableText(file.path,settings)?file.path:null;}
        },controller.signal,(done,total)=>{if(current())this.status?.setText(`Checked ${done} of at most ${total} permitted files...`);});if(!current())return;
        const results=this.resultEl!;results.createEl("p",{text:`${report.examined} of ${report.available} indexed permitted notes examined; ${report.skipped} skipped for file/remaining byte budget; ${report.bytes} UTF-8 bytes read. ${report.issues.length} diagnostics displayed.`});
        for(const [kind,count]of Object.entries(report.counts))results.createEl("p",{text:`${kind}: ${count} detected within examined notes.`});
        for(const issue of report.issues){
          const row=results.createEl("section",{cls:"thread-health-issue"});row.createEl("h3",{text:`${issue.kind}: ${issue.path}`});row.createEl("p",{text:issue.message});row.createEl("p",{text:issue.effect});row.createEl("p",{text:issue.guidance});
          row.createEl("button",{text:"Open raw note (does not validate evidence)",cls:"thread-source"}).onclick=()=>{void verifyThenOpenSource(issue.hash,()=>readHealthNote(this.plugin,issue.path,issue.hash,current),current,async()=>{const file=this.app.vault.getAbstractFileByPath(issue.path);if(!current()||!readableText(issue.path,this.plugin.settings)||!(file instanceof TFile))throw new Error("Note changed or is unavailable.");await this.app.workspace.getLeaf(false).openFile(file);}).catch(error=>this.status?.setText(error instanceof Error?error.message:"Note unavailable. Refresh health."));};
          if(issue.dateKey||issue.kind==="heading"){
            const entry=this.plugin.index.entries.find(e=>e.path===issue.path),allowed=this.plugin.changePathAllowed(issue.path)&&this.plugin.index.graph(settings).assess(issue.path).usable&&(!entry?.id||this.plugin.index.idUnambiguous(entry.id));
            const repair=row.createEl("button",{text:"Prepare individual repair"});repair.disabled=!allowed;repair.onclick=()=>{if(!current()||!allowed)return;const modal=new HealthRepairModal(this.plugin,issue,settings);this.plugin.modals.add(modal);modal.open();};
            if(!allowed)row.createEl("p",{text:"This note is protected, stale, unsupported or has an ambiguous ID. Follow the manual guidance; no write policy or read grant is changed."});
          }
        }
        if(!report.issues.length)results.createEl("p",{text:"No diagnostics established within examined coverage. This does not certify unexamined content or semantic correctness."});
        const limits=results.createEl("details");limits.createEl("summary",{text:"Diagnostic and repair limits"});for(const limit of report.limits)limits.createEl("p",{text:limit,cls:"thread-meta"});this.status?.setText("Health snapshot ready. No inference, proposals or note changes ran automatically.");
      }catch(error){if(current())this.status?.setText(error instanceof Error?error.message:"Could not inspect notes. Refresh or check read permissions.");}
      finally{if(this.controller===controller)this.controller=null;refresh.disabled=false;}
    };
    refresh.onclick=()=>{void scan();};void scan();
  }
}
