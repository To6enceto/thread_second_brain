import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import type ThreadPlugin from "../main.ts";
import { defaultSettings } from "../settings/settings.ts";

const compiled = await build({
  entryPoints: [new URL("./settings-tab.ts", import.meta.url).pathname],
  bundle: true, write: false, format: "esm", platform: "node",
  plugins: [{ name: "settings-host", setup(builder) {
    builder.onResolve({ filter: /^obsidian$/ }, () => ({ path: "host", namespace: "stub" }));
    builder.onResolve({ filter: /intelligence\/ollama\.ts$/ }, () => ({ path: "ollama", namespace: "stub" }));
    builder.onResolve({ filter: /new-note-modal\.ts$/ }, () => ({ path: "sample", namespace: "stub" }));
    builder.onLoad({ filter: /.*/, namespace: "stub" }, args => ({ contents: args.path === "ollama" ? `
      export class OllamaClient {
        constructor(endpoint){this.endpoint=endpoint;}
        downloadedModels(signal){return globalThis.__setupForm.discover(signal,this.endpoint);}
        check(model,signal){return globalThis.__setupForm.check(signal,model,this.endpoint);}
        embeddingIdentity(){return Promise.resolve({digest:'test-embedding'});}
      }
    ` : args.path === "sample" ? `
      export class NewNoteModal {constructor(plugin,note){this.note=note;}open(){globalThis.__setupForm.samples.push(this.note);}}
    ` : `
      const state=()=>globalThis.__setupForm;
      class Element {
        constructor(tag='div',options={}){this.tagName=tag;this.textContent=options.text??'';this.children=[];this.disabled=false;this.isConnected=true;this.attributes={};this.options=[];state().elements.push(this);for(const [k,v] of Object.entries(options.attr??{}))this.setAttribute(k,v);}
        createEl(tag,options={}){const el=new Element(tag,options);this.children.push(el);return el;}
        createDiv(options={}){return this.createEl('div',options);}addClass(){}empty(){this.children=[];this.textContent='';this.options=[];}
        setText(value){this.textContent=value;}setAttribute(key,value){this.attributes[key]=value;if(key==='aria-label')state().fields.set(value,this);}
      }
      export class App {}
      export class TFolder {constructor(path){this.path=path;}}
      export class Modal {constructor(app){this.app=app;this.contentEl=new Element();}open(){this.onOpen();}close(){this.onClose();this.contentEl.isConnected=false;}}
      export class PluginSettingTab {constructor(app,plugin){this.app=app;this.plugin=plugin;this.containerEl=new Element();}}
      export class Setting {
        constructor(container){this.containerEl=container.createDiv();}
        setName(){return this;}setDesc(){return this;}
        control(tag,fn){const el=this.containerEl.createEl(tag);const component={inputEl:el,selectEl:el,toggleEl:el,buttonEl:el,
          setValue(value){el.value=value;return this;},onChange(fn){el.changed=fn;return this;},setDisabled(value){el.disabled=value;return this;},
          addOption(value,label){el.options.push({value,label});return this;},setButtonText(text){el.textContent=text;return this;},
          setCta(){return this;},onClick(fn){el.onclick=fn;return this;}};fn(component);return this;}
        addText(fn){return this.control('input',fn);}addTextArea(fn){return this.control('textarea',fn);}
        addToggle(fn){return this.control('input',fn);}addDropdown(fn){return this.control('select',fn);}addButton(fn){return this.control('button',fn);}
      }
    ` }));
  } }]
});
const { ThreadSetupModal, ThreadSettingTab } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0]!.text).toString("base64")}`) as typeof import("./settings-tab.ts");

interface Element {
  textContent: string; disabled: boolean; isConnected: boolean; value?: string;
  attributes: Record<string, string>; options: Array<{ value: string; label: string }>;
  changed?: (value: string) => void; onclick?: () => Promise<void> | void;
}
function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function setup() {
  const discovery: Array<{ signal: AbortSignal; result: ReturnType<typeof deferred<unknown>> }> = [];
  const checks: Array<{ signal: AbortSignal; model: string; result: ReturnType<typeof deferred<void>> }> = [];
  const form = {
    elements: [] as Element[], fields: new Map<string, Element>(), samples: [] as unknown[],
    discover(signal: AbortSignal) { const result = deferred<unknown>(); discovery.push({ signal, result }); return result.promise; },
    check(signal: AbortSignal, model: string) { const result = deferred<void>(); checks.push({ signal, model, result }); return result.promise; }
  };
  Reflect.set(globalThis, "__setupForm", form);
  let saves = 0;
  const plugin = {
    active: true, settings: { ...defaultSettings(), roles: { ...defaultSettings().roles, projects: "Projects" } },
    app: { vault: { getAllLoadedFiles: () => [] } }, modals: new Set(),
    async updateSettings(settings: ReturnType<typeof defaultSettings>) { saves++; plugin.settings = settings; }
  };
  const modal = new ThreadSetupModal(plugin.app as never, plugin as unknown as ThreadPlugin);
  modal.open();
  const button = (label: string) => {
    const element = form.elements.find(item => item.textContent === label);
    assert.ok(element, label); return element;
  };
  const field = (label: string) => { const element = form.fields.get(label); assert.ok(element, label); return element; };
  return { form, modal, plugin, discovery, checks, button, field, saves: () => saves,
    close() { modal.close(); Reflect.deleteProperty(globalThis, "__setupForm"); } };
}

test("setup discovery feedback is adjacent, cancelable and ignores late results after a draft change", async () => {
  const ui = setup();
  try {
    const initial = JSON.stringify(ui.plugin.settings);
    const pending = ui.button("Find downloaded models").onclick!();
    assert.match(ui.field("Model discovery status").textContent, /Checking cloud-disabled/);
    assert.equal(ui.button("Find downloaded models").attributes["aria-describedby"], ui.field("Model discovery status").attributes.id);
    assert.equal(ui.button("Test local connection").disabled, true);
    await ui.button("Test local connection").onclick!(); assert.equal(ui.checks.length, 0);
    ui.field("Local Ollama endpoint").changed!("http://127.0.0.1:11435");
    assert.equal(ui.discovery[0]!.signal.aborted, true);
    assert.equal(ui.button("Test local connection").disabled, false);
    const newer = ui.button("Find downloaded models").onclick!();
    ui.discovery[0]!.result.resolve({ models: [{ name: "stale", completion: true }], total: 1, omitted: 0 });
    await pending;
    assert.equal(ui.button("Find downloaded models").disabled, true);
    assert.ok(!ui.field("Available text models").options.some(option => option.value === "stale"));
    ui.discovery[1]!.result.resolve({ models: [{ name: "local", completion: true, embedding: false }], total: 1, omitted: 0 });
    await newer;
    assert.match(ui.field("Model discovery status").textContent, /1 compatible local models/);
    assert.ok(ui.field("Available text models").options.some(option => option.value === "local"));
    assert.equal(ui.button("Find downloaded models").disabled, false);
    assert.equal(ui.field("Downloaded model").value, "");
    assert.equal(JSON.stringify(ui.plugin.settings), initial); assert.equal(ui.saves(), 0);
  } finally { ui.close(); }
});

test("setup connection feedback survives cancellation races, shows failures and success, and stops on close", async () => {
  const ui = setup();
  try {
    ui.field("Downloaded model").changed!("local");
    const pending = ui.button("Test local connection").onclick!();
    assert.match(ui.field("Local connection status").textContent, /Checking local connection/);
    assert.equal(ui.button("Test local connection").attributes["aria-describedby"], ui.field("Local connection status").attributes.id);
    assert.equal(ui.checks[0]!.model, "local");
    await ui.button("Cancel local checks").onclick!();
    assert.equal(ui.checks[0]!.signal.aborted, true);
    assert.match(ui.field("Local connection status").textContent, /canceled/);
    const second = ui.button("Test local connection").onclick!();
    ui.checks[0]!.result.resolve(); await pending;
    assert.equal(ui.button("Test local connection").disabled, true);
    ui.checks[1]!.result.reject(Error("Selected model is missing. Download it separately."));
    await second;
    assert.match(ui.field("Local connection status").textContent, /model is missing/);
    assert.equal(ui.button("Test local connection").disabled, false);
    const success = ui.button("Test local connection").onclick!();
    ui.checks[2]!.result.resolve(); await success;
    assert.match(ui.field("Local connection status").textContent, /cloud features disabled/);
    assert.match(ui.field("Local connection status").textContent, /No read roots selected/);
    assert.equal(ui.saves(), 0); assert.equal(ui.plugin.settings.model, "");
    await ui.button("Save settings").onclick!();
    assert.equal(ui.saves(), 1); assert.equal(ui.plugin.settings.model, "local");
    assert.match(ui.field("Local connection status").textContent, /cloud features disabled/);
    ui.field("Downloaded model").changed!("other");
    assert.match(ui.field("Local connection status").textContent, /Draft changed/);
    const closing = ui.button("Test local connection").onclick!();
    const status = ui.field("Local connection status").textContent;
    ui.modal.close(); ui.checks[3]!.result.resolve(); await closing;
    assert.equal(ui.checks[3]!.signal.aborted, true);
    assert.equal(ui.field("Local connection status").textContent, status);
  } finally { ui.close(); }
});

test("redisplaying the settings tab cancels its old check and permits a new check", async () => {
  const ui = setup();
  const tab = new ThreadSettingTab(ui.plugin.app as never, ui.plugin as unknown as ThreadPlugin);
  try {
    ui.modal.close(); ui.form.elements.length = 0; ui.form.fields.clear();
    tab.display();
    const old = ui.button("Test local connection").onclick!();
    ui.form.elements.length = 0; ui.form.fields.clear(); tab.display();
    assert.equal(ui.checks[0]!.signal.aborted, true);
    const current = ui.button("Test local connection").onclick!();
    assert.equal(ui.checks.length, 2);
    ui.checks[0]!.result.resolve(); await old;
    assert.equal(ui.button("Test local connection").disabled, true);
    ui.checks[1]!.result.resolve(); await current;
    assert.match(ui.field("Local connection status").textContent, /cloud features disabled/);
    assert.equal(ui.button("Test local connection").disabled, false);
  } finally { tab.hide(); ui.close(); }
});

test("sample and existing-note guidance preserve explicit preview and Save boundaries", async () => {
  const ui = setup();
  try {
    assert.match(ui.field("Setup path instructions").textContent, /existing project folder/);
    ui.field("Setup path").changed!("sample");
    assert.match(ui.field("Setup path instructions").textContent, /Sample creation grants no read access/);
    await ui.button("Preview optional sample").onclick!();
    assert.equal(ui.form.samples.length, 1);
    assert.deepEqual(ui.plugin.settings.allowedPaths, []); assert.equal(ui.saves(), 0);
    await ui.button("Refresh project folders").onclick!();
    assert.equal(ui.field("Project folder").value, "");
    ui.field("Project folder").changed!("Projects/Example");
    assert.match(ui.field("Read access preview").textContent, /Current saved read roots: none/);
    assert.match(ui.field("Read access preview").textContent, /Newly added roots: Projects\/Example/);
    assert.deepEqual(ui.plugin.settings.allowedPaths, []);
    ui.field("Excluded paths").changed!("Projects/Example");
    assert.match(ui.field("Setup next action").textContent, /selected project is excluded/);
    ui.field("Excluded paths").changed!("Projects/Example/Private");
    await ui.button("Save settings").onclick!();
    assert.equal(ui.saves(), 1);
    assert.deepEqual(ui.plugin.settings.allowedPaths, ["Projects/Example"]);
    assert.deepEqual(ui.plugin.settings.excludedPaths, ["Projects/Example/Private"]);
    assert.match(ui.field("Read access preview").textContent, /Current saved read roots: Projects\/Example/);
    assert.match(ui.field("Setup next action").textContent, /open project home/);
    ui.field("Setup path").changed!("existing");
    assert.deepEqual(ui.plugin.settings.allowedPaths, ["Projects/Example"]);
    assert.equal(ui.saves(), 1);
  } finally { ui.close(); }
});

test("edits made during an explicit Save remain visibly unsaved after that Save finishes", async () => {
  const ui = setup(), saving = deferred<void>();
  try {
    ui.plugin.updateSettings = async settings => { ui.plugin.settings = settings; await saving.promise; };
    ui.field("Project folder").changed!("Projects/Example");
    const pending = ui.button("Save settings").onclick!();
    ui.field("Downloaded model").changed!("new-draft-model");
    saving.resolve(); await pending;
    assert.equal(ui.plugin.settings.model, "");
    assert.match(ui.field("Setup next action").textContent, /apply this draft/);
    assert.ok(ui.form.elements.some(element => element.textContent.includes("Newer draft edits are not saved")));
  } finally { ui.close(); }
});
