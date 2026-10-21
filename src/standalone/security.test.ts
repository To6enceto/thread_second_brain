import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { assetAllowed, DesktopError, publicFailure, relativePath, scopeInput, trustedSender } from "./security.ts";

test("desktop validates IPC scopes without silently expanding permissions", () => {
  for (const value of [null, [], {}, { roots: ["."], excluded: [], extra: true }, { roots: Array(33).fill("Projects"), excluded: [] }, { roots: ["../Private"], excluded: [] }, { roots: [".obsidian"], excluded: [] }]) assert.throws(() => scopeInput(value));
  assert.deepEqual(scopeInput({ roots: ["Projects", "Projects"], excluded: ["Projects/Private"] }), { roots: ["Projects"], excluded: ["Projects/Private"] });
  for (const path of ["", "a//b", "a/../b", "/a", "a\\b", "a\0b", "a\nb", "a/.git/b", "a/ b", "x".repeat(513)]) assert.throws(() => relativePath(path));
  assert.equal(relativePath("Projects/Наука/Overview.md"), "Projects/Наука/Overview.md");
});

test("desktop sender and fixed asset policy reject remote/file leaks, frames and URL variants", () => {
  const entry = "/app/app.html", url = pathToFileURL(entry).href;
  assert.equal(trustedSender(1, 1, url, true, entry), true);
  assert.equal(trustedSender(2, 1, url, true, entry), false);
  assert.equal(trustedSender(1, 1, url, false, entry), false);
  for (const foreign of ["https://example.invalid", "file:///etc/passwd", `${url}?x`, `${url}#x`]) {
    assert.equal(trustedSender(1, 1, foreign, true, entry), false);
    assert.equal(assetAllowed(foreign, [entry]), false);
  }
  assert.equal(assetAllowed(url, [entry]), true);
  assert.equal(publicFailure(new Error("raw OS content or secret" )).includes("secret"), false);
  assert.equal(publicFailure(new DesktopError("Refresh scope.")), "Refresh scope.");
});

test("desktop renderer document disallows script injection and external assets", async () => {
  const html = await readFile(new URL("./app.html", import.meta.url), "utf8");
  assert.match(html, /default-src 'none'/); assert.match(html, /connect-src 'none'/);
  assert.match(html, /object-src 'none'/); assert.match(html, /frame-src 'none'/);
  assert.doesNotMatch(html, /<script[^>]*>[^<\s]/);
  assert.doesNotMatch(html, /(?:src|href)="https?:/);
  assert.match(html, /role="status" aria-live="polite"/);
});
