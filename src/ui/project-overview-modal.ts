import { Setting, TFile, TFolder } from "obsidian";
import type ThreadPlugin from "../main.ts";
import type { ThreadSettings } from "../settings/settings.ts";
import { ThreadModal } from "./thread-modal.ts";
import { NewNoteModal } from "./new-note-modal.ts";
import { multiProjectOverview, nextActionMarkdown, overviewIdentity, projectStatuses, type ProjectCard, type ProjectIdentity, type ProjectStatus } from "../vault/project-overview.ts";
import { permittedProjects } from "../vault/project-home.ts";
import { queueKinds, queueLabels } from "../vault/review-queue.ts";
import { contentHash, readableText } from "../vault/scope.ts";
import { localDay, noteName } from "../vault/workspace.ts";

async function currentProject(plugin:ThreadPlugin,settings:ThreadSettings,path:string,identity:ProjectIdentity,current:()=>boolean):Promise<boolean> {
  const valid=()=>current()&&plugin.active&&JSON.stringify(settings)===JSON.stringify(plugin.settings)&&plugin.app.vault.getAbstractFileByPath(path) instanceof TFolder;
  if(!valid())return false;if(!plugin.index.ready)await plugin.rebuildIndex();
  const revision=plugin.index.revision,entries=plugin.index.entries;
  if(!valid()||!permittedProjects(plugin.index,settings).includes(path)||JSON.stringify(overviewIdentity(plugin.index,settings,path))!==JSON.stringify(identity))return false;
  for(const [source,hash]of Object.entries(identity.hashes)){
    if(!valid()||!readableText(source,plugin.settings))return false;const file=plugin.app.vault.getAbstractFileByPath(source);if(!(file instanceof TFile))return false;
    const raw=await plugin.app.vault.read(file);if(!valid()||file.path!==source||!readableText(source,plugin.settings)||await contentHash(raw)!==hash)return false;
  }
  return valid()&&plugin.index.ready&&plugin.index.revision===revision&&plugin.index.entries===entries&&JSON.stringify(overviewIdentity(plugin.index,settings,path))===JSON.stringify(identity);
}

export class NextActionModal extends ThreadModal {
  inputs=0;
  readonly card:ProjectCard;
  readonly settings:ThreadSettings;
  constructor(plugin:ThreadPlugin,card:ProjectCard,settings:ThreadSettings){super(plugin);this.card=card;this.settings=settings;}
  onOpen():void {
    this.contentEl.createEl("h2",{text:"Choose a next action"});this.contentEl.createEl("p",{text:`${this.card.path}: record your own choice. Saving a new selection preserves every previous choice and does not complete a task or change project/decision status.`});
    let name=`Next action ${localDay()} ${crypto.randomUUID().slice(0,6)}`,action="";
    const changed=()=>{this.inputs++;this.status?.setText("Inputs changed. Prepare a new exact preview.");};
    new Setting(this.contentEl).setName("Selection note name").addText(t=>{t.inputEl.setAttribute("aria-label","Selection note name");t.inputEl.maxLength=100;t.setValue(name).onChange(v=>{name=v;changed();});});
    new Setting(this.contentEl).setName("Your chosen next action").addTextArea(t=>{t.inputEl.setAttribute("aria-label","Your chosen next action");t.inputEl.maxLength=1000;t.onChange(v=>{action=v;changed();});});
    this.status=this.contentEl.createEl("p",{attr:{role:"status","aria-live":"polite"}});
    const preview=this.contentEl.createEl("button",{text:"Preview next-action record",cls:"mod-cta"});
    preview.onclick=async()=>{
      if(preview.disabled)return;preview.disabled=true;const inputs=this.inputs,approved={name,action};
      const valid=()=>!this.closed&&inputs===this.inputs;
      try{
        if(!this.card.identity.id||!await currentProject(this.plugin,this.settings,this.card.path,this.card.identity,valid))throw new Error("Project identity, inputs or settings changed. Refresh the overview and choose again.");
        const note={path:`${this.card.path}/Next actions/${noteName(approved.name)}.md`,content:nextActionMarkdown(this.card.identity.id,approved.action)};
        if(!this.plugin.changePathAllowed(note.path))throw new Error("This project is outside current mapped write destinations. Record your choice manually or select a writable project; read permissions stay unchanged.");
        const modal=new NewNoteModal(this.plugin,note,()=>currentProject(this.plugin,this.settings,this.card.path,this.card.identity,valid));this.plugin.modals.add(modal);modal.open();this.status?.setText("Exact new selection preview ready. Prior choices remain unchanged.");
      }catch(error){if(!this.closed)this.status?.setText(error instanceof Error?error.message:"Could not preview chosen action.");}
      finally{if(!this.closed)preview.disabled=false;}
    };
  }
}

export class ProjectOverviewModal extends ThreadModal {
  onOpen():void {
    const root=this.contentEl;root.createEl("h2",{text:"All permitted projects"});root.createEl("p",{text:"Compare recorded context without AI or priority scores. Filters do not change statuses or read grants. Due dates and conditions still need your judgment."});
    let filter:ProjectStatus|"all"="all";
    const refresh=root.createEl("button",{text:"Refresh project overview",cls:"mod-cta"});root.createEl("button",{text:"Cancel overview refresh"}).onclick=()=>this.invalidate("Overview refresh canceled.");
    new Setting(root).setName("Project status filter").addDropdown(d=>{d.selectEl.setAttribute("aria-label","Project status filter");d.addOption("all","All statuses");for(const status of projectStatuses)d.addOption(status,status);d.setValue(filter).onChange(v=>{filter=v as ProjectStatus|"all";void load();});});
    this.status=root.createEl("p",{attr:{role:"status","aria-live":"polite"}});this.resultEl=root.createDiv();
    const load=async()=>{
      this.invalidate("Loading permitted project snapshots...");const epoch=this.epoch,settings=structuredClone(this.plugin.settings),controller=new AbortController();this.controller=controller;refresh.disabled=true;
      const current=()=>!this.closed&&epoch===this.epoch&&!controller.signal.aborted&&JSON.stringify(settings)===JSON.stringify(this.plugin.settings);
      try{
        await this.plugin.rebuildIndex();if(!current())return;
        const overview=await multiProjectOverview(this.plugin.index,settings,(path,hash)=>this.plugin.questionReviewReferences(path,hash),this.plugin.changes.state.pending,filter,controller.signal);if(!current())return;
        // This aggregate depends on project discovery, identities and review dependencies throughout the permitted index.
        this.dependencies=null;const results=this.resultEl!;results.createEl("p",{text:`${overview.cards.length} of ${overview.matching} matching projects shown; ${overview.permitted} permitted projects discovered. Folder order is alphabetical.`});
        const switchProject=async(card:ProjectCard,then:()=>void|Promise<void>)=>{
          try{
            if(!await currentProject(this.plugin,settings,card.path,card.identity,current))throw new Error("Project or permissions changed. Refresh the overview.");
            await this.plugin.updateSettings({...this.plugin.settings,selectedProject:card.path});this.close();await then();
          }catch(error){if(!this.closed)this.status?.setText(error instanceof Error?error.message:"Could not switch project.");}
        };
        for(const card of overview.cards){
          const section=results.createEl("section",{cls:"thread-project-card"});section.createEl("h3",{text:card.path});section.createEl("p",{text:`Recorded status: ${card.status}; ${card.records} indexed associated records.`});
          const source=(path:string,hash:string,heading:string,label:string)=>section.createEl("button",{text:label,cls:"thread-source"}).onclick=()=>{void this.plugin.openIndexedSource(path,hash,heading,current).catch(error=>this.status?.setText(error instanceof Error?error.message:"Source changed. Refresh the overview."));};
          if(card.activity){const activity=card.activity;section.createEl("p",{text:`Latest recognized recorded date: ${activity.day} (${activity.kind}; ${activity.dateBasis}). Capture and modification dates are separate; inspect Timeline for chronology and gaps.`});if(activity.usable)source(activity.path,activity.hash,activity.heading,"Open activity record");else section.createEl("p",{text:"Its evidence is stale/unsupported; activity excerpts are hidden. Inspect Source freshness in the project."});}
          else section.createEl("p",{text:"No recorded activity date established within overview coverage. Modification time is not an event date."});
          section.createEl("p",{text:`Recorded open-question candidates: ${card.questions??"unavailable"}; unhandled due-date candidates: ${card.due??"unavailable"}; visible recorded proposals: ${card.proposal}.`});
          if(card.chosen){section.createEl("p",{text:`Chosen next action (excerpt; selected ${card.chosen.selectedAt}): ${card.chosen.excerpt}`});source(card.chosen.path,card.chosen.hash,"Chosen next action","Open chosen-action record");}else section.createEl("p",{text:"No unambiguous chosen next action established."});
          section.createEl("button",{text:`Open project: ${card.path}`}).onclick=()=>{void switchProject(card,()=>this.plugin.openThread());};
          section.createEl("button",{text:`Review queue: ${card.path}`}).onclick=()=>{void switchProject(card,()=>this.plugin.openReviewQueue());};
          if(card.proposal)section.createEl("button",{text:"Inspect recorded proposal"}).onclick=()=>{if(current())this.plugin.openChanges();};
          const choose=section.createEl("button",{text:`Choose next action: ${card.path}`});choose.disabled=!card.identity.id;choose.onclick=()=>{if(!current()||!card.identity.id)return;const modal=new NextActionModal(this.plugin,card,settings);this.plugin.modals.add(modal);modal.open();};
          const details=section.createEl("details");details.createEl("summary",{text:"Recorded review counts and coverage"});for(const kind of queueKinds)details.createEl("p",{text:`${queueLabels[kind]}: ${card.reviews[kind]??"unavailable"} unhandled candidates examined.`});for(const limit of card.limits)details.createEl("p",{text:limit,cls:"thread-meta"});
        }
        if(!overview.cards.length)results.createEl("p",{text:"No permitted projects match this filter. Choose All statuses or explicitly configure project folders/read access in Settings."});
        const limits=results.createEl("details");limits.createEl("summary",{text:"Overview coverage and sorting"});for(const limit of overview.limits)limits.createEl("p",{text:limit,cls:"thread-meta"});this.status?.setText("Project overview ready. No inference or note changes.");
      }catch(error){if(current())this.status?.setText(error instanceof Error?error.message:"Could not load project overview. Refresh or check scope.");}
      finally{if(this.controller===controller)this.controller=null;refresh.disabled=false;}
    };
    refresh.onclick=()=>{void load();};void load();
  }
}
