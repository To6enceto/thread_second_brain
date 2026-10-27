import { randomUUID } from "node:crypto";
import { pdfSource, validateExtraction, PDF_LIMITS, type PdfExtraction } from "../pdf/record.ts";
import { noteName } from "../vault/workspace.ts";
import type { IndexSnapshot } from "./contracts.ts";
import type { VaultReader } from "./vault-reader.ts";
import type { EvidenceIndex } from "./evidence-index.ts";
import type { DesktopStorage } from "./storage.ts";
import type { DesktopChanges } from "./changes.ts";
import { catalogFingerprint } from "./catalog.ts";
import { metadata } from "./metadata.ts";
import { DesktopError } from "./security.ts";

export interface PdfSnapshot { id: string; files: { path: string; bytes: number; consented: boolean }[]; coverage: string; }
export interface PdfOriginalSnapshot { token: string; path: string; hash: string; bytes: Uint8Array; }
interface Context { value: PdfSnapshot; index: IndexSnapshot; }

/** Main-owned PDF consent context, original tokens and reviewed derived-source proposals. */
export class DesktopPdf {
  private reader: VaultReader;
  private evidence: EvidenceIndex;
  private storage: DesktopStorage;
  private changes: DesktopChanges;
  private context: Context | null = null;
  private original: { token: string; path: string; hash: string } | null = null;
  private epoch = 0;
  private preparing: number | null = null;
  constructor(reader: VaultReader, evidence: EvidenceIndex, storage: DesktopStorage, changes: DesktopChanges) { this.reader = reader; this.evidence = evidence; this.storage = storage; this.changes = changes; }
  draftChanged(): void { this.epoch++; this.original = null; if (this.preparing !== null) this.changes.invalidate(); }
  invalidate(): void { this.draftChanged(); this.context = null; }
  async load(revision: unknown): Promise<PdfSnapshot> {
    this.invalidate(); const epoch = this.epoch, index = await this.evidence.refresh(revision);
    if (epoch !== this.epoch) throw new DesktopError("Canceled. Choose Refresh research."); this.evidence.assertCurrent(index);
    const consent = this.reader.getInfo()?.pdfs ?? [], files = Object.entries(index.listing.pdfs).sort(([a], [b]) => a.localeCompare(b)).map(([path, file]) => ({ path, bytes: file.bytes, consented: consent.includes(path) }));
    const value: PdfSnapshot = { id: randomUUID(), files, coverage: `${files.length} ${files.length === 1 ? "PDF" : "PDFs"} in the folders Thread may read${index.listing.pdfLimited ? " (limit of 200 reached; allow fewer folders to see others)" : ""}; ${files.filter(file => file.consented).length} allowed this session. Allowing notes never allows PDFs, and PDF permissions end when read access changes. PDFs up to 16 MiB, ${PDF_LIMITS.totalPages} pages, ${PDF_LIMITS.pages} pages read. Only text in the PDF can be read; Thread does not do OCR.` };
    this.context = { value, index }; return structuredClone(value);
  }
  private active(id: unknown, revision: unknown): Context {
    const context = this.context; if (!context || context.value.id !== id || context.index.revision !== revision) throw new DesktopError("The PDFs, their permissions or access changed. Choose Refresh research."); this.evidence.assertCurrent(context.index); return context;
  }
  async read(id: unknown, path: unknown, revision: unknown): Promise<PdfOriginalSnapshot> {
    const context = this.active(id, revision); this.draftChanged(); const epoch = this.epoch;
    const file = context.value.files.find(item => item.path === path);
    if (!file?.consented) throw new DesktopError("Allow this PDF (Grant PDF read) before getting its text.");
    const original = await this.reader.readPdf(file.path, revision, () => { if (epoch !== this.epoch || this.active(id, revision) !== context) throw new DesktopError("The chosen PDF changed or reading was canceled. Try again."); });
    this.original = { token: randomUUID(), path: original.path, hash: original.hash };
    return { ...this.original, bytes: original.bytes };
  }
  /** The renderer reports extracted text only; main rebinds it to the original it read and rechecks that original. */
  async prepare(id: unknown, token: unknown, extraction: unknown, nameInput: unknown, revision: unknown) {
    const context = this.active(id, revision), original = this.original, epoch = ++this.epoch; this.preparing = epoch;
    const current = () => { if (epoch !== this.epoch || this.active(id, revision) !== context) throw new DesktopError("Something changed or was canceled. Get the PDF's text again."); };
    try {
      if (!original || typeof token !== "string" || token !== original.token) throw new DesktopError("Get the PDF's text again before saving.");
      if (typeof nameInput !== "string" || nameInput.length > 100) throw new DesktopError("Enter a new source name within 100 characters.");
      const folder = this.storage.status(revision).preferences.roles.sources; if (!folder) throw new DesktopError("Set a Sources folder under Saving notes first. This does not let Thread read anything new.");
      let name: string, validated: PdfExtraction, content: string;
      // Only expected validation messages are shown verbatim; other failures keep the generic public message.
      try { name = noteName(nameInput); validated = validateExtraction(extraction); content = await pdfSource(validated, original.path, original.hash); metadata(content); }
      catch (error) { throw error instanceof DesktopError ? error : new DesktopError(error instanceof Error ? error.message : "The PDF text could not be used. Get it again."); }
      const path = `${folder}/${name}.md`;
      if (context.index.listing.paths.includes(path)) throw new DesktopError(`${path} already exists. Choose a new source name; existing notes are never overwritten.`);
      current();
      const fresh = await this.reader.readPdf(original.path, revision, current); current();
      if (fresh.hash !== original.hash) throw new DesktopError("The PDF changed after its text was read. Get the text again; the PDF is unchanged.");
      return await this.changes.propose([{ path, before: null, after: content }], [{ path: original.path, hash: original.hash }], revision, catalogFingerprint(context.index.listing, [path]));
    } finally { if (this.preparing === epoch) this.preparing = null; }
  }
}
