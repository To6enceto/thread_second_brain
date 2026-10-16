import { Modal } from "obsidian";
import type { EvidenceBundle } from "../vault/evidence.ts";
import type ThreadPlugin from "../main.ts";

export class ThreadModal extends Modal {
  plugin: ThreadPlugin;
  controller: AbortController | null=null;
  closed=false;
  epoch=0;
  dependencies:Set<string>|null=null;
  watchPaths(paths:string[]):void {this.dependencies=new Set(paths);}
  watchBundle(bundle:EvidenceBundle,extra:string[]=[]):void {this.watchPaths([...Object.keys(bundle.noteHashes),...extra]);}
  invalidatePaths(paths:Set<string>):void {if(this.dependencies===null||[...paths].some(path=>this.dependencies!.has(path)))this.invalidate();}
  status: HTMLElement | null=null;
  resultEl: HTMLElement | null=null;
  constructor(plugin: ThreadPlugin) {super(plugin.app);this.plugin=plugin;this.contentEl.addClass("thread-modal");}
  invalidate(message="Notes or settings changed. Run this action again."): void {
    this.dependencies=null;this.epoch++;
    this.controller?.abort();this.controller=null;this.resultEl?.empty();this.status?.setText(message);
  }
  onClose(): void {this.closed=true;this.controller?.abort();this.plugin.modals.delete(this);this.contentEl.empty();}
}
