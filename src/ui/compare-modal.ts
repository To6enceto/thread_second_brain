import { parseYaml } from 'obsidian';
import { ThreadModal } from './thread-modal.ts';
import { decodeProjectPackage } from '../portability/decode.ts';
import { compareProject, type ProjectComparison } from '../portability/compare.ts';
import { packagePath } from '../portability/format.ts';
import { isWithin } from '../vault/scope.ts';

export class ProjectComparisonModal extends ThreadModal {
  packageSource = '';
  comparison: ProjectComparison | null = null;
  override invalidate(message?: string): void { this.comparison = null; super.invalidate(message); }
  packageChanged(path: string, folder: boolean): void {
    if (this.packageSource && (path === this.packageSource || folder && isWithin(this.packageSource, path))) this.invalidate('Checkpoint package changed. Select and compare again.');
  }
  onOpen(): void {
    const el = this.contentEl; el.addClass('thread-comparison');
    el.createEl('h2', { text: 'Compare project checkpoint' });
    el.createEl('p', { text: 'Compare a deliberately selected local checkpoint with the current permitted project. Read-only: no restoration, note changes, model calls or read grants. Package validation reads inert bytes; historical content is shown only after checking present permissions and support.' });
    const picker = el.createEl('select', { attr: { 'aria-label': 'Comparison checkpoint' } });
    picker.add(new Option('Choose package already in this vault', ''));
    const candidates = this.app.vault.getFiles().filter(f => { try { return packagePath(f.path) === f.path && f.path.endsWith('.thread-project.json') && !this.plugin.settings.excludedPaths.some(p => isWithin(f.path, p)); } catch { return false; } }).sort((a, b) => a.path.localeCompare(b.path));
    for (const file of candidates.slice(0, 200)) picker.add(new Option(file.path, file.path));
    el.createEl('p', { text: `${Math.min(200, candidates.length)} package names shown from metadata only; ${Math.max(0, candidates.length - 200)} beyond the list. Reopen to refresh this list. Selected project: ${this.plugin.settings.selectedProject || 'Choose a permitted project in Settings'}.`, cls: 'thread-muted' });
    picker.onchange = () => { this.packageSource = picker.value; this.invalidate('Selection changed. Compare the selected checkpoint.'); };
    const compare = el.createEl('button', { text: 'Compare selected checkpoint', cls: 'mod-cta' });
    el.createEl('button', { text: 'Cancel comparison' }).onclick = () => this.invalidate('Comparison canceled.');
    this.status = el.createEl('p', { attr: { role: 'status', 'aria-live': 'polite' } }); this.resultEl = el.createDiv();
    compare.onclick = async () => {
      if (this.controller || this.closed) return;
      this.invalidate('Validating checkpoint and current permitted content...');
      const epoch = this.epoch, settings = structuredClone(this.plugin.settings), source = this.packageSource, controller = new AbortController(); this.controller = controller;
      const current = () => this.plugin.active && !this.closed && epoch === this.epoch && !controller.signal.aborted && JSON.stringify(settings) === JSON.stringify(this.plugin.settings);
      try {
        if (!this.plugin.index.ready) await this.plugin.rebuildIndex(); if (!current()) return;
        const decoded = await this.decode(await this.plugin.readProjectPackage(source, current), current);
        const result = await compareProject(this.plugin.index, settings, decoded, {
          ...this.plugin.projectExportPort(current), exists: path => !!this.app.vault.getAbstractFileByPath(path), verify: hashes => this.plugin.snapshotCurrent(hashes, settings)
        }, controller.signal);
        const packageNow = await this.decode(await this.plugin.readProjectPackage(source, current), current);
        if (!current() || packageNow.hash !== decoded.hash || !await this.plugin.snapshotCurrent(result.hashes, settings) || !current() || result.missing.some(path => this.app.vault.getAbstractFileByPath(path))) throw Error('Checkpoint or current sources changed. Compare again.');
        this.comparison = result; this.show(result, current);
        this.status?.setText('Read-only comparison ready. Missing and current-only entries are observations within this selection, not a complete project history.');
      } catch (error) { if (current()) this.status?.setText(error instanceof Error ? error.message : 'Comparison unavailable. Refresh the current project and choose a valid checkpoint.'); }
      finally { if (this.controller === controller) this.controller = null; }
    };
  }
  private async decode(bytes: Uint8Array, current: () => boolean) {
    try { return await decodeProjectPackage(bytes, parseYaml, current); }
    catch { throw Error('The selected checkpoint is invalid, unsupported or changed. Use an unchanged version1 Thread project export and compare again.'); }
  }
  private show(result: ProjectComparison, current: () => boolean): void {
    const el = this.resultEl!;
    el.createEl('h3', { text: 'Checkpoint versus current content' });
    el.createEl('p', { text: `Package captured ${result.capturedAt}. This is a capture timestamp, not an event date. ${result.rows.length} comparable entries; ${result.unavailable} unavailable observations withheld; ${result.currentLimit} current candidates beyond the100-file budget.` });
    el.createEl('p', { text: `Checkpoint omissions: ${result.omissions.unavailable} unavailable, ${result.omissions.unselected} unselected, ${result.omissions.candidateLimit} beyond its candidate budget. Missing means absent at the original permitted path now, not proven deletion. Current-only may have been unselected previously. Renames and unknown history are not inferred.`, cls: 'thread-muted' });
    if (!result.rows.length) el.createEl('p', { text: 'No comparable content is available within current permissions and coverage.' });
    let remaining = 200000;
    const labels = { unchanged: 'Unchanged', changed: 'Changed', missing: 'Missing now - possible removal', 'current-only': 'Current only - possible addition or previously unselected' };
    for (const row of result.rows) {
      const card = el.createEl('details', { cls: 'thread-card' }); card.createEl('summary', { text: `${labels[row.state]}: ${row.path}` });
      for (const [label, side] of [['Before (retained package)', row.before], ['After (current permitted content)', row.after]] as const) {
        card.createEl('h4', { text: label });
        if (!side) { card.createEl('p', { text: 'No snapshot on this side; earlier or omitted contents are unknown.' }); continue; }
        card.createEl('p', { text: `${side.bytes} bytes; SHA-256 ${side.hash}`, cls: 'thread-muted' });
        if (side.text === null) { card.createEl('p', { text: 'PDF binary snapshot. Only sizes and hashes are compared; no embedded content is executed or rendered.' }); continue; }
        const length = Math.min(side.text.length, 50000, remaining); remaining -= length;
        if (length) card.createEl('pre', { text: side.text.slice(0, length), cls: 'thread-preview' });
        if (length < side.text.length) card.createEl('p', { text: `Text display shortened: ${length} of ${side.text.length} characters shown. Full-byte hashes above cover the validated snapshots. Display is limited to50000 characters per side and200000 total.`, cls: 'thread-muted' });
      }
      if (row.after) card.createEl('button', { text: 'Open current source', attr: { 'aria-label': `Open current source ${row.path}` } }).onclick = () => {
        void this.plugin.openIndexedSource(row.path, row.after!.hash, '', current).catch(error => { if (current()) this.status?.setText(String(error)); });
      };
    }
  }
}
