import { indexBudget } from "../settings/index-budget.ts";
import { indexCoverage, retainIndexEntries } from "../vault/index-coverage.ts";
import { indexNote, LocalIndex, type IndexEntry } from "../vault/index.ts";
import { contentHash, type ReadScope } from "../vault/scope.ts";
import { searchCoverageText } from "../retrieval/search.ts";
import { PdfChecks } from "../pdf/checks.ts";
import { pdfEvidenceText, readPdfSource, type PdfRecord } from "../pdf/record.ts";
import { outputProjection } from "../vault/freshness.ts";
import type { IndexSnapshot, SearchSnapshot, IndexEvent, NoteList, NoteSnapshot } from "./contracts.ts";
import { metadata } from "./metadata.ts";
import { resolveLink } from "./links.ts";
import { DesktopError } from "./security.ts";
import type { VaultReader } from "./vault-reader.ts";

const budget = indexBudget("conservative");
/** Evidence text for a usable entry: validated page text for PDF extractions, fail-closed output projection otherwise. */
export async function projectedSource(raw: string, entry: IndexEntry): Promise<{ text: string; pdf?: PdfRecord }> {
  if (!entry.pdf) return { text: outputProjection(raw, entry.metadata).text };
  const source = await readPdfSource(raw, metadata(raw));
  return { text: pdfEvidenceText(source.extraction), pdf: source.record };
}
// Desktop enumeration can fail before it knows how many text files exist.
// Keep that separate from the shared index's known-file admission counts.
class DesktopIndex extends LocalIndex {
  enumerationComplete = false;
  override get identityComplete(): boolean { return this.enumerationComplete && super.identityComplete; }
  override clear(): void { super.clear(); this.enumerationComplete = false; }
}
export class EvidenceIndex {
  readonly index = new DesktopIndex();
  private reader: VaultReader;
  private notify: (event: IndexEvent) => void;
  private cache = new Map<string, { stamp: string; entry: IndexEntry }>();
  private listing: NoteList | null = null;
  private signature = "";
  private epoch = 0;
  private task: Promise<IndexSnapshot> | null = null;
  private controller: AbortController | null = null;
  private paused = false;
  private generation = 0;
  private snapshot: IndexSnapshot | null = null;

  constructor(reader: VaultReader, notify: (event: IndexEvent) => void = () => {}) { this.reader = reader; this.notify = notify; }
  reset(): void {
    this.epoch++; this.controller?.abort(); this.task = null; this.cache.clear();
    this.listing = null; this.signature = ""; this.snapshot = null; this.index.clear(); this.generation++; this.paused = false;
  }
  cancel(revision: unknown): void {
    this.requireRevision(revision); this.reset(); this.paused = true;
    this.notify({ revision: revision as number, generation: this.generation, kind: "invalidated", message: "Stopped reading notes. Thread will not notice changes until you choose Refresh." });
  }
  private requireRevision(revision: unknown): number {
    if (!Number.isSafeInteger(revision) || this.reader.getInfo()?.revision !== revision) throw new DesktopError("The folder or what Thread may read changed. Choose Refresh first.");
    return revision as number;
  }
  assertCurrent(snapshot: IndexSnapshot): void {
    this.requireRevision(snapshot.revision);
    if (this.paused || !this.index.ready || snapshot.generation !== this.generation) throw new DesktopError("Your notes changed or reading was stopped. Choose Refresh and try again.");
  }
  scope(): ReadScope & { pdfPaths: string[] } {
    const info = this.reader.getInfo(), pdfPaths = (info?.pdfs ?? []).filter(path => this.listing?.pdfs[path] !== undefined);
    // Consented PDFs are exact files; text reads still require a Markdown/text extension.
    return { allowedPaths: [...this.listing?.paths ?? [], ...pdfPaths], excludedPaths: info?.scope.excluded ?? [], pdfPaths };
  }
  async refresh(revision: unknown, resume = false): Promise<IndexSnapshot> {
    const rev = this.requireRevision(revision);
    if (resume) this.paused = false;
    if (this.paused) throw new DesktopError("Thread stopped reading notes. Choose Refresh to continue.");
    if (this.task) return this.task;
    const epoch = this.epoch, controller = new AbortController(); this.controller = controller;
    const current = (): void => {
      controller.signal.throwIfAborted(); this.requireRevision(rev);
      if (this.epoch !== epoch) throw new DOMException("Index changed.", "AbortError");
    };
    const task = this.reconcile(rev, current, controller.signal);
    this.task = task;
    try { return await task; }
    catch (error) {
      if (epoch === this.epoch) {
        this.reset(); this.paused = true;
        this.notify({ revision: rev, generation: this.generation, kind: "invalidated", message: "Thread could not read your notes. Choose Refresh, or choose the folder again." });
      }
      throw error;
    } finally { if (this.task === task) this.task = null; }
  }
  private async reconcile(revision: number, current: () => void, signal: AbortSignal): Promise<IndexSnapshot> {
    const started = performance.now(), listing = await this.reader.list(revision); current();
    // Consented PDF stamps join the signature so original edits, removal or consent changes rebuild PDF evidence.
    const consented = (this.reader.getInfo()?.pdfs ?? []).filter(path => listing.pdfs[path] !== undefined);
    const signature = JSON.stringify([listing.paths.map(path => [path, listing.files[path]!.stamp]), listing.omitted, listing.omittedMarkdown, listing.identityIncomplete, listing.limited, consented.map(path => [path, listing.pdfs[path]!.stamp])]);
    if (this.signature === signature && this.snapshot) return this.snapshot;
    const generation = ++this.generation;
    this.index.clear(); this.snapshot = null;
    this.notify({ revision, generation, kind: "invalidated", message: "Some notes changed. Updating..." });
    this.listing = listing;
    const next = new Map<string, { stamp: string; entry: IndexEntry }>(), entries: IndexEntry[] = [];
    let admittedBytes = 0, rawBytesRead = 0, filesRead = 0, sizeSkips = 0, readBudgetSkips = 0, invalid = 0, reused = 0;
    const pdfChecks = new PdfChecks();
    for (const [position, path] of listing.paths.entries()) {
      current();
      const file = listing.files[path]!;
      if (file.bytes > budget.maxFileBytes) { sizeSkips++; continue; }
      if (admittedBytes + file.bytes > budget.maxReadBytes) { readBudgetSkips++; continue; }
      admittedBytes += file.bytes;
      try {
        const previous = this.cache.get(path);
        let entry: IndexEntry;
        if (previous?.stamp === file.stamp) { entry = previous.entry; reused++; }
        else {
          const note = await this.reader.read(path, revision, file.bytes); current();
          rawBytesRead += file.bytes; filesRead++;
          if (note.stamp !== file.stamp) throw new DesktopError("A note changed while Thread was reading it.");
          entry = await indexNote({ ...note, metadata: metadata(note.text) }, () => null, { budget, signal }); current();
        }
        const links = [...new Set((entry.linkTexts ?? []).flatMap(target => {
          const resolved = resolveLink(path, target, listing.paths); return resolved.paths.length === 1 ? resolved.paths : [];
        }))];
        entry = { ...entry, links };
        // Extracted PDF pages are usable only while their consented original still matches; verified every rebuild.
        if (entry.pdf) {
          const pdfPath = entry.pdf.path, size = listing.pdfs[pdfPath]?.bytes;
          const hash = consented.includes(pdfPath) ? await pdfChecks.verify(pdfPath, () => size ?? null, () => this.reader.readPdf(pdfPath, revision, current).then(original => ({ hash: original.hash, bytes: original.bytes.buffer as ArrayBuffer })), signal) : null;
          current(); if (hash) this.index.binaries.set(pdfPath, hash); else this.index.binaries.delete(pdfPath);
        }
        next.set(path, { stamp: file.stamp, entry }); entries.push(entry);
      } catch { current(); invalid++; }
      this.notify({ revision, generation, kind: "progress", message: `Reading note ${position + 1} of ${listing.paths.length}...` });
    }
    current();
    const retained = retainIndexEntries(entries, new Set(listing.paths), budget);
    // Cache only admitted entries: derived data is bounded even when sources are large.
    this.cache = new Map([...next].filter(([path]) => !retained.removed.has(path)));
    this.index.coverage = indexCoverage("conservative", listing.paths.length + listing.omittedMarkdown, listing.paths.length, retained.entries,
      { rawBytesRead, filesRead, sizeSkips, readBudgetSkips, elapsedMs: performance.now() - started }, retained.entryBudgetSkips);
    this.index.enumerationComplete = !listing.identityIncomplete;
    this.index.replace(retained.entries, this.scope());
    this.signature = signature;
    const pdfEntries = entries.filter(entry => entry.pdf), ungranted = pdfEntries.filter(entry => !consented.includes(entry.pdf!.path)).length;
    const changed = pdfEntries.filter(entry => { const hash = this.index.binaries.get(entry.pdf!.path); return hash !== undefined && hash !== entry.pdf!.hash; }).length;
    const snapshot: IndexSnapshot = { revision, generation, listing, coverage: this.index.coverage, invalid, reused, ...(pdfEntries.length ? { pdfChecks: `${pdfEntries.length} extracted PDF sources; ${ungranted} need an explicit PDF grant; ${changed} have a changed original and stay out of evidence until re-extracted. ${pdfChecks.summary}` } : {}) };
    this.snapshot = snapshot;
    this.notify({ revision, generation, kind: "ready", message: "Notes ready. Search works without AI.", snapshot });
    return snapshot;
  }
  async search(query: unknown, revision: unknown): Promise<SearchSnapshot> {
    if (typeof query !== "string" || query.length > 1000 || !query.trim()) throw new DesktopError("Enter 1 to 1000 characters to search.");
    const snapshot = await this.refresh(revision), generation = this.generation;
    let result;
    try { result = this.index.search(query, this.scope(), null, {}, 20); }
    catch { throw new DesktopError("Check the search: close each quoted phrase, and use at most eight."); }
    this.requireRevision(revision);
    if (generation !== this.generation) throw new DesktopError("Notes changed. Search again.");
    return { ...snapshot, hits: result.hits.map(hit => ({ path: hit.entry.path, hash: hit.entry.hash, heading: hit.heading, excerpt: hit.excerpt })),
      coverageText: searchCoverageText({ ...result.coverage, indexOmittedNotes: snapshot.coverage.omittedFiles }) +
        (snapshot.listing.identityIncomplete ? " Markdown enumeration is incomplete; these file counts cover known files only. Stable-ID uniqueness is unproven and identity-dependent output cannot be reused." : "") };
  }
  async source(path: unknown, revision: unknown, expectedHash: unknown): Promise<NoteSnapshot & { generation: number }> {
    if (expectedHash !== undefined && (typeof expectedHash !== "string" || !/^[a-f0-9]{64}$/.test(expectedHash))) throw new DesktopError("This result is no longer valid. Search again.");
    await this.refresh(revision); const generation = this.generation;
    // Evidence and page citations into extracted PDF text require the consented original to match the extraction.
    const pdf = expectedHash === undefined ? undefined : this.index.entries.find(entry => entry.path === path)?.pdf;
    if (pdf && (this.index.binaries.get(pdf.path) !== pdf.hash || await this.reader.currentHash(pdf.path, revision).catch(() => "") !== pdf.hash)) throw new DesktopError("The original PDF changed, moved or is no longer granted. Grant it again or extract a new source; the saved extraction is unchanged.");
    const note = await this.reader.read(path, revision);
    const hash = await contentHash(note.text); this.requireRevision(revision);
    if (generation !== this.generation || expectedHash !== undefined && hash !== expectedHash) throw new DesktopError("This note changed since the search. Search again to open it.");
    return { ...note, generation };
  }
  async resolve(from: unknown, target: unknown, revision: unknown): Promise<ReturnType<typeof resolveLink>> {
    if (typeof from !== "string" || typeof target !== "string") throw new DesktopError("This link could not be followed.");
    const snapshot = await this.refresh(revision);
    if (!snapshot.listing.paths.includes(from)) throw new DesktopError("Thread is not allowed to read this note.");
    return resolveLink(from, target, snapshot.listing.paths);
  }
}
