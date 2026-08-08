import assert from "node:assert/strict";
import { signupErrorMessage } from "./errors";

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
