import assert from "node:assert/strict";
import { publicLoginUrl } from "./redirects";

const previous = process.env.NEXT_PUBLIC_SITE_URL;
try {
  process.env.NEXT_PUBLIC_SITE_URL = "https://web-2b24-3000.prg1.zerops.app";
  assert.equal(
    publicLoginUrl(),
    "https://web-2b24-3000.prg1.zerops.app/login",
    "auth redirects must use the configured public deployment URL",
  );
  console.log("auth redirects: ok");
} finally {
  if (previous === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = previous;
}
