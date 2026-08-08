type SupabaseAuthErrorLike = {
  code?: string | null;
  message?: string | null;
} | null;

/**
 * Keep provider details out of the browser while making operational failures
 * actionable for the person trying to create an account.
 */
export function signupErrorMessage(error: SupabaseAuthErrorLike): string {
  const code = error?.code?.trim().toLowerCase() || "";
  const message = error?.message?.trim().toLowerCase() || "";

  if (
    code === "redirect_to_not_allowed" ||
    message.includes("redirect") && message.includes("not allowed")
  ) {
    return "Account confirmation is temporarily misconfigured. Please try again shortly.";
  }

  if (
    code === "over_email_send_rate_limit" ||
    message.includes("email rate limit") ||
    message.includes("rate limit") && message.includes("email")
  ) {
    return "Confirmation email delivery is temporarily rate-limited. Try again later or use a different address.";
  }

  if (code === "email_provider_disabled" || message.includes("email provider")) {
    return "Email sign-up is temporarily unavailable. Please try again later.";
  }

  if (code === "signup_disabled" || message.includes("signup is disabled")) {
    return "New account creation is temporarily unavailable.";
  }

  return "Could not create account. Try again or sign in.";
}
