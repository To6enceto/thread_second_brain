import{Setting}from'obsidian';
import{ThreadModal}from'./thread-modal.ts';
import{NewNoteModal}from'./new-note-modal.ts';
import{mayRead}from'../vault/scope.ts';
import{mayReadPdf,pdfPath}from'../pdf/scope.ts';
import{extractPdf}from'../pdf/parser.ts';
import{pdfSource,PDF_LIMITS,type PdfExtraction}from'../pdf/record.ts';
import{noteName,localDay}from'../vault/workspace.ts';
import type{ThreadSettings}from'../settings/settings.ts';
import type{DropdownComponent}from'obsidian';
export class PdfModal extends ThreadModal{
 private inputs=0;
 private refreshControls:()=>void=()=>{};
 override invalidate(message?:string):void{super.invalidate(message);this.refreshControls();}
 onOpen():void{
  const root=this.contentEl;root.createEl('h2',{text:'Local PDF extraction'});root.createEl('p',{text:'Add a local PDF to your Obsidian vault first. Select an existing PDF inside current allowed paths, then grant binary reads for that exact file. Text grants alone do not permit PDF reads. No original is changed or copied, no model runs, and no remote resource or document script is loaded.'});
  let selected='',name=`PDF source ${localDay()}`,select:DropdownComponent,available:string[]=[];
  const edited=(message:string)=>{this.inputs++;this.invalidate(message);};
  new Setting(root.createDiv({cls:'thread-pdf-picker'})).setName('Existing local vault PDF').addDropdown(d=>{select=d;d.selectEl.setAttribute('aria-label','Existing local vault PDF');d.addOption('','Choose PDF').onChange(value=>{selected=value;edited('PDF selection changed. Grant this file explicitly, then extract again.');});});
  root.createEl('button',{text:'Refresh PDF list'}).onclick=()=>{if(!this.closed)edited('PDF list refreshed; inspect current selection and consent.');};
  const listing=root.createEl('p',{cls:'thread-meta'}),grant=root.createEl('button',{text:'Allow ongoing reads for selected PDF',cls:'thread-wrap-action'}),grants=root.createDiv();
  root.createEl('p',{text:'Grant allows Thread to read/hash this exact PDF now and during later use of its saved extraction. Current allowed paths and exclusions still apply. Revoke a grant below at any time; read grants are never expanded automatically.'});
  grant.onclick=async()=>{
   if(this.closed||grant.disabled)return;const path=selected;this.inputs++;
   try{pdfPath(path);if(!available.includes(path)||!mayRead(path,this.plugin.settings))throw Error('Select a currently permitted PDF first.');if(this.plugin.settings.pdfPaths.length>=100&&!this.plugin.settings.pdfPaths.includes(path))throw Error('PDF grant limit reached. Revoke an unused grant first.');await this.plugin.updateSettings({...this.plugin.settings,pdfPaths:[...new Set([...this.plugin.settings.pdfPaths,path])]});if(!this.closed)this.status?.setText(`Explicit ongoing binary consent saved for ${path}. Choose Extract to preview page text.`);}catch(error){if(!this.closed)this.status?.setText(error instanceof Error?error.message:'Could not save explicit PDF consent.');}
   this.refreshControls();
  };
  new Setting(root).setName('New source note name').addText(t=>{t.inputEl.setAttribute('aria-label','New PDF source note name');t.setValue(name).onChange(value=>{name=value;edited('Destination name changed. Extract a new preview.');});});
  root.createEl('p',{text:`Finite limits: ${PDF_LIMITS.bytes} input bytes, ${PDF_LIMITS.totalPages} document pages, first ${PDF_LIMITS.pages} pages examined, ${PDF_LIMITS.pageChars} retained characters/page, ${PDF_LIMITS.chars} total characters, ${PDF_LIMITS.timeoutMs/1000}-second worker deadline. Selectable text only; no OCR or encrypted PDFs. Layouts, fonts, off-page text and limits can omit/reorder content.`});
  const run=root.createEl('button',{text:'Extract page text',cls:'mod-cta'}),cancel=root.createEl('button',{text:'Cancel PDF extraction'});this.status=root.createEl('p',{attr:{role:'status','aria-live':'polite'}});this.resultEl=root.createDiv();
  cancel.onclick=()=>{if(!this.closed)edited('PDF extraction canceled. Original remains unchanged.');};
  this.refreshControls=()=>{
   if(this.closed)return;const settings=this.plugin.settings;available=this.app.vault.getFiles().filter(file=>/\.pdf$/i.test(file.path)&&mayRead(file.path,settings)).map(file=>file.path).sort((a,b)=>a.localeCompare(b));const shown=available.slice(0,500);if(!shown.includes(selected))selected='';select.selectEl.empty();select.addOption('','Choose PDF');for(const path of shown)select.addOption(path,path);select.setValue(selected);listing.setText(`${shown.length} of ${available.length} currently permitted PDF names shown; metadata only, no PDF bytes read. Add PDFs through Obsidian or explicitly configure their folder in Thread setup if none are listed.`);
   grant.disabled=!selected||mayReadPdf(selected,settings);grant.setText(selected?`Allow ongoing binary reads: ${selected}`:'Allow ongoing reads for selected PDF');run.disabled=!selected||!mayReadPdf(selected,settings)||!!this.controller;cancel.disabled=!this.controller;grants.empty();
   for(const[pathIndex,path]of settings.pdfPaths.entries()){
    const row=grants.createDiv();row.createEl('p',{text:mayRead(path,settings)?`PDF grant: ${path}`:`Unavailable PDF grant ${pathIndex+1} (outside current scope/exclusions).`});row.createEl('button',{text:`Revoke PDF grant ${pathIndex+1}`}).onclick=async()=>{if(this.closed||!this.plugin.settings.pdfPaths.includes(path))return;this.inputs++;try{await this.plugin.updateSettings({...this.plugin.settings,pdfPaths:this.plugin.settings.pdfPaths.filter(value=>value!==path)});if(!this.closed)this.status?.setText('PDF grant revoked. Current extraction previews are unavailable.');}catch{if(!this.closed)this.status?.setText('Could not persist the PDF grant change. Check plugin write access and save settings before reopening.');}this.refreshControls();};
   }
   this.watchPaths(selected?[selected]:[]);
  };
  const ready=async(path:string,hash:string,settings:ThreadSettings,inputs:number,signal:AbortSignal)=>{
   if(this.closed||!this.plugin.active||this.inputs!==inputs||JSON.stringify(settings)!==JSON.stringify(this.plugin.settings))return false;const snapshot=await this.plugin.readPdf(path,settings,signal);return snapshot.hash===hash&&!this.closed&&this.inputs===inputs&&JSON.stringify(settings)===JSON.stringify(this.plugin.settings);
  };
  run.onclick=async()=>{
   if(this.closed||run.disabled)return;this.invalidate();const path=selected,settings=structuredClone(this.plugin.settings),inputs=this.inputs,epoch=this.epoch,controller=new AbortController();this.controller=controller;this.refreshControls();this.status?.setText('Reading explicitly consented PDF and starting local worker...');
   try{
    const snapshot=await this.plugin.readPdf(path,settings,controller.signal),extraction=await extractPdf(snapshot.bytes,asset=>this.plugin.readPdfAsset(asset),controller.signal,(page,total)=>{if(!this.closed&&epoch===this.epoch)this.status?.setText(`Extracting page ${page} of ${total} locally...`);});
    if(!await ready(path,snapshot.hash,settings,inputs,controller.signal)||epoch!==this.epoch)throw Error('PDF or inputs changed. Extract again.');this.showExtraction(extraction);
    const preview=this.resultEl!.createEl('button',{text:'Preview new PDF source note',cls:'mod-cta'});preview.onclick=async()=>{
     if(this.closed||epoch!==this.epoch)return;preview.disabled=true;
     try{if(!await ready(path,snapshot.hash,settings,inputs,new AbortController().signal))throw Error('PDF consent, original or destination changed. Extract again.');if(!settings.roles.sources)throw Error('Map a Sources folder in Thread setup before saving.');const content=await pdfSource(extraction,path,snapshot.hash),note={path:`${settings.roles.sources}/${noteName(name)}.md`,content};if(this.closed||epoch!==this.epoch||this.inputs!==inputs)throw Error('PDF preview changed. Extract again.');const modal=new NewNoteModal(this.plugin,note,()=>ready(path,snapshot.hash,settings,inputs,new AbortController().signal));this.plugin.modals.add(modal);modal.open();}catch(error){if(!this.closed)this.status?.setText(error instanceof Error?error.message:'Could not prepare exact PDF source preview.');}finally{if(!this.closed&&epoch===this.epoch)preview.disabled=false;}
    };
    this.status?.setText('Page text ready. Inspect coverage and exact new-note preview before saving. Reuse checks the approved original PDF and opens citations at their recorded page. Changed originals require explicit extraction to a new source note.');
   }catch(error){if(!this.closed&&epoch===this.epoch&&!controller.signal.aborted)this.status?.setText(error instanceof Error?error.message:'PDF extraction unavailable. Original is unchanged.');}
   finally{if(this.controller===controller){this.controller=null;this.refreshControls();}}
  };
  this.refreshControls();this.status.setText('Select a PDF and grant exact-file binary consent before extracting.');
 }
 private showExtraction(extraction:PdfExtraction):void{
  const root=this.resultEl!;root.empty();root.createEl('h3',{text:'Extracted page text preview'});root.createEl('p',{text:`${extraction.pages.length} of ${extraction.totalPages} pages examined; ${extraction.pages.reduce((sum,p)=>sum+p.text.length,0)} retained characters; ${extraction.pages.filter(p=>p.shortened).length} shortened pages and ${extraction.pages.filter(p=>!p.text.trim()).length} empty examined pages. Omitted content is unknown. Text order is an extraction limitation, not an AI interpretation.`});for(const page of extraction.pages){const row=root.createEl('details');row.createEl('summary',{text:`PDF page ${page.page}${page.shortened?' (shortened)':''}`});row.createEl('pre',{text:page.text||'No selectable text on this examined page.',cls:'thread-preview'});}
 }
}
