import assert from "node:assert/strict";
import { getSignupOptions } from "./signup-options";

assert.deepEqual(
  getSignupOptions("/app", { SUPABASE_EMAIL_CONFIRMATION_REQUIRED: "0" }),
  {},
);

const confirmationOptions = getSignupOptions("/app", {
  SUPABASE_EMAIL_CONFIRMATION_REQUIRED: "1",
});
assert.match(
  confirmationOptions.emailRedirectTo ?? "",
  /\/auth\/callback\?next=%2Fapp$/,
);
