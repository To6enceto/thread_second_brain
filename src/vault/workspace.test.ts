import { test } from "node:test";
import assert from "node:assert/strict";
import { loadRoles } from "../settings/settings.ts";
import { noteName, starterNotes, rejectCollisions, writablePath, frontmatter } from "./workspace.ts";
test("roles do not grant reads and invalid roles fail closed", () => {
  assert.equal(loadRoles({projects:"../Secrets"}).projects, "");
  assert.throws(()=>starterNotes(loadRoles({}),"New",[]));
});
test("starter notes preserve quoted metadata and refuse collisions/exclusions", () => {
  const roles=loadRoles({projects:"Projects",templates:"Templates"});
  const notes=starterNotes(roles,"Example",[],"fixed-id","2026-10-14");
  assert.equal(notes.length,5);assert.match(notes[0]!.content,/id: "fixed-id"/);
  assert.throws(()=>rejectCollisions(notes,p=>p.endsWith("Overview.md")));
  assert.throws(()=>starterNotes(roles,"Example",["Templates"]));
  assert.throws(()=>noteName("../Secrets"));assert.throws(()=>writablePath("ProjectSibling/a.md",["Project"],[]));
  assert.match(frontmatter({title:'a\nstatus: accepted'}),/a\\nstatus/);
});
