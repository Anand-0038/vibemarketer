import assert from "node:assert/strict";
import { parsePublicMaterialsUrl } from "./deck-guards";

assert.equal(
  parsePublicMaterialsUrl("https://example.com/product").hostname,
  "example.com",
);

for (const raw of [
  "http://127.0.0.1/internal",
  "http://[::1]/internal",
  "http://[::ffff:127.0.0.1]/internal",
  "http://192.168.1.10/internal",
]) {
  assert.throws(() => parsePublicMaterialsUrl(raw), /host is not allowed/);
}

assert.throws(
  () => parsePublicMaterialsUrl("https://user:password@example.com/"),
  /credentials/,
);

console.log("deck-guards: ok");
