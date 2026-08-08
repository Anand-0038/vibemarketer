export function authErrorMessage(code: string | undefined): string | undefined {
  switch (code) {
    case "invalid":
      return "The email or password details are invalid. Check them and try again.";
    case "unconfirmed":
      return "This account still needs email confirmation. If no message arrives, email delivery is not configured for this deployment; use a different address or ask the owner to configure SMTP.";
    case "confirmation":
      return "This account still needs email confirmation. If no message arrives, email delivery is not configured for this deployment; use a different address or ask the owner to configure SMTP.";
    case "existing":
      return "An account already exists for this email. Sign in instead, or use a different address.";
    case "rate_limited":
      return "Too many attempts. Try again later.";
    case "config":
      return "Sign-in is temporarily unavailable. Please try again later.";
    case "unavailable":
      return "Email sign-up is temporarily unavailable. Please try again later.";
    case "invalid_input":
      return "Check the email and password details, then try again.";
    default:
      return code ? "Authentication failed. Try again." : undefined;
  }
}
