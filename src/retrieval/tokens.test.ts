import assert from "node:assert/strict";
import { tokens, tokenSpans } from "./tokens.ts";

for (const [raw, expected] of [
  ["cafe\u0301", ["café"]], ["oﬃce", ["office"]], ["ＢＵＤＧＥＴ", ["budget"]],
  ["¼", ["1", "4"]], ["℀", ["a", "c"]], ["㍿", ["株式会社"]],
  ["가", ["가"]], ["ΟΣ", ["ος"]], ["İstanbul", ["i", "stanbul"]]
] as [string, string[]][]) {
  assert.deepEqual(tokens(raw), expected);
  const spans = tokenSpans(`Before ${raw} after.`).slice(1, -1);
  assert.deepEqual(spans.map(span => span.term), expected);
  for (const span of spans) {
    assert(span.start >= 7 && span.end <= 7 + raw.length);
    assert(tokens(`Before ${raw} after.`.slice(span.start, span.end)).includes(span.term));
  }
}
assert.deepEqual(tokenSpans("cafe\u0301"), [{ term: "café", start: 0, end: 5 }]);
assert.deepEqual(tokenSpans("¼"), [{ term: "1", start: 0, end: 1 }, { term: "4", start: 0, end: 1 }]);
assert.deepEqual(tokenSpans("🔎 e\u0301"), [{ term: "é", start: 3, end: 5 }]);
