import {Setting} from 'obsidian';
import {ThreadModal} from './thread-modal.ts';
import {buildProjectExport,exportInventory,type ExportPreview,type ExportPort} from '../portability/export.ts';
import {exportDestination,writeProjectExport} from '../portability/write.ts';
import {packagePath} from '../portability/format.ts';
import {permittedProjects} from '../vault/project-home.ts';
import {localDay,noteName} from '../vault/workspace.ts';
import type {ThreadSettings} from '../settings/settings.ts';

export class ExportModal extends ThreadModal {
 preview:ExportPreview|null=null;
 applying=false;
 inputs=0;
 override invalidate(message?:string):void{if(this.applying)return;this.preview=null;super.invalidate(message);}
 onOpen():void{
  const el=this.contentEl;el.createEl('h2',{text:'Export project checkpoint'});el.createEl('p',{text:'Select current permitted notes and optional already-consented PDF originals. This local uncompressed package preserves exact bytes and IDs. It is a selected checkpoint, not a whole-vault backup or permanent journal. No AI runs.'});
  let project=this.plugin.settings.selectedProject,folder='Thread Exports',name=`Thread ${localDay()} ${crypto.randomUUID().slice(0,8)}`;const chosen=new Set<string>();
  const change=()=>{this.inputs++;this.invalidate('Selection or destination changed. Build a new exact export preview.');};
  const projects=el.createEl('select',{attr:{'aria-label':'Export project'}});projects.add(new Option('Choose permitted project',''));const list=el.createDiv({cls:'thread-package-inventory'}),settingsSnapshot=()=>({...structuredClone(this.plugin.settings),selectedProject:project});
  new Setting(el).setName('New package folder (no read grant added)').addText(t=>{t.inputEl.setAttribute('aria-label','Export package folder');t.setValue(folder).onChange(v=>{folder=v;change();});});
  new Setting(el).setName('New package name').addText(t=>{t.inputEl.setAttribute('aria-label','Export package name');t.setValue(name).onChange(v=>{name=v;change();});});
  const refresh=el.createEl('button',{text:'Refresh export inventory'}),prepare=el.createEl('button',{text:'Preview selected checkpoint',cls:'mod-cta'}),cancel=el.createEl('button',{text:'Cancel export preview'});prepare.disabled=true;
  this.status=el.createEl('p',{attr:{role:'status','aria-live':'polite'}});this.resultEl=el.createDiv();
  cancel.onclick=()=>change();
  const load=async()=>{change();prepare.disabled=true;chosen.clear();list.empty();const inputs=this.inputs;
   try{await this.plugin.rebuildIndex();if(this.closed||inputs!==this.inputs)return;projects.replaceChildren(new Option('Choose permitted project',''));for(const path of permittedProjects(this.plugin.index,this.plugin.settings))projects.add(new Option(path,path));if(![...projects.options].some(o=>o.value===project))project='';projects.value=project;if(!project)throw Error('Choose a permitted project, then refresh the inventory.');const inventory=exportInventory(this.plugin.index,settingsSnapshot());
    list.createEl('p',{text:`${inventory.candidates.length} current candidates shown; ${inventory.unavailable} unavailable/unsupported records omitted; ${inventory.candidateLimit} additional candidates outside the100-file display budget. Private provenance is checked again during preview; unsupported or stale copied evidence is omitted entirely.`});
    for(const candidate of inventory.candidates){const row=new Setting(list).setName(candidate.path).setDesc(candidate.kind==='pdf'?'Optional supporting PDF. Exact ongoing consent is already granted; select explicitly to copy it.':'Permitted current project text; exact contents are included only if its private provenance is also current.');const checkbox=row.controlEl.createEl('input',{type:'checkbox',attr:{'aria-label':`Export file ${candidate.path}`}});checkbox.checked=candidate.kind==='text';if(checkbox.checked)chosen.add(candidate.path);checkbox.onchange=()=>{if(checkbox.checked)chosen.add(candidate.path);else chosen.delete(candidate.path);change();};}prepare.disabled=false;this.status?.setText('Choose files and inspect a new preview before saving. PDFs are not selected by default.');
   }catch(error){if(!this.closed)this.status?.setText(error instanceof Error?error.message:'Could not load export inventory.');}
  };
  projects.onchange=()=>{project=projects.value;void load();};refresh.onclick=()=>{void load();};
  prepare.onclick=async()=>{
   if(this.controller||prepare.disabled||this.applying)return;change();const inputs=this.inputs,settings=settingsSnapshot(),actualSettings=JSON.stringify(this.plugin.settings),selected=[...chosen],controller=new AbortController();this.controller=controller;prepare.disabled=true;
   const current=()=>!this.closed&&inputs===this.inputs&&!controller.signal.aborted&&actualSettings===JSON.stringify(this.plugin.settings)&&this.plugin.active;
   try{const path=exportDestination(`${packagePath(folder)}/${noteName(name)}.thread-project.json`,settings.excludedPaths),port=this.port(current);const projectId=this.plugin.projectIdentity(project),preview=await buildProjectExport(this.plugin.index,settings,projectId,selected,port,controller.signal);if(!current())return;if(!await this.plugin.snapshotCurrent(preview.hashes,this.plugin.settings)||!current())throw Error('Supporting snapshots changed. Build a new preview.');this.preview=preview;this.watchPaths(Object.keys(preview.hashes));this.show(preview,path,settings,actualSettings,inputs);this.status?.setText('Exact checkpoint preview ready. Review inventory and contents; save is explicit and refuses existing destinations.');
   }catch(error){if(current())this.status?.setText(error instanceof Error?error.message:'Could not build export preview.');}
   finally{if(this.controller===controller)this.controller=null;if(!this.closed)prepare.disabled=false;}
  };void load();
 }
 private port(current:()=>boolean):ExportPort{return this.plugin.projectExportPort(current);}
 private show(preview:ExportPreview,path:string,settings:ThreadSettings,actualSettings:string,inputs:number):void{
  const root=this.resultEl!;root.empty();root.createEl('h3',{text:'Exact checkpoint inventory'});root.createEl('p',{text:`Destination: ${path}. ${preview.package.manifest.entries.length} files, ${preview.package.manifest.entries.reduce((n,e)=>n+e.bytes,0)} source bytes; uncompressed version1 JSON with SHA-256 and base64 payloads.`});root.createEl('p',{text:`Omissions: ${preview.package.manifest.omissions.unavailable} unavailable/unsupported; ${preview.package.manifest.omissions.unselected} unselected; ${preview.package.manifest.omissions.candidateLimit} outside candidate budget. Manifest link/provenance metadata does not enumerate excluded targets. Selected note bytes can contain their own links. No settings, caches, journals or models are included.`});
  root.createEl('p',{text:'Portability: files and IDs remain byte-exact. The manifest maps original paths; importing under a new folder can leave fully qualified links and PDF original paths needing manual review or explicit new extraction. No provenance is silently freshened.'});
  for(const [i,entry]of preview.package.manifest.entries.entries()){const details=root.createEl('details');details.createEl('summary',{text:`${entry.path} - ${entry.kind}, ${entry.bytes} bytes`});details.createEl('pre',{text:JSON.stringify(entry,null,2),cls:'thread-preview'});if(entry.kind!=='pdf')details.createEl('pre',{text:new TextDecoder().decode(Uint8Array.from(atob(preview.package.payloads[i]!),c=>c.charCodeAt(0))),cls:'thread-preview'});else details.createEl('p',{text:'Binary PDF copy. Inspect the explicitly consented original in Obsidian; the manifest records its exact full byte hash.'});}
  const exact=root.createEl('details');exact.createEl('summary',{text:'Full exact package JSON (includes selected contents)'});exact.createEl('pre',{text:preview.text,cls:'thread-preview'});
  const save=root.createEl('button',{text:'Save previewed checkpoint',cls:'mod-cta'});save.onclick=async()=>{
   if(save.disabled||this.preview!==preview||this.applying)return;this.applying=true;save.disabled=true;const current=()=>!this.closed&&this.plugin.active&&this.preview===preview&&inputs===this.inputs&&actualSettings===JSON.stringify(this.plugin.settings);
   try{let revision=-1;
    await writeProjectExport(path,preview.text,{check:p=>this.plugin.checkProjectPackageDestination(p),exists:p=>Boolean(this.app.vault.getAbstractFileByPath(p)),prepare:p=>this.plugin.ensureFolder(p),current:()=>current()&&(revision<0||revision===this.plugin.index.revision),validate:async()=>{
     if(!current())throw Error('Export preview changed.');await this.plugin.rebuildIndex();const now=await buildProjectExport(this.plugin.index,settings,this.plugin.projectIdentity(settings.selectedProject),preview.package.manifest.entries.map(e=>e.path),this.port(current),new AbortController().signal);
     if(JSON.stringify(now.package.manifest.entries)!==JSON.stringify(preview.package.manifest.entries)||!await this.plugin.snapshotCurrent(preview.hashes,this.plugin.settings)||!current())throw Error('Export snapshots changed. Refresh and preview again.');revision=this.plugin.index.revision;
    },create:async(p,text)=>{await this.app.vault.create(p,text);}});if(!this.closed)this.status?.setText(`Saved local checkpoint ${path}. Source notes and read grants are unchanged.`);
   }catch(error){if(!this.closed)this.status?.setText((error instanceof Error?error.message:'Could not save checkpoint.')+' Sources were preserved. Inspect the destination before retrying with a new name; a folder or uncertain package file may remain.');}
   finally{this.applying=false;}
  };
 }
}
