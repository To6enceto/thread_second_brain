import { Setting } from "obsidian";
import type ThreadPlugin from "../main.ts";
import type { ConversationTurn } from "../intelligence/conversation.ts";
import { createConversationRecord, conversationMarkdown } from "../vault/conversation-record.ts";
import { localDay, noteName } from "../vault/workspace.ts";
import { ThreadModal } from "./thread-modal.ts";
import { NewNoteModal } from "./new-note-modal.ts";

export class ConversationSaveModal extends ThreadModal {
  private turns: ConversationTurn[];
  private validateParent: () => Promise<boolean>;
  private inputs = 0;
  private revoked = false;
  private previews = new Set<NewNoteModal>();
  private previewButton: HTMLButtonElement | null = null;

  constructor(plugin: ThreadPlugin, turns: readonly ConversationTurn[], validate: () => Promise<boolean>) {
    super(plugin);
    this.turns = structuredClone([...turns]);
    this.validateParent = validate;
  }

  override invalidate(message = "Conversation or evidence changed. Reopen Save conversation from Ask."): void {
    super.invalidate(message);
    this.revoked = true;
    this.turns = [];
    if (this.previewButton) this.previewButton.disabled = true;
    for (const preview of this.previews) if (!preview.closed) preview.invalidate(message);
    this.previews.clear();
  }

  override onClose(): void {
    this.inputs++;
    this.invalidate("Conversation save closed. Open a new preview.");
    super.onClose();
  }

  onOpen(): void {
    const el = this.contentEl;
    el.createEl("h2", { text: "Save conversation" });
    el.createEl("p", { text: "Choose completed turns to preserve in a new readable Markdown note. Original output, corrections and chosen evidence remain distinct. Nothing is saved until you approve the exact preview." });
    let name = `Conversation ${localDay()} ${crypto.randomUUID().slice(0, 8)}`;
    const selected = new Set(this.turns.map((_, i) => i + 1));
    const changed = () => {
      this.inputs++;
      for (const preview of this.previews) if (!preview.closed) preview.invalidate("Conversation save selection or name changed. Preview again.");
      this.previews.clear();
      if (this.previewButton) this.previewButton.disabled = this.revoked || !selected.size;
      this.status?.setText(selected.size ? "Selection changed. Review a new exact preview." : "Select at least one completed turn.");
    };
    new Setting(el).setName("New conversation note name").addText(t => {
      t.inputEl.setAttribute("aria-label", "New conversation note name");
      t.setValue(name).onChange(value => { if (!this.closed && !this.revoked) { name = value; changed(); } });
    });
    this.resultEl = el.createDiv({ cls: "thread-conversation-history" });
    for (const [index, turn] of this.turns.entries()) {
      const row = this.resultEl.createEl("label", { cls: "thread-conversation-choice" });
      const checkbox = row.createEl("input", { type: "checkbox", attr: { "aria-label": `Save turn ${index + 1}` } });
      checkbox.checked = true;
      row.createEl("span", { text: `Turn ${index + 1}: ${turn.question}` });
      checkbox.onchange = () => {
        if (this.closed || this.revoked) return;
        if (checkbox.checked) selected.add(index + 1); else selected.delete(index + 1);
        changed();
      };
    }
    this.status = el.createEl("p", { text: "All captured turns are selected. Inspect the destination and full content before saving.", attr: { role: "status", "aria-live": "polite" } });
    this.previewButton = el.createEl("button", { text: "Preview conversation note", cls: "mod-cta" });
    el.createEl("button", { text: "Cancel conversation save" }).onclick = () => this.close();
    this.watchPaths(this.turns.flatMap(turn => Object.keys(turn.bundle.noteHashes)));
    this.previewButton.onclick = async () => {
      if (this.closed || this.revoked || this.previewButton!.disabled) return;
      const inputs = this.inputs, epoch = this.epoch, turns = this.turns, numbers = [...selected], title = name;
      const current = () => !this.closed && !this.revoked && epoch === this.epoch && inputs === this.inputs;
      this.previewButton!.disabled = true;
      this.status?.setText("Checking current evidence and preparing the exact conversation preview...");
      try {
        const first = turns[0];
        if (!first) throw new Error("No completed turns. Return to Ask.");
        const settings = first.settings;
        const folder = first.vault ? settings.roles.knowledge : settings.selectedProject;
        if (!folder) throw new Error("Map a Knowledge folder to save wider-scope conversations.");
        const record = createConversationRecord(title, turns, numbers);
        const note = { path: `${folder}/Conversations/${noteName(title)}.md`, content: conversationMarkdown(record) };
        const captured = numbers.map(number => turns[number - 1]!);
        const valid = async () => {
          if (this.closed || inputs !== this.inputs || !this.plugin.active || !await this.validateParent()) return false;
          if (this.closed || inputs !== this.inputs) return false;
          for (const turn of captured) {
            if (!await this.plugin.evidenceCurrent(turn.bundle, settings) || this.closed || inputs !== this.inputs) return false;
          }
          const parentCurrent = await this.validateParent();
          return parentCurrent && !this.closed && inputs === this.inputs && this.plugin.active;
        };
        if (!await valid() || !current()) throw new Error("Conversation or sources changed. Reopen Save conversation.");
        const preview = new NewNoteModal(this.plugin, note, valid);
        for (const old of this.previews) if (old.closed) this.previews.delete(old);
        this.previews.add(preview); this.plugin.modals.add(preview); preview.open();
        this.status?.setText("Exact preview ready. Saving creates one new note; existing notes are never overwritten.");
      } catch (error) {
        if (current()) this.status?.setText(error instanceof Error ? error.message : "Could not prepare the conversation.");
      } finally {
        if (current()) this.previewButton!.disabled = !selected.size;
      }
    };
  }
}
