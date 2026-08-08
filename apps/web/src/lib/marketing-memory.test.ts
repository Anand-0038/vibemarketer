import assert from "node:assert/strict";
import {
  hasStructuredBrandMemory,
  memoryProviderFor,
  zeropsBrandMemoryMeta,
} from "./marketing-memory";

const brand = {
  url: "https://example.com",
  name: "Example",
  oneliner: "A real product",
  icp: "builders",
  tone: "direct",
  pillars: ["shipping"],
  updated_at: new Date(0).toISOString(),
};

assert.equal(hasStructuredBrandMemory(brand), false);
assert.equal(memoryProviderFor(brand, false), null);

const meta = zeropsBrandMemoryMeta({
  ownerId: "user-123456789",
  brandName: "Example Product",
  factCount: 7.8,
});
const ready = { ...brand, memory: meta };
assert.equal(hasStructuredBrandMemory(ready), true);
assert.equal(memoryProviderFor(ready, false), "zerops_postgres");
assert.equal(memoryProviderFor(ready, true), "supermemory");
assert.equal(meta.provider, "zerops_postgres");
assert.equal(meta.fact_count, 7);
assert.match(meta.container_tag, /^zerops_pg:user-1234567:brand_example_product$/);

console.log("marketing memory backend: ok");
