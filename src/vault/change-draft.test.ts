import { test } from "node:test";
import assert from "node:assert/strict";
import { lineDiff, editableBody, draftContent } from "./change-draft.ts";
test("diff reconstructs exact before/after bytes including CRLF, missing newline, empty and repeated lines",()=>{
 for(const [before,after]of [["","new\n"],["old",""],["a\r\nb\r\n","a\nb\r\n"],["a\nx\na\n","a\na\ny"],["same","same"],["<script>bad</script>\n","<img src=x>\n"]]){
  const diff=lineDiff(before!,after!);assert.equal(diff.lines.filter(l=>l.kind!=="added").map(l=>l.text).join(""),before);assert.equal(diff.lines.filter(l=>l.kind!=="removed").map(l=>l.text).join(""),after);
 }
});
test("large edits use a bounded correct nonminimal comparison",()=>{
 const before=Array.from({length:5000},(_,i)=>`old ${i}\n`).join(""),after=before.replaceAll("old","new"),diff=lineDiff(before,after);
 assert.equal(diff.minimal,false);assert.equal(diff.lines.filter(l=>l.kind!=="added").map(l=>l.text).join(""),before);assert.equal(diff.lines.filter(l=>l.kind!=="removed").map(l=>l.text).join(""),after);
});
test("body drafts preserve exact metadata, BOM and generated provenance",()=>{
 const text='\uFEFF---\r\nid: preserved\r\ntype: concept\r\n---\r\n# Title\r\n<!-- thread:output {"sources":[]} -->\r\nold\r\n<!-- /thread:output -->\r\n';
 const parts=editableBody(text);assert.equal(draftContent(text,parts.body.replace("old","edited")),text.replace("old","edited"));
 assert.throws(()=>draftContent(text,parts.body.replace('"sources":[]','"sources":["fake"]')),/properties/);
 assert.throws(()=>draftContent(text,parts.body.replace('<!-- /thread:output -->\r\n','')),/properties/);
 assert.throws(()=>draftContent("body","---\ntype: source\n---\nbody"),/properties/);
 assert.equal(draftContent("plain","new body"),"new body");
});

test("many short changed lines do not overflow the JavaScript argument stack",()=>{
 const before="a\n".repeat(100000),after="b\n".repeat(100000),diff=lineDiff(before,after);
 assert.equal(diff.lines.length,200000);assert.equal(diff.minimal,false);
});

test("native textarea newline normalization preserves original provenance marker bytes",()=>{
 const original='---\r\ntype: concept\r\n---\r\n<!-- thread:output {"sources":[]} -->\r\nold\r\n<!-- /thread:output -->\r\n';
 const body=editableBody(original).body.replaceAll('\r\n','\n').replace('old','new');
 const revised=draftContent(original,body);
 assert.ok(revised.startsWith('---\r\ntype: concept\r\n---\r\n'));assert.ok(revised.includes('<!-- thread:output {"sources":[]} -->\r\n'));assert.ok(revised.endsWith('<!-- /thread:output -->\r\n'));assert.ok(revised.includes('new\n'));
});
