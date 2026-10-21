import type { ProjectHome, HomeItem } from "../vault/project-home.ts";
import type { RecordedSnapshot } from "./contracts.ts";
import { contextCoverageText } from "../vault/evidence.ts";
import { indexCoverageText } from "../vault/index-coverage.ts";

type OpenSource = (path: string, heading: string, hash: string) => void;
function add<K extends keyof HTMLElementTagNameMap>(parent: HTMLElement, tag: K, text = "", className = ""): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag); node.textContent = text; node.className = className; parent.append(node); return node;
}
function chip(parent: HTMLElement, text: string, path: string, heading: string, hash: string, open: OpenSource): void {
  const button = add(parent, "button", text, "thread-source-chip"); button.dataset.sourcePath = path;
  button.addEventListener("click", () => open(path, heading, hash));
}
export function renderHome(parent: HTMLElement, home: ProjectHome, open: OpenSource): void {
  add(parent, "h2", home.project.split("/").at(-1)); add(parent, "p", home.project, "thread-path");
  const group = (title: string, items: HomeItem[], total: number): void => {
    const section = add(parent, "section", "", "thread-project-section");
    add(section, "h3", `${title} (${items.length} of ${total})`);
    if (!items.length) add(section, "p", "No matching records in the current indexed evidence.", "thread-muted");
    for (const item of items) {
      const row = add(section, "div", "", "thread-record-card");
      chip(row, item.path.split("/").at(-1)!.replace(/\.md$/i, ""), item.path, item.heading, item.hash, open);
      add(row, "p", item.text);
    }
  };
  group("Recent sessions", home.sessions, home.counts.sessions);
  group("Decisions", home.decisions, home.counts.decisions);
  group("Open questions", home.questions, home.counts.questions);
  add(parent, "p", "Dates describe records, not verified events. Counts cover current eligible indexed records; omitted or stale notes may contain more. Plugin pending reviews are not loaded.", "thread-muted");
}
export function renderRecorded(parent: HTMLElement, result: RecordedSnapshot, open: OpenSource): void {
  add(parent, "h2", result.home!.project.split("/").at(-1));
  add(parent, "p", result.home!.project, "thread-path");
  const card = add(parent, "section", "", "thread-recorded-card");
  add(card, "h2", "Recorded context");
  add(card, "p", `Prepared ${new Date(result.generatedAt).toLocaleString()}. From your notes; no AI generation.`, "thread-muted");
  const labels = { objective: "Objective", lastActivity: "Last recorded activity", decisions: "Recorded decisions", openQuestions: "Open questions", newEvidence: "New evidence" } as const;
  for (const key of Object.keys(labels) as (keyof typeof labels)[]) {
    const section = add(card, "section", "", "thread-project-section"); add(section, "h3", labels[key], "thread-eyebrow");
    const claims = result.recorded.sections[key];
    if (!claims.length) add(section, "p", key === "newEvidence" && !result.bundle.baseline ? "No comparison baseline yet." : "Not established in the available evidence.", "thread-muted");
    for (const claim of claims) {
      const item = add(section, "div", "", "thread-recorded-claim");
      add(item, "p", claim.text, key === "objective" ? "thread-objective" : "");
      for (const id of claim.sourceIds) {
        const source = result.bundle.sources.find(s => s.id === id)!;
        chip(item, `${id} ${source.path.split("/").at(-1)} > ${source.heading || source.property || "Note"}`, source.path, source.heading, result.bundle.noteHashes[source.path]!, open);
        const details = add(item, "details"); add(details, "summary", "Supporting excerpt"); add(details, "p", source.excerpt);
        add(details, "p", `${source.recordedDate} (${source.dateBasis}); dates describe records.`, "thread-muted");
      }
    }
  }
  add(card, "h3", "Evidence gaps and limits");
  const gaps = add(card, "ul", "", "thread-muted"); for (const gap of result.recorded.gaps) add(gaps, "li", gap);
  add(card, "p", contextCoverageText(result.bundle), "thread-muted");
  add(card, "p", indexCoverageText(result.index.coverage), "thread-muted");
  if (result.index.listing.identityIncomplete) add(card, "p", "Markdown enumeration is incomplete; unknown additional notes may be missing. Stable-ID-dependent outputs are withheld.", "thread-muted");
  const sources = add(card, "details"); add(sources, "summary", `Evidence used (${result.bundle.sources.length} passages)`);
  for (const source of result.bundle.sources) {
    chip(sources, `${source.id} ${source.path} > ${source.heading || source.property || "Note"}`, source.path, source.heading, result.bundle.noteHashes[source.path]!, open);
    add(sources, "p", source.excerpt);
  }
}
