import assert from "node:assert/strict";
import { assertProductionSiteUrl } from "./assert-site-url";
import { assertProductionAuthSafe, isAuthBypassed } from "./supabase/config";

const KEYS = [
  "ALLOW_OPEN_APP",
  "AUTH_BYPASS",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NODE_ENV",
  "RENDER",
  "VERCEL_ENV",
  "ZEROPS",
  "ZEROPS_ENV",
] as const;

const original = new Map(KEYS.map((key) => [key, process.env[key]]));

function clearRuntimeEnv(): void {
  for (const key of KEYS) delete process.env[key];
}

function restoreRuntimeEnv(): void {
  for (const key of KEYS) {
    const value = original.get(key);
    if (value === undefined) delete process.env[key];
    else Object.assign(process.env, { [key]: value });
  }
}

try {
  clearRuntimeEnv();
  Object.assign(process.env, { NODE_ENV: "production" });
  process.env.ZEROPS = "1";
  process.env.ALLOW_OPEN_APP = "0";
  process.env.AUTH_BYPASS = "0";

  assert.throws(
    () => assertProductionAuthSafe(),
    /Production requires NEXT_PUBLIC_SUPABASE_URL/,
    "Zerops production must fail closed when Auth is missing",
  );
  assert.equal(
    isAuthBypassed(),
    false,
    "Zerops production must not silently open the app when Auth is missing",
  );

  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://auth.example.test";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable-test-key";
  process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";

  assert.doesNotThrow(
    () => assertProductionAuthSafe(),
    "configured Zerops Auth should pass the Auth guard",
  );
  assert.equal(
    isAuthBypassed(),
    false,
    "configured Zerops Auth must remain behind the normal Auth path",
  );
  assert.throws(
    () => assertProductionSiteUrl(),
    /must not be localhost in production/,
    "Zerops production must reject a localhost public URL",
  );

  process.env.NEXT_PUBLIC_SITE_URL = "https://vibemarketer.example.test";
  assert.doesNotThrow(
    () => assertProductionSiteUrl(),
    "Zerops production should accept an HTTPS public URL",
  );

  console.log("zerops-runtime: ok");
} finally {
  restoreRuntimeEnv();
}
