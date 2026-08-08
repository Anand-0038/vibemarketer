import assert from "node:assert/strict";
import { htmlToText, validatePublicHttpUrl } from "./public-http";

const text = htmlToText(`
  <html><head><style>.hidden { display:none }</style></head>
  <body><h1>Vibe &amp; Marketer</h1><p>Build &lt;real&gt; drafts.</p>
  <script>ignore this</script><ul><li>Human approval</li></ul></body></html>
`);

assert.match(text, /Vibe & Marketer/);
assert.match(text, /Build <real> drafts\./);
assert.match(text, /Human approval/);
assert.doesNotMatch(text, /ignore this|hidden/);

for (const raw of [
  "http://127.0.0.1/internal",
  "http://169.254.169.254/latest/meta-data",
  "https://user:password@example.com/",
  "https://example.com:8080/",
]) {
  const result = await validatePublicHttpUrl(raw);
  assert.equal(result.ok, false, `unsafe URL accepted: ${raw}`);
  if (!result.ok) assert.equal(result.errorCode, "UNSAFE_URL");
}

console.log("public HTML text extraction: ok");
console.log("public URL validation: ok");
