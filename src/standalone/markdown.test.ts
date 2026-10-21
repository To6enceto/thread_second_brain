import test from "node:test";
import assert from "node:assert/strict";
import { markdownPreview, sourceHeadingCount } from "./markdown.ts";

test("desktop Markdown preserves hostile markup as text, fences suppress links, and embeds stay literal", () => {
  const parsed = markdownPreview('# Heading\n<script>alert(1)</script>\n![remote](https://bad/img) ![[Embed]]\n[[Other#Details|go]] **strong** `code`\n```html\n[[Not a link]]\n<img src=x>\n```');
  assert.equal(parsed.blocks[0]!.kind, "heading");
  assert.equal(parsed.blocks[1]!.inline[0]!.text, "<script>alert(1)</script>");
  assert.ok(parsed.blocks[2]!.inline.every(part => part.kind === "text"));
  assert.deepEqual(parsed.blocks[3]!.inline[0], { kind: "link", text: "go", target: "Other#Details" });
  assert.equal(parsed.blocks[4]!.kind, "code"); assert.equal(parsed.blocks[4]!.inline.length, 0);
});
test("desktop Markdown has finite preview blocks/characters while source remains separate", () => {
  assert.equal(markdownPreview("---\ntitle: test\n---\n# Objective").blocks[0]!.text, "Objective");
  const many = markdownPreview("paragraph\n".repeat(5000));
  assert.ok(many.limited); assert.ok(many.blocks.length <= 2000);
  const long = markdownPreview("x".repeat(200000));
  assert.ok(long.limited); assert.equal(long.blocks[0]!.text.length, 120000);
});

test("desktop malformed delimiters remain literal within a bounded synchronous preview", () => {
  const started = performance.now();
  for (const source of ["[".repeat(120000), "`" + "x".repeat(119999), "**" + "x".repeat(119998), "[label](" + "[".repeat(119992)]) {
    const preview = markdownPreview(source);
    assert.equal(preview.blocks[0]!.inline.map(part => part.text).join(""), source);
    assert.ok(preview.blocks[0]!.inline.every(part => part.kind === "text"));
  }
  // A generous regression threshold: the previous bracket regex alone took 10s.
  assert.ok(performance.now() - started < 2000, "malformed 120KB sources must not monopolize the UI thread");
  assert.equal(markdownPreview("# Title" + " ".repeat(119990)).blocks[0]!.text, "Title");
  const limited = markdownPreview("`word` ".repeat(6000));
  assert.ok(limited.limited);
  assert.ok(limited.blocks[0]!.inline.filter(part => part.kind === "code").length <= 5000);
});

test("desktop source heading uniqueness includes headings outside the shortened preview", () => {
  const source = "# Repeat\nfirst passage\n" + "padding ".repeat(16000) + "\n# Repeat\nactual searched passage";
  assert.equal(markdownPreview(source).blocks.filter(block => block.kind === "heading").length, 1);
  assert.equal(sourceHeadingCount(source, "Repeat"), 2);
  const manyBlocks = "# Repeat\n" + "paragraph\n".repeat(2200) + "# Repeat\nsecond";
  assert.equal(markdownPreview(manyBlocks).blocks.filter(block => block.kind === "heading").length, 1);
  assert.equal(sourceHeadingCount(manyBlocks, "Repeat"), 2);
  const unique = "# Unique\n" + "padding ".repeat(16000);
  assert.ok(markdownPreview(unique).limited); assert.equal(sourceHeadingCount(unique, "Unique"), 1);
  assert.equal(sourceHeadingCount("# A title ###\nfirst\n```md\n# A title\n```", "a-title"), 1);
  assert.equal(sourceHeadingCount("---\ntitle: x\n# Hidden\n---\n# Visible", "Hidden"), 0);
});
