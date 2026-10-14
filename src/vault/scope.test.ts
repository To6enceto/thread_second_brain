import { test } from "node:test";
import assert from "node:assert/strict";
import { mayRead, readableText, vaultPath, affectsProject } from "./scope.ts";

test("explicit folder scope denies empty scope, prefix siblings, hidden paths, and traversal", () => {
  const scope = { allowedPaths: ["Projects/App"], excludedPaths: ["Projects/App/Private"] };
  assert.equal(mayRead("Projects/App/note.md", scope), true);
  for (const path of ["Projects/App2/note.md", "Projects/App/Private/note.md", "Projects/App/.secret.md", "Projects/App/../Other/note.md", "/Projects/App/note.md"]) {
    assert.equal(mayRead(path, scope), false, path);
  }
  assert.equal(mayRead("Projects/App/note.md", { allowedPaths: [], excludedPaths: [] }), false);
  assert.equal(readableText("Projects/App/photo.png", scope), false);
  assert.equal(mayRead(" Projects/App/note.md", scope), false);
  assert.equal(mayRead("Projects\\App/note.md", scope), false);
  assert.equal(vaultPath("Projects\\App/"), "Projects/App");
});

test("project and ancestor folder changes invalidate evidence without matching a text extension", () => {
  const scope = { allowedPaths: ["Projects/App"], excludedPaths: [] };
  for (const folder of ["Projects/App", "Projects/App/Sessions", "Projects", "/"]) {
    assert.equal(affectsProject(folder, "Projects/App", scope, true), true, folder);
  }
  assert.equal(affectsProject("Projects/App2", "Projects/App", scope, true), false);
  assert.equal(affectsProject("Other", "Projects/App", scope, true), false);
});
