import { Modal, Setting } from "obsidian";
import type ThreadPlugin from "../main.ts";
import { starterNotes, type NewNote } from "../vault/workspace.ts";

export class WorkspaceModal extends Modal {
  plugin: ThreadPlugin;
  notes: NewNote[] = [];
  creating = false;
  constructor(plugin: ThreadPlugin) { super(plugin.app); this.plugin = plugin; }
  onOpen(): void {
    const el = this.contentEl; el.addClass("thread-modal"); el.createEl("h2", { text: "Create a project workspace" });
    el.createEl("p", { text: "Map your folders in Thread Settings first. Existing templates are kept. Preview every new note before creating it." });
    let name = ""; let previewName = "";
    let nameInput: HTMLInputElement;
    new Setting(el).setName("Project name").addText(t => {
      nameInput=t.inputEl;t.inputEl.setAttribute("aria-label","Project name");
      t.setPlaceholder("My project").onChange(v=>{if(!this.creating){name=v;this.notes=[];apply.disabled=true;}});
    });
    const preview=el.createDiv(); const status=el.createEl("p", {attr:{role:"status","aria-live":"polite"}});
    const show=el.createEl("button",{text:"Preview starter notes"});
    const apply=el.createEl("button",{text:"Create previewed notes",cls:"mod-cta"});apply.disabled=true;
    show.onclick=()=>{
      if(this.creating)return;
      try {
        const all=starterNotes(this.plugin.settings.roles,name,this.plugin.settings.excludedPaths);
        this.notes=all.filter((n,i)=> i<2 || !this.app.vault.getAbstractFileByPath(n.path));
        previewName=name;preview.empty();
        for(const note of this.notes){preview.createEl("h3",{text:note.path});preview.createEl("pre",{text:note.content,cls:"thread-preview"});}
        status.setText("Review these exact new contents. Existing paths are never overwritten.");apply.disabled=false;
      } catch(e){status.setText(e instanceof Error?e.message:"Preview failed.");apply.disabled=true;}
    };
    apply.onclick=async()=>{
      if(this.creating)return;
      const approved=this.notes.map(n=>({...n}));
      const selectedProject=approved[0]?.path.slice(0,-"/Overview.md".length);
      apply.disabled=true;show.disabled=true;nameInput.disabled=true;this.creating=true;
      try{
        if(name!==previewName || !approved.length || !selectedProject)throw new Error("Preview the project first.");
        await this.plugin.createNotes(approved);
        await this.plugin.updateSettings({...this.plugin.settings,selectedProject,allowedPaths:[...new Set([...this.plugin.settings.allowedPaths,selectedProject])]});
        status.setText(`Created ${approved.length} notes. Project selected; open Thread to resume.`);this.notes=[];
      }catch(e){status.setText(e instanceof Error?e.message:"Creation failed.");}
      finally{this.creating=false;show.disabled=false;nameInput.disabled=false;}
    };
  }
  onClose(): void { this.plugin.modals.delete(this); this.contentEl.empty(); }
}
