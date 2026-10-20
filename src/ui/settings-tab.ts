import { App, Modal, PluginSettingTab, Setting, TFolder, type DropdownComponent, type TextComponent } from "obsidian";
import type ThreadPlugin from "../main.ts";
import { localEndpoint, roleNames, type FolderRoles } from "../settings/settings.ts";
import { pendingScope, scopePreviewText, sampleNote } from "../settings/setup.ts";
import { NewNoteModal } from "./new-note-modal.ts";
import { OllamaClient } from "../intelligence/ollama.ts";
import { vaultPath } from "../vault/scope.ts";

interface ConnectionState { controller: AbortController | null; }

function renderSettings(app: App, plugin: ThreadPlugin, containerEl: HTMLElement, connection: ConnectionState): void {
  containerEl.empty();containerEl.addClass("thread-settings");
  containerEl.createEl("h2",{text:"Set up Thread locally"});
  containerEl.createEl("p",{text:"Thread runs with free local Ollama and downloaded models. It does not install services, download models or enable cloud fallback. Recorded project facts and keyword search work without AI."});
  const feedback=containerEl.createEl("p",{cls:"thread-status",attr:{role:"status","aria-live":"polite"}});
  let endpoint=plugin.settings.endpoint,model=plugin.settings.model,embeddingModel=plugin.settings.embeddingModel,semanticSearch=plugin.settings.semanticSearch;
  let project=plugin.settings.selectedProject,exclusions=plugin.settings.excludedPaths.join("\n"),allowed=plugin.settings.allowedPaths.join("\n"),timeout=String(plugin.settings.timeoutMs/1000);
  const roles:FolderRoles={...plugin.settings.roles};
  let textInput:TextComponent,embeddingInput:TextComponent,textChoices:DropdownComponent,embeddingChoices:DropdownComponent;
  let scopeEl:HTMLElement|null=null;
  const cancelChecks=()=>{connection.controller?.abort();connection.controller=null;feedback.setText("Draft changed. Save explicitly to use these settings.");};
  const updateScope=()=>{if(!scopeEl)return;try{scopeEl.setText(scopePreviewText(pendingScope(project,allowed,exclusions,plugin.settings)));}catch(e){scopeEl.setText(e instanceof Error?e.message:"Invalid scope draft.");}};
  containerEl.createEl("h3",{text:"1. Connect to local Ollama"});
  containerEl.createEl("p",{text:"Install Ollama yourself if needed. Start it with OLLAMA_NO_CLOUD=1 and download a free model separately, for example qwen3:4b-instruct. Thread checks cloud status before use."});
  new Setting(containerEl).setName("Local Ollama endpoint").setDesc("HTTP loopback only. Default: http://127.0.0.1:11434.")
    .addText(text=>{text.inputEl.setAttribute("aria-label","Local Ollama endpoint");text.setValue(endpoint).onChange(value=>{
      endpoint=value;cancelChecks();for(const choices of [textChoices,embeddingChoices]){choices.selectEl.empty();choices.addOption("","Discover models again").setDisabled(true);}
    });});
  const discover=containerEl.createEl("button",{text:"Find downloaded models"});
  discover.onclick=async()=>{
    cancelChecks();const controller=new AbortController();connection.controller=controller;const requestedEndpoint=endpoint;
    discover.disabled=true;feedback.setText("Checking cloud-disabled local model metadata...");
    const current=()=>!controller.signal.aborted&&connection.controller===controller&&containerEl.isConnected&&endpoint===requestedEndpoint;
    try{
      const result=await new OllamaClient(requestedEndpoint,15000).downloadedModels(controller.signal);
      if(!current())return;
      for(const choices of [textChoices,embeddingChoices]){choices.selectEl.empty();choices.addOption("","Choose a downloaded model").setDisabled(false);}
      for(const entry of result.models){if(entry.completion)textChoices.addOption(entry.name,entry.name);if(entry.embedding)embeddingChoices.addOption(entry.name,entry.name);}
      feedback.setText(`${result.models.length} compatible local models from ${result.total} listed; ${result.omitted} remote, incompatible, uninspectable or beyond the 40-model limit omitted. Nothing selected or saved automatically. Capability checks do not measure answer quality. If none appear, download a local text model yourself and retry.`);
    }catch(e){if(current())feedback.setText(e instanceof Error?e.message:"Model discovery failed. Check local Ollama.");}
    finally{discover.disabled=false;}
  };
  containerEl.createEl("h3",{text:"2. Choose downloaded models"});
  new Setting(containerEl).setName("Downloaded model").setDesc("Exact text model name. Discovery checks capability, not answer quality. Tested: qwen3:4b-instruct.")
    .addText(text=>{textInput=text;text.inputEl.setAttribute("aria-label","Downloaded model");text.setValue(model).onChange(value=>{model=value;cancelChecks();});});
  new Setting(containerEl).setName("Available text models").addDropdown(choices=>{
    textChoices=choices;choices.selectEl.setAttribute("aria-label","Available text models");choices.addOption("","Discover models first").setDisabled(true).onChange(value=>{if(value){model=value;textInput.setValue(value);cancelChecks();}});
  });
  const semantic=containerEl.createEl("details");semantic.createEl("summary",{text:"Optional local semantic search"});
  new Setting(semantic).setName("Optional semantic search").setDesc("Off by default. Enables Hybrid as an explicit search choice; no background inference or downloads.")
    .addToggle(toggle=>{toggle.toggleEl.setAttribute("aria-label","Optional semantic search");toggle.setValue(semanticSearch).onChange(value=>{semanticSearch=value;cancelChecks();});});
  new Setting(semantic).setName("Downloaded embedding model").setDesc("Separate from the text model; e.g. qwen3-embedding:0.6b. Vectors stay in bounded memory.")
    .addText(text=>{embeddingInput=text;text.inputEl.setAttribute("aria-label","Downloaded embedding model");text.setValue(embeddingModel).onChange(value=>{embeddingModel=value;cancelChecks();});});
  new Setting(semantic).setName("Available embedding models").addDropdown(choices=>{
    embeddingChoices=choices;choices.selectEl.setAttribute("aria-label","Available embedding models");choices.addOption("","Discover models first").setDisabled(true).onChange(value=>{if(value){embeddingModel=value;embeddingInput.setValue(value);cancelChecks();}});
  });
  containerEl.createEl("h3",{text:"3. Preview read access and save"});
  new Setting(containerEl).setName("Project folder").setDesc("Saving explicitly adds this folder to allowed read paths. Choosing it alone grants nothing.")
    .addDropdown(dropdown=>{
      dropdown.addOption("","Choose a folder");dropdown.selectEl.setAttribute("aria-label","Project folder");
      const folders=app.vault.getAllLoadedFiles().filter((file):file is TFolder=>file instanceof TFolder&&file.path!=="/").map(folder=>folder.path)
        .filter(path=>{try{return vaultPath(path)===path;}catch{return false;}}).sort();
      for(const folder of folders)dropdown.addOption(folder,folder);
      dropdown.setValue(project).onChange(value=>{project=value;cancelChecks();updateScope();});
    });
  new Setting(containerEl).setName("Allowed read paths").setDesc("One vault-relative folder or note per line. An empty scope reads no notes.")
    .addTextArea(text=>{text.inputEl.setAttribute("aria-label","Allowed read paths");text.setValue(allowed).onChange(value=>{allowed=value;cancelChecks();updateScope();});});
  new Setting(containerEl).setName("Excluded paths").setDesc("One vault-relative folder or note per line. Exclusions take precedence before every read.")
    .addTextArea(text=>{text.inputEl.setAttribute("aria-label","Excluded paths");text.setValue(exclusions).onChange(value=>{exclusions=value;cancelChecks();updateScope();});});
  scopeEl=containerEl.createEl("p",{cls:"thread-scope-preview",attr:{role:"status","aria-live":"polite","aria-label":"Read access preview"}});updateScope();
  new Setting(containerEl).addButton(button=>button.setButtonText("Save settings").setCta().onClick(async()=>{
    try{
      cancelChecks();const timeoutMs=Number(timeout)*1000;
      if(!Number.isInteger(timeoutMs)||timeoutMs<1000||timeoutMs>600000)throw new Error("Use a timeout from 1 to 600 seconds.");
      const scope=pendingScope(project,allowed,exclusions,plugin.settings);
      await plugin.updateSettings({...plugin.settings,endpoint:localEndpoint(endpoint),model:model.trim(),semanticSearch,embeddingModel:embeddingModel.trim(),
        selectedProject:scope.selectedProject,allowedPaths:scope.allowedPaths,excludedPaths:scope.excludedPaths,timeoutMs,
        roles:Object.fromEntries(roleNames.map(role=>[role,roles[role].trim()?vaultPath(roles[role]):""])) as FolderRoles});
      updateScope();if(containerEl.isConnected)feedback.setText("Settings saved. Open project home and choose Resume project. Diagnostics check connectivity, not answer quality.");
    }catch(e){feedback.setText(e instanceof Error?e.message:"Could not save settings.");}
  })).addButton(button=>button.setButtonText("Test local connection").onClick(async()=>{
    cancelChecks();const controller=new AbortController();connection.controller=controller;feedback.setText("Checking local connection and selected model capabilities; no note text is sent...");
    const reports:string[]=[];
    try{
      const client=new OllamaClient(endpoint,15000);
      await client.check(model.trim(),controller.signal);reports.push("Text model available; local completion capability confirmed and cloud features disabled.");
      if(semanticSearch){try{const identity=await client.embeddingIdentity(embeddingModel.trim(),controller.signal);reports.push(`Embedding model available (${identity.digest.slice(0,12)}).`);}catch(e){controller.signal.throwIfAborted();reports.push(`Embedding unavailable; Keyword remains usable. ${e instanceof Error?e.message:"Check the downloaded embedding model."}`);}}
      else reports.push("Semantic search disabled; Keyword needs no embedding model.");
      const scope=pendingScope(project,allowed,exclusions,plugin.settings);reports.push(scope.allowedPaths.length?"Draft read roots are valid; Save is required to apply changes.":"No read roots selected. Choose a project or add an allowed path and Save.");
      reports.push("This checks connection and capabilities only. Inspect sources and use the synthetic sample to assess answer quality.");
      if(!controller.signal.aborted&&connection.controller===controller&&containerEl.isConnected)feedback.setText(reports.join(" "));
    }catch(e){if(!controller.signal.aborted&&connection.controller===controller&&containerEl.isConnected)feedback.setText(e instanceof Error?e.message:"Connection failed. Check endpoint, cloud-disabled Ollama and a downloaded text model.");}
  })).addButton(button=>button.setButtonText("Cancel local checks").onClick(()=>{connection.controller?.abort();connection.controller=null;feedback.setText("Local checks canceled. Settings and notes were not changed.");}));
  containerEl.createEl("h3",{text:"4. Try Thread"});
  containerEl.createEl("p",{text:"Open project home after Save. Optionally preview one clearly synthetic sample in your saved Projects mapping. Saving a sample does not grant read access: select its folder here and review grants separately."});
  containerEl.createEl("button",{text:"Open project home"}).onclick=()=>{void plugin.openThread();};
  containerEl.createEl("button",{text:"Preview optional sample"}).onclick=()=>{
    try{
      const settings=JSON.stringify(plugin.settings),note=sampleNote(plugin.settings.roles.projects,plugin.settings.excludedPaths);
      const modal=new NewNoteModal(plugin,note,async()=>plugin.active&&JSON.stringify(plugin.settings)===settings);
      plugin.modals.add(modal);modal.open();
    }catch(e){feedback.setText(e instanceof Error?e.message:"Could not preview the synthetic sample.");}
  };
  const advanced=containerEl.createEl("details");advanced.createEl("summary",{text:"Folder mappings and advanced settings"});
  new Setting(advanced).setName("Request timeout in seconds").setDesc("A whole number from 1 to 600. Save settings explicitly after editing.")
    .addText(text=>{text.inputEl.setAttribute("aria-label","Request timeout in seconds");text.setValue(timeout).onChange(value=>{timeout=value;cancelChecks();});});
  advanced.createEl("p",{text:"Map new-note destinations, then Save above. Mapping a folder does not grant read access or move notes."});
  for(const role of roleNames)new Setting(advanced).setName(`${role[0]!.toUpperCase()}${role.slice(1)} folder`).addText(text=>{
    text.inputEl.setAttribute("aria-label",`${role} folder`);text.setValue(roles[role]).onChange(value=>{roles[role]=value;cancelChecks();});
  });
  new Setting(advanced).setName("Starter project").addButton(button=>button.setButtonText("Preview a new workspace").onClick(()=>plugin.openWorkspace()));
  new Setting(advanced).setName("Index coverage and budgets").setDesc("Inspect scoped coverage, choose a bounded profile and cancel or resume local indexing without changing notes or read grants.").addButton(button=>button.setButtonText("Inspect index coverage").onClick(()=>plugin.openIndexCoverage()));
  new Setting(advanced).setName("Derived text index").setDesc("Rebuild allowed notes. Durable notes, settings, import/rename metadata and change backups are preserved.")
    .addButton(button=>button.setButtonText("Rebuild text index").onClick(async()=>{
      button.setDisabled(true);feedback.setText("Rebuilding allowed text index...");
      try{await plugin.resetTextIndex();if(containerEl.isConnected)feedback.setText("Text index rebuilt. Notes and durable history preserved.");}
      catch(e){if(containerEl.isConnected)feedback.setText(e instanceof Error?e.message:"Could not rebuild index. Check vault write access.");}
      finally{button.setDisabled(false);}
    }));
}

export class ThreadSettingTab extends PluginSettingTab {
  threadPlugin:ThreadPlugin;
  threadConnection:ConnectionState={controller:null};
  constructor(app:App,plugin:ThreadPlugin){super(app,plugin);this.threadPlugin=plugin;}
  display():void{this.threadConnection.controller?.abort();renderSettings(this.app,this.threadPlugin,this.containerEl,this.threadConnection);}
  hide():void{this.threadConnection.controller?.abort();this.threadConnection.controller=null;}
}
export class ThreadSetupModal extends Modal {
  threadPlugin:ThreadPlugin;
  threadConnection:ConnectionState={controller:null};
  onClosed:()=>void;
  constructor(app:App,plugin:ThreadPlugin,onClosed:()=>void=()=>{}){super(app);this.threadPlugin=plugin;this.onClosed=onClosed;}
  onOpen():void{renderSettings(this.app,this.threadPlugin,this.contentEl,this.threadConnection);}
  onClose():void{this.threadConnection.controller?.abort();this.threadConnection.controller=null;this.contentEl.empty();this.onClosed();}
}
