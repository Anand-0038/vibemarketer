import assert from "node:assert/strict";
import { htmlToText } from "./public-http";

const text = htmlToText(`
  <html><head><style>.hidden { display:none }</style></head>
  <body><h1>Vibe &amp; Marketer</h1><p>Build &lt;real&gt; drafts.</p>
  <script>ignore this</script><ul><li>Human approval</li></ul></body></html>
`);

assert.match(text, /Vibe & Marketer/);
assert.match(text, /Build <real> drafts\./);
assert.match(text, /Human approval/);
assert.doesNotMatch(text, /ignore this|hidden/);
console.log("public HTML text extraction: ok");
