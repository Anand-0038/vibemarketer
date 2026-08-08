import assert from "node:assert/strict";
import { signupErrorMessage, signupOutcome } from "./errors";

assert.equal(
  signupOutcome({ hasSession: true }),
  undefined,
);
assert.deepEqual(
  signupOutcome({ hasSession: false, identityCount: 0 }),
  {
    kind: "existing_account",
    message:
      "An account already exists for this email. Sign in instead, or use a different address.",
  },
);
assert.deepEqual(
  signupOutcome({ hasSession: false, identityCount: 1 }),
  {
    kind: "confirmation",
    message: "Check your email to confirm your account, then sign in.",
  },
);

assert.match(
  signupErrorMessage({ code: "redirect_to_not_allowed" }),
  /confirmation is temporarily misconfigured/,
);
assert.match(
  signupErrorMessage({ code: "over_email_send_rate_limit" }),
  /temporarily rate-limited/,
);
assert.match(
  signupErrorMessage({ message: "Email provider is disabled" }),
  /temporarily unavailable/,
);
assert.equal(
  signupErrorMessage({ code: "user_already_exists" }),
  "Could not create account. Try again or sign in.",
);

console.log("auth signup error mapping: ok");
