import { Setting } from "obsidian";
import { ThreadModal } from "./thread-modal.ts";
import { ANSWER_SCHEMA,answerPrompt,validateAnswer,escapeMarkdown } from "../intelligence/answer.ts";
import { OllamaClient } from "../intelligence/ollama.ts";
import { knowledgeMarkdown,synthesisBlock } from "../vault/knowledge.ts";
import { noteName } from "../vault/workspace.ts";
import { isWithin } from "../vault/scope.ts";

export class KnowledgeModal extends ThreadModal {
  generateButton:HTMLButtonElement|null=null;
  clearChoices:()=>void=()=>{};
  override invalidate(message?:string):void{super.invalidate(message);this.clearChoices();if(this.generateButton)this.generateButton.disabled=true;}
  private inputsChanged():void{
    if(this.controller){super.invalidate("Inputs changed. Generate a new proposal.");if(this.generateButton)this.generateButton.disabled=!this.plugin.index.ready;}
  }
  onOpen():void{
    const el=this.contentEl;el.createEl("h2",{text:"Knowledge updates"});
    el.createEl("p",{text:"Select up to five allowed notes. Generate a cited synthesis, then review exact changes before applying. Appending preserves existing properties and text. Knowledge destinations need explicit read access for conflict checks."});
    let title="";let focus="";let type:"concept"|"comparison"="concept";let existing="";let projectLink="";
    new Setting(el).setName("Knowledge title / new note name").addText(t=>{t.inputEl.setAttribute("aria-label","Knowledge title");t.onChange(v=>{title=v;this.inputsChanged();});});
    new Setting(el).setName("Focus (optional)").addTextArea(t=>{t.inputEl.setAttribute("aria-label","Synthesis focus");t.inputEl.maxLength=1000;t.onChange(v=>{focus=v;this.inputsChanged();});});
    new Setting(el).setName("Knowledge type").addDropdown(d=>{d.selectEl.setAttribute("aria-label","Knowledge type");d.addOption("concept","Concept").addOption("comparison","Comparison").onChange(v=>{if(v==="concept"||v==="comparison")type=v;this.inputsChanged();});});
    const targets=el.createEl("select",{attr:{"aria-label":"Knowledge destination"}});targets.add(new Option("Create a new Knowledge note",""));targets.onchange=()=>{existing=targets.value;this.inputsChanged();};
    const links=el.createEl("select",{attr:{"aria-label":"Optional project link"}});links.add(new Option("No project-note change",""));links.onchange=()=>{projectLink=links.value;this.inputsChanged();};
    const source=el.createEl("select",{attr:{"aria-label":"Synthesis source"}});source.add(new Option("Choose allowed source",""));
    const selected=new Set<string>();const selectedEl=el.createDiv();
    const showSelected=()=>{selectedEl.empty();for(const path of selected)selectedEl.createEl("button",{text:`Remove ${path}`}).onclick=()=>{selected.delete(path);this.inputsChanged();showSelected();};};
    el.createEl("button",{text:"Add source to synthesis"}).onclick=()=>{if(source.value&&selected.size<5){selected.add(source.value);this.inputsChanged();showSelected();}};
    this.status=el.createEl("p",{attr:{role:"status","aria-live":"polite"}});this.resultEl=el.createDiv();
    this.generateButton=el.createEl("button",{text:"Generate knowledge proposal",cls:"mod-cta"});this.generateButton.disabled=true;
    el.createEl("button",{text:"Cancel generation"}).onclick=()=>{super.invalidate("Generation canceled.");this.generateButton!.disabled=!this.plugin.index.ready;};
    el.createEl("button",{text:"Review changes"}).onclick=()=>this.plugin.openChanges();
    this.clearChoices=()=>{selected.clear();showSelected();source.replaceChildren(new Option("Refresh allowed sources",""));targets.replaceChildren(new Option("Refresh Knowledge destinations",""));links.replaceChildren(new Option("No project-note change",""));existing="";projectLink="";};
    const load=async()=>{
      if(this.controller)this.inputsChanged();const epoch=this.epoch;const settings=structuredClone(this.plugin.settings);this.generateButton!.disabled=true;
      try{
        if(!this.plugin.index.ready)await this.plugin.rebuildIndex();if(this.closed||epoch!==this.epoch||JSON.stringify(settings)!==JSON.stringify(this.plugin.settings))return;
        selected.clear();showSelected();source.replaceChildren(new Option("Choose allowed source",""));targets.replaceChildren(new Option("Create a new Knowledge note",""));links.replaceChildren(new Option("No project-note change",""));existing="";projectLink="";
        for(const entry of this.plugin.index.projectEntries(settings,null)){
          source.add(new Option(entry.path,entry.path));
          if(settings.roles.knowledge&&isWithin(entry.path,settings.roles.knowledge)&&entry.metadata.type!=="source"&&this.plugin.changePathAllowed(entry.path))targets.add(new Option(`Append to ${entry.path}`,entry.path));
          if(settings.selectedProject&&entry.path.slice(0,entry.path.lastIndexOf("/"))===settings.selectedProject&&(entry.metadata.type==="project"||entry.title==="Overview")&&this.plugin.changePathAllowed(entry.path))links.add(new Option(`Append a link to ${entry.path}`,entry.path));
        }
        this.generateButton!.disabled=false;this.status?.setText("Choose sources and a destination. Pending proposals are saved locally for review.");
      }catch(e){if(!this.closed)this.status?.setText(e instanceof Error?e.message:"Could not load sources.");}
    };
    el.createEl("button",{text:"Refresh synthesis sources"}).onclick=()=>{void load();};
    this.generateButton.onclick=async()=>{
      if(this.closed||this.controller)return;
      const settings=structuredClone(this.plugin.settings);const approved={title,focus,type,existing,projectLink,paths:[...selected]};
      const controller=new AbortController();this.controller=controller;const epoch=this.epoch;this.generateButton!.disabled=true;this.resultEl!.empty();
      try{
        if(this.plugin.changesWarning)throw new Error(this.plugin.changesWarning);
        if(this.plugin.changes.state.pending||this.plugin.changes.state.recovery)throw new Error("Review or reject pending changes and resolve recovery before generating another proposal.");
        if(!this.plugin.index.ready)throw new Error("Refresh synthesis sources first.");
        if(!approved.paths.length)throw new Error("Add at least one source note.");
        const name=noteName(approved.title);const project=settings.selectedProject?this.plugin.projectIdentity(settings.selectedProject):"";
        if(!settings.roles.knowledge)throw new Error("Map a Knowledge folder in Settings first.");
        const target=approved.existing||`${settings.roles.knowledge}/${name}.md`;
        if(!isWithin(target,settings.roles.knowledge)||!this.plugin.changePathAllowed(target))throw new Error("Choose a mapped Knowledge destination inside allowed read paths and outside exclusions.");
        if(!approved.existing&&this.app.vault.getAbstractFileByPath(target))throw new Error("That Knowledge note already exists. Choose Append or another name.");
        this.status?.setText("Reading selected evidence and generating a local knowledge proposal...");
        const bundle=await this.plugin.evidenceFromPaths(approved.paths,settings,controller.signal);
        if(!bundle.sources.length)throw new Error("No usable text in the selected sources.");
        const prompt=answerPrompt(`Synthesize a ${approved.type} about ${approved.title}. ${approved.focus} Separate supported facts, interpretations and suggestions; explain disagreements and gaps.`,bundle);
        const raw=await new OllamaClient(settings.endpoint,settings.timeoutMs).generate(settings.model,prompt,controller.signal,ANSWER_SCHEMA);
        const answer=validateAnswer(raw,bundle);if(!answer.supported)throw new Error(answer.gaps.join(" "));
        if(!await this.plugin.evidenceCurrent(bundle,settings))throw new Error("Selected evidence changed. Generate again.");
        if(this.closed||epoch!==this.epoch||controller.signal.aborted)return;
        const before=approved.existing?await this.plugin.readReviewedTarget(target):null;
        if(approved.existing&&before===null)throw new Error("The existing Knowledge target disappeared. Refresh destinations.");
        const after=before===null?knowledgeMarkdown(name,approved.type,answer,bundle,settings.model,project):before+synthesisBlock(name,answer,bundle,settings.model,project);
        const operations=[{path:target,before,after}];
        if(approved.projectLink){
          if(approved.projectLink===target)throw new Error("Choose a separate project note for the optional link.");
          const original=await this.plugin.readReviewedTarget(approved.projectLink);if(original===null)throw new Error("Project link target disappeared.");
          operations.push({path:approved.projectLink,before:original,after:original+`\n\nRelated knowledge: [${escapeMarkdown(name)}](<${encodeURI(target).replace(/#/g,"%23")}>)\n`});
        }
        const current=()=>!this.closed&&epoch===this.epoch&&!controller.signal.aborted&&JSON.stringify(settings)===JSON.stringify(this.plugin.settings);
        if(!current())return;
        await this.plugin.changes.propose(operations,this.plugin.changeContext(bundle,settings),current);
        if(!current())return;this.status?.setText("Knowledge proposal ready. Review every affected note before applying.");this.plugin.openChanges();
      }catch(e){if(!this.closed&&epoch===this.epoch&&!controller.signal.aborted)this.status?.setText(e instanceof Error?e.message:"Knowledge proposal failed.");}
      finally{if(this.controller===controller){this.controller=null;this.generateButton!.disabled=!this.plugin.index.ready;}}
    };
    void load();
  }
}
