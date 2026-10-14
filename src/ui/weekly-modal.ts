import { Setting } from "obsidian";
import { ThreadModal } from "./thread-modal.ts";
import { NewNoteModal } from "./new-note-modal.ts";
import { OllamaClient } from "../intelligence/ollama.ts";
import { WEEKLY_SCHEMA,reviewPeriod,weeklyEvidence,weeklyPrompt,validateWeekly,weeklyMarkdown } from "../vault/weekly.ts";
import { localDay,noteName } from "../vault/workspace.ts";

export class WeeklyModal extends ThreadModal {
  generateButton:HTMLButtonElement|null=null;
  previewButton:HTMLButtonElement|null=null;
  override invalidate(message?:string):void{super.invalidate(message);if(this.previewButton)this.previewButton.disabled=true;if(this.generateButton)this.generateButton.disabled=false;}
  onOpen():void{
    const el=this.contentEl;el.createEl("h2",{text:"Weekly project review"});el.createEl("p",{text:"Review seven local calendar days on demand. Choose a project or explicitly widen to all allowed notes. Source modification/capture dates do not establish event dates. Nothing saves or changes status automatically."});
    let end=localDay();let name=`Week ending ${end}`;let scope:"project"|"allowed"="project";
    const changed=()=>this.invalidate("Inputs changed. Generate a new weekly review.");
    new Setting(el).setName("Review scope").addDropdown(d=>{d.selectEl.setAttribute("aria-label","Weekly review scope");d.addOption("project","Selected project").addOption("allowed","All allowed notes — explicit wider scope").onChange(v=>{scope=v==="allowed"?"allowed":"project";changed();});});
    new Setting(el).setName("Seven days ending on").addText(t=>{t.inputEl.type="date";t.inputEl.setAttribute("aria-label","Review end date");t.inputEl.max=localDay();t.setValue(end).onChange(v=>{end=v;changed();});});
    new Setting(el).setName("Review note name").addText(t=>{t.inputEl.setAttribute("aria-label","Weekly review note name");t.setValue(name).onChange(v=>{name=v;changed();});});
    this.generateButton=el.createEl("button",{text:"Generate weekly review",cls:"mod-cta"});el.createEl("button",{text:"Cancel weekly review"}).onclick=()=>this.invalidate("Weekly review canceled.");
    this.status=el.createEl("p",{attr:{role:"status","aria-live":"polite"}});this.resultEl=el.createDiv();this.previewButton=el.createEl("button",{text:"Preview weekly review note",cls:"mod-cta"});this.previewButton.disabled=true;
    this.generateButton.onclick=async()=>{
      if(this.controller)return;this.invalidate();const controller=new AbortController();this.controller=controller;const epoch=this.epoch;const settings=structuredClone(this.plugin.settings);const approved={end,name,scope};this.generateButton!.disabled=true;
      const current=()=>!this.closed&&epoch===this.epoch&&!controller.signal.aborted&&JSON.stringify(settings)===JSON.stringify(this.plugin.settings);
      try{
        const period=reviewPeriod(approved.end);const filename=noteName(approved.name);
        if(approved.scope==="project"&&!settings.selectedProject)throw new Error("Select an allowed project or explicitly choose All allowed notes.");
        if(!this.plugin.index.ready)await this.plugin.rebuildIndex();if(!current())return;
        const project=approved.scope==="project"?this.plugin.projectIdentity(settings.selectedProject):"";
        const entries=this.plugin.index.projectEntries(settings,approved.scope==="project"?settings.selectedProject:null).sort((a,b)=>b.modifiedAt-a.modifiedAt||a.path.localeCompare(b.path));
        if(!entries.length)throw new Error("No eligible notes in this scope. Check read paths and exclusions.");
        this.status?.setText(`Reading eligible records for ${period.start} to ${period.end}...`);
        const bundle=weeklyEvidence(await this.plugin.evidenceFromPaths(entries.slice(0,80).map(e=>e.path),settings,controller.signal),period);
        if(!bundle.sources.length)throw new Error("No usable records dated on or before the selected end date. Try another period or scope.");
        if(!current()||!await this.plugin.evidenceCurrent(bundle,settings))throw new Error("Records changed. Generate again.");
        const raw=await new OllamaClient(settings.endpoint,settings.timeoutMs).generate(settings.model,weeklyPrompt(bundle,period),controller.signal,WEEKLY_SCHEMA);
        const result=validateWeekly(raw,bundle,period);if(entries.length>80)result.gaps.push("Only the 80 most recently modified eligible notes were considered.");
        if(!current()||!await this.plugin.evidenceCurrent(bundle,settings))throw new Error("Records changed. Generate again.");if(!current())return;
        const content=weeklyMarkdown(result,bundle,period,settings.model,project);this.resultEl!.createEl("pre",{text:content,cls:"thread-preview"});
        for(const s of bundle.sources){const row=this.resultEl!.createDiv();row.createEl("button",{text:`${s.id}: ${s.path} › ${s.heading}`}).onclick=()=>{void this.plugin.openIndexedSource(s.path,bundle.noteHashes[s.path]!,s.heading,current).catch(e=>this.status?.setText(String(e)));};row.createEl("p",{text:`Record date: ${s.recordedDate} (${s.dateBasis}); source date: ${s.changedOn??"unknown"} (${s.changeBasis??"unknown"}).`});}
        this.previewButton!.disabled=false;this.previewButton!.onclick=()=>{
          try{
            if(!current())return;if(!settings.roles.reviews)throw new Error("Map a Reviews folder in Settings before saving.");
            const preview=new NewNoteModal(this.plugin,{path:`${settings.roles.reviews}/${filename}.md`,content},()=>this.plugin.evidenceCurrent(bundle,settings));this.plugin.modals.add(preview);preview.open();
          }catch(e){this.status?.setText(e instanceof Error?e.message:"Could not preview review.");}
        };
        this.status?.setText(`Review for ${period.start} to ${period.end} ready. Inspect dates, resolution evidence and gaps, then explicitly preview/save if useful.`);
      }catch(e){if(current())this.status?.setText(e instanceof Error?e.message:"Weekly review failed.");}
      finally{if(this.controller===controller)this.controller=null;if(!this.closed&&epoch===this.epoch)this.generateButton!.disabled=false;}
    };
  }
}
