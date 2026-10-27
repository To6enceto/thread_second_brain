export interface ReadScope { roots: string[]; excluded: string[]; }
export interface VaultInfo { name: string; path: string; revision: number; scope: ReadScope; pdfs: string[]; }
export interface NoteList { revision: number; paths: string[]; files: Record<string, { stamp: string; bytes: number }>; omitted: number; omittedMarkdown: number; identityIncomplete: boolean; limited: boolean; pdfs: Record<string, { stamp: string; bytes: number }>; pdfLimited: boolean; }
export interface NoteSnapshot { revision: number; path: string; text: string; modifiedAt: number; stamp: string; }
export type DesktopResult<T> = { ok: true; value: T } | { ok: false; message: string };
export interface DesktopBridge {
  selectVault(): Promise<DesktopResult<VaultInfo | null>>;
  grantScope(scope: ReadScope, revision: number): Promise<DesktopResult<VaultInfo>>;
  listNotes(revision: number): Promise<DesktopResult<NoteList>>;
  readNote(path: string, revision: number, expectedHash?: string): Promise<DesktopResult<NoteSnapshot & { generation: number }>>;
  refreshIndex(revision: number): Promise<DesktopResult<IndexSnapshot>>;
  cancelIndex(revision: number): Promise<DesktopResult<null>>;
  searchNotes(query: string, revision: number): Promise<DesktopResult<SearchSnapshot>>;
  resolveLink(from: string, target: string, revision: number): Promise<DesktopResult<import("./links.ts").LinkResolution>>;
  onIndexEvent(listener: (event: IndexEvent) => void): () => void;
  projectHome(selection: ProjectRequest, revision: number): Promise<DesktopResult<ProjectSnapshot>>;
  resumeProject(selection: ProjectRequest, revision: number): Promise<DesktopResult<PreparedResume>>;
  discoverModels(endpoint: string): Promise<DesktopResult<{ models: import("../intelligence/ollama.ts").DownloadedModel[]; total: number; omitted: number }>>;
  configureAI(config: AIConfig): Promise<DesktopResult<AIConfig>>;
  checkAI(): Promise<DesktopResult<string>>;
  cancelAI(): Promise<DesktopResult<null>>;
  interpretResume(briefingId: string, revision: number): Promise<DesktopResult<AIInterpretation>>;
  retrieveAsk(request: AskRequest, revision: number): Promise<DesktopResult<AskSnapshot>>;
  chooseAsk(identity: string, choices: Record<string, import("../vault/workbench.ts").EvidenceChoice>, revision: number): Promise<DesktopResult<AskContext>>;
  generateAsk(identity: string, revision: number): Promise<DesktopResult<AskAnswer>>;
  correctAsk(identity: string, index: number, text: string, kind: import("../intelligence/briefing.ts").Claim["kind"], revision: number): Promise<DesktopResult<AskAnswer>>;
  continueAsk(identity: string, question: string, revision: number): Promise<DesktopResult<AskSnapshot>>;
  resetAsk(): Promise<DesktopResult<null>>;
  storageStatus(revision: number): Promise<DesktopResult<import("./storage.ts").StorageStatus>>;
  inspectCompatibility(folder: string, revision: number): Promise<DesktopResult<import("./storage.ts").CompatibilityPreview>>;
  enableWriting(id: string, revision: number): Promise<DesktopResult<import("./storage.ts").StorageStatus>>;
  releaseWriting(): Promise<DesktopResult<null>>;
  savePreferences(preferences: import("./profile.ts").DesktopPreferences, revision: number): Promise<DesktopResult<import("./storage.ts").StorageStatus>>;
  importPluginCopy(id: string, revision: number): Promise<DesktopResult<import("./storage.ts").StorageStatus>>;
  previewAskSave(identity: string, kind: "answer" | "conversation", title: string, selected: number[], revision: number): Promise<DesktopResult<import("./saves.ts").SavePreview>>;
  saveAskPreview(id: string, revision: number): Promise<DesktopResult<{ path: string }>>;
  revokeSavePreview(): Promise<DesktopResult<null>>;
  inspectSaveRecovery(id: string, revision: number): Promise<DesktopResult<import("./saves.ts").RecoveryPreview>>;
  resolveSaveRecovery(id: string, action: "confirm" | "leave", revision: number): Promise<DesktopResult<null>>;
  changesSnapshot(revision: number): Promise<DesktopResult<import("./changes.ts").ChangesSnapshot>>;
  beginNoteEdit(path: string, stamp: string, revision: number): Promise<DesktopResult<import("./changes.ts").EditDraft>>;
  proposeNoteEdit(id: string, body: string, revision: number): Promise<DesktopResult<import("./changes.ts").ChangesSnapshot>>;
  previewChange(action: import("./changes.ts").ChangeAction, id: string, revision: number): Promise<DesktopResult<import("./changes.ts").ChangePreview>>;
  confirmChange(id: string, revision: number): Promise<DesktopResult<import("./changes.ts").ChangesSnapshot>>;
  reviseChange(id: string, bodies: string[], revision: number): Promise<DesktopResult<import("./changes.ts").ChangesSnapshot>>;
  rejectChange(id: string, revision: number): Promise<DesktopResult<import("./changes.ts").ChangesSnapshot>>;
  changeDraftEdited(id: string): Promise<DesktopResult<null>>;
  invalidateChangeView(): Promise<DesktopResult<null>>;
  loadRecords(selection: ProjectRequest, revision: number): Promise<DesktopResult<import("./records.ts").RecordsSnapshot>>;
  prepareRecord(id: string, command: import("./records.ts").RecordCommand, revision: number): Promise<DesktopResult<import("./changes.ts").ChangesSnapshot>>;
  assessDecision(id: string, path: string, sources: string[], revision: number): Promise<DesktopResult<import("./records.ts").DecisionAssessment>>;
  recordDraftChanged(keepAssessment: boolean): Promise<DesktopResult<null>>;
  cancelRecords(): Promise<DesktopResult<null>>;
  loadActions(selection: ProjectRequest, revision: number): Promise<DesktopResult<import("./records.ts").ActionsSnapshot>>;
  prepareAction(id: string, command: import("./records.ts").ActionCommand, revision: number): Promise<DesktopResult<import("./changes.ts").ChangesSnapshot>>;
  generateSession(id: string, input: import("./records.ts").SessionInput, revision: number): Promise<DesktopResult<import("./records.ts").SessionDraft>>;
  prepareSession(id: string, revision: number): Promise<DesktopResult<import("./changes.ts").ChangesSnapshot>>;
  loadReviews(request: import("./reviews.ts").ReviewRequest, revision: number): Promise<DesktopResult<import("./reviews.ts").DesktopReviewSnapshot>>;
  prepareReview(id: string, command: import("./reviews.ts").ReviewCommand, revision: number): Promise<DesktopResult<import("./changes.ts").ChangesSnapshot>>;
  generateReview(id: string, input: import("./reviews.ts").ReviewGeneration, revision: number): Promise<DesktopResult<import("./reviews.ts").ReviewDraft>>;
  prepareReviewDraft(id: string, revision: number): Promise<DesktopResult<import("./changes.ts").ChangesSnapshot>>;
  reviewDraftChanged(): Promise<DesktopResult<null>>;
  cancelReviews(): Promise<DesktopResult<null>>;
  loadIntake(selection: ProjectRequest, revision: number): Promise<DesktopResult<import("./intake.ts").IntakeSnapshot>>;
  pickIntakeFile(id: string, revision: number): Promise<DesktopResult<import("./intake.ts").IntakeFile | null>>;
  suggestIntakeProject(id: string, input: Pick<import("./intake.ts").CaptureInput, "kind" | "text" | "file">, revision: number): Promise<DesktopResult<string | null>>;
  prepareCapture(id: string, input: import("./intake.ts").CaptureInput, revision: number): Promise<DesktopResult<import("./changes.ts").ChangesSnapshot>>;
  reviewClip(id: string, input: { path: string; project: string; name: string }, revision: number): Promise<DesktopResult<import("./intake.ts").ClipSnapshot>>;
  prepareClip(id: string, reviewId: string, acknowledge: boolean, revision: number): Promise<DesktopResult<import("./changes.ts").ChangesSnapshot>>;
  loadCollections(selection: ProjectRequest, scope: "project" | "allowed", revision: number): Promise<DesktopResult<import("./collections.ts").CollectionsSnapshot>>;
  openCollection(id: string, path: string, revision: number): Promise<DesktopResult<import("./collections.ts").CollectionReview>>;
  reuseCollection(id: string, reviewId: string, choices: CollectionChoices, question: string, revision: number): Promise<DesktopResult<CollectionHandoff>>;
  saveEditedCollection(id: string, reviewId: string, choices: CollectionChoices, name: string, revision: number): Promise<DesktopResult<import("./changes.ts").ChangesSnapshot>>;
  saveAskCollection(id: string, name: string, revision: number): Promise<DesktopResult<import("./changes.ts").ChangesSnapshot>>;
  loadKnowledge(selection: ProjectRequest, revision: number): Promise<DesktopResult<import("./knowledge.ts").KnowledgeSnapshot>>;
  generateKnowledge(id: string, input: import("./knowledge.ts").KnowledgeInput, revision: number): Promise<DesktopResult<import("./knowledge.ts").KnowledgeDraft>>;
  prepareKnowledge(id: string, revision: number): Promise<DesktopResult<import("./changes.ts").ChangesSnapshot>>;
  researchDraftChanged(keepClip: boolean): Promise<DesktopResult<null>>;
  cancelResearch(): Promise<DesktopResult<null>>;
  readPdfAsset(path: string): Promise<DesktopResult<Uint8Array>>;
  exportInventory(selection: ProjectRequest, revision: number): Promise<DesktopResult<import("./portability.ts").ExportSnapshot>>;
  previewExport(id: string, selected: string[], folder: string, name: string, revision: number): Promise<DesktopResult<import("./portability.ts").ExportPreviewSnapshot>>;
  writeExport(id: string, revision: number): Promise<DesktopResult<string>>;
  pickPackage(revision: number): Promise<DesktopResult<import("./portability.ts").PackageSummary | null>>;
  compareCheckpoint(token: string, selection: ProjectRequest, revision: number): Promise<DesktopResult<import("./portability.ts").ComparisonSnapshot>>;
  importStatus(revision: number): Promise<DesktopResult<import("./portability.ts").ImportStatus>>;
  previewImport(token: string, root: string, revision: number): Promise<DesktopResult<import("./portability.ts").ImportPreviewSnapshot>>;
  applyImport(id: string, revision: number): Promise<DesktopResult<import("./portability.ts").ImportStatus>>;
  leaveImport(revision: number): Promise<DesktopResult<import("./portability.ts").ImportStatus>>;
  cancelPortability(): Promise<DesktopResult<null>>;
  loadPdfs(revision: number): Promise<DesktopResult<import("./pdf.ts").PdfSnapshot>>;
  consentPdf(path: string, granted: boolean, revision: number): Promise<DesktopResult<VaultInfo>>;
  readPdf(id: string, path: string, revision: number): Promise<DesktopResult<import("./pdf.ts").PdfOriginalSnapshot>>;
  preparePdf(id: string, token: string, extraction: import("../pdf/record.ts").PdfExtraction, name: string, revision: number): Promise<DesktopResult<import("./changes.ts").ChangesSnapshot>>;
  closeVault(): Promise<DesktopResult<null>>;
  prepareNewProject(kind: "project" | "sample", name: string, revision: number): Promise<DesktopResult<import("./changes.ts").ChangesSnapshot>>;
  savedAccess(): Promise<DesktopResult<SavedAccessStatus>>;
  rememberAccess(projectsFolder: string, embeddingModel: string, revision: number): Promise<DesktopResult<SavedAccessStatus>>;
  forgetSavedAccess(): Promise<DesktopResult<SavedAccessStatus>>;
  continueSavedAccess(): Promise<DesktopResult<ContinuedAccess>>;
}
import type { IndexCoverage } from "../vault/index-coverage.ts";
export interface IndexSnapshot { revision: number; generation: number; listing: NoteList; coverage: IndexCoverage; invalid: number; reused: number; pdfChecks?: string; }
export interface SearchSnapshot extends IndexSnapshot { hits: { path: string; hash: string; heading: string; excerpt: string }[]; coverageText: string; }
export interface IndexEvent { revision: number; generation: number; kind: "invalidated" | "progress" | "ready"; message: string; snapshot?: IndexSnapshot; }

export interface ProjectRequest { folder: string; project: string; }
export interface ProjectSnapshot {
  revision: number; generation: number; projects: string[];
  home: import("../vault/project-home.ts").ProjectHome | null;
  index: IndexSnapshot;
}
export interface RecordedSnapshot extends ProjectSnapshot {
  bundle: import("../vault/evidence.ts").EvidenceBundle;
  recorded: import("../intelligence/briefing.ts").Briefing;
  generatedAt: number;
}

export interface AIConfig { endpoint: string; model: string; }
export interface SavedAccessSummary { name: string; path: string; scope: ReadScope; projectsFolder: string; ai: { endpoint: string; model: string; embeddingModel: string }; savedAt: string; }
export interface SavedAccessStatus { saved: SavedAccessSummary | null; warning: string; }
export interface ContinuedAccess { vault: VaultInfo; projectsFolder: string; ai: { endpoint: string; model: string; embeddingModel: string }; }
export interface PreparedResume extends RecordedSnapshot { briefingId: string; }
export interface AIInterpretation {
  briefingId: string; revision: number; generation: number; model: string; generatedAt: number;
  interpretations: import("../intelligence/briefing.ts").Claim[];
  nextActions: import("../intelligence/briefing.ts").Claim[];
  modelGaps: string[];
}

export interface AskRequest {
  question: string; selection: ProjectRequest; scope: "project" | "vault";
  filters: import("../retrieval/search.ts").SearchFilters;
  method: "keyword" | "hybrid"; embeddingModel: string; level: import("../retrieval/budget.ts").SearchLevel;
}
export interface AskSnapshot {
  id: string; request: AskRequest; index: IndexSnapshot; bundle: import("../vault/evidence.ts").EvidenceBundle; history: { question: string; answer: import("../intelligence/answer.ts").Answer; corrections: import("../vault/answer-record.ts").ClaimCorrections }[];
}
export interface AskContext { id: string; retrievalId: string; bundle: import("../vault/evidence.ts").EvidenceBundle; conversation: import("../intelligence/conversation.ts").ConversationContext; }
export interface AskAnswer { id: string; turnNumber: number; corrections: import("../vault/answer-record.ts").ClaimCorrections; contextId: string; answer: import("../intelligence/answer.ts").Answer; model: string; generatedAt: number; }

export interface CollectionChoices { choices: Record<string, import("../vault/workbench.ts").EvidenceChoice>; confirmed: number[]; }
export interface CollectionHandoff { snapshot: AskSnapshot; context: AskContext; choices: Record<string, import("../vault/workbench.ts").EvidenceChoice>; }
