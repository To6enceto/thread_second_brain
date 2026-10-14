import { Modal } from "obsidian";
import type ThreadPlugin from "../main.ts";

export class ThreadModal extends Modal {
  plugin: ThreadPlugin;
  controller: AbortController | null=null;
  closed=false;
  epoch=0;
  status: HTMLElement | null=null;
  resultEl: HTMLElement | null=null;
  constructor(plugin: ThreadPlugin) {super(plugin.app);this.plugin=plugin;this.contentEl.addClass("thread-modal");}
  invalidate(message="Notes or settings changed. Run this action again."): void {
    this.epoch++;
    this.controller?.abort();this.controller=null;this.resultEl?.empty();this.status?.setText(message);
  }
  onClose(): void {this.closed=true;this.controller?.abort();this.plugin.modals.delete(this);this.contentEl.empty();}
}
