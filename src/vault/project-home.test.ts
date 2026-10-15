import assert from "node:assert/strict";
import { defaultSettings } from "../settings/settings.ts";
import { LocalIndex, indexNote } from "./index.ts";
import { permittedProjects, projectHome } from "./project-home.ts";
import type { ChangeProposal } from "./changes.ts";

const settings = { ...defaultSettings(), allowedPaths: ["Projects", "Knowledge"], excludedPaths: ["Projects/Private"], selectedProject: "Projects/Alpha" };
settings.roles.projects = "Projects";
const index = new LocalIndex();
const make = async (path: string, text: string, metadata: Record<string, unknown>, modifiedAt = 1000) => indexNote({ path, text, metadata, modifiedAt }, () => null);
const entries = await Promise.all([
  make("Projects/Alpha/Overview.md", "## Objective\nAlpha", { type: "project", id: "alpha" }),
  make("Projects/Beta/Overview.md", "## Objective\nBeta", { type: "project", id: "beta" }),
  make("Projects/Legacy/Overview.md", "Legacy", {}),
  make("Projects/Private/Overview.md", "Secret", { type: "project" }),
  make("Unshared/Overview.md", "Secret", { type: "project" }),
  make("Projects/Invalid/Overview.md", "<!-- thread:output {broken} -->\nUnknown generated content", { type: "project" }),
  make("Projects/Alpha/A-old.md", "Old report", { type: "session", recorded_on: "2026-10-14" }, 1000),
  make("Projects/Alpha/Z-new.md", "New report", { type: "session", recorded_on: "2026-10-14" }, 2000),
  make("Projects/Alpha/Undated.md", "Undated report", { type: "session" }, 3000),
  make("Projects/Alpha/Choice.md", "## Choice\nLocal", { type: "decision", status: "proposed" }),
  make("Projects/Beta/Session.md", "Other project", { type: "session", recorded_on: "2026-10-15" }),
  make("Projects/Alpha/Stale.md", "## Open questions\nUnusable generated prose", { type: "session", recorded_on: "2026-10-15", thread_sources: "broken" }),
  make("Knowledge/Linked.md", "## Open questions\nWhich timing?", { type: "questions", project: "alpha" })
]);
assert.deepEqual(permittedProjects(index, settings), []);
index.replace(entries, settings);
assert.deepEqual(permittedProjects(index, settings), ["Projects/Alpha", "Projects/Beta", "Projects/Legacy"]);
const snapshot = projectHome(index, settings);
assert.equal(snapshot.sessions[0]?.path, "Projects/Alpha/Z-new.md");
assert.equal(snapshot.sessions[1]?.path, "Projects/Alpha/A-old.md");
assert(snapshot.sessions[2]?.text.includes("event date unknown"));
assert(snapshot.decisions[0]?.text.startsWith("proposed"));
assert.equal(snapshot.questions[0]?.text, "Which timing?");
assert.equal(snapshot.counts.sessions, 3);
assert(snapshot.sessions.every(item => !item.path.includes("Beta")));
const proposal: ChangeProposal = { id: "p", createdAt: "now", status: "pending", context: JSON.stringify({ settings, noteHashes: { "Projects/Alpha/Choice.md": "hash" } }), operations: [{ path: "Knowledge/New.md", before: null, beforeHash: null, after: "Draft", afterHash: "hash" }] };
assert.equal(projectHome(index, settings, proposal).pendingReviews, 1);
assert.equal(projectHome(index, { ...settings, excludedPaths: ["Knowledge"] }, proposal).pendingReviews, 0);
assert.equal(projectHome(index, { ...settings, selectedProject: "Projects/Beta" }, proposal).pendingReviews, 0);
assert.equal(projectHome(index, settings, { ...proposal, context: "broken" }).pendingReviews, 0);
assert.equal(projectHome(index, settings, { ...proposal, context: JSON.stringify({ settings, noteHashes: { "Unshared/Secret.md": "hash" } }) }).pendingReviews, 0);
assert.throws(() => projectHome(index, { ...settings, selectedProject: "Projects/Private" }), /permissions/);
assert(permittedProjects(index, { ...settings, selectedProject: "Knowledge" }).includes("Knowledge")); // Explicit, readable legacy selection.
const empty = new LocalIndex(); empty.replace([], settings);
assert.throws(() => projectHome(empty, settings), /permissions/);
const many = new LocalIndex();
many.replace([...entries, ...await Promise.all(Array.from({ length: 8 }, (_, n) => make(`Projects/Alpha/Extra-${n}.md`, "Session", { type: "session" })))], settings);
assert.equal(projectHome(many, settings).sessions.length, 5);
assert.equal(projectHome(many, settings).counts.sessions, 11);
