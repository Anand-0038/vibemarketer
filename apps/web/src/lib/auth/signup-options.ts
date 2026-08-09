import { siteUrl } from "@/lib/site";

export type SignupOptions = {
  emailRedirectTo?: string;
};

/**
 * Supabase autoconfirm accounts receive a session immediately. Supplying an
 * email redirect in that mode enables the PKCE signup path, which Supabase
 * does not support with autoconfirm enabled and which also adds an unnecessary
 * verifier cookie to the redirect response.
 *
 * Enable the redirect only when the deployment has email confirmation and a
 * configured callback/SMTP flow.
 */
export function getSignupOptions(
  next: string,
  env: NodeJS.ProcessEnv = process.env,
): SignupOptions {
  if (env.SUPABASE_EMAIL_CONFIRMATION_REQUIRED !== "1") return {};

  return {
    emailRedirectTo: `${siteUrl("/auth/callback")}?next=${encodeURIComponent(next)}`,
  };
}
