import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { checkRateLimit, clientKeyFromHeaders } from "@/lib/auth/rate-limit";
import { signupErrorMessage, signupOutcome } from "@/lib/auth/errors";
import {
  normalizeEmail,
  validateEmail,
  validatePassword,
} from "@/lib/auth/validation";
import { publicLoginUrl } from "@/lib/auth/redirects";
import { isAuthConfigured, safeNextPath } from "@/lib/supabase/config";
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
} from "@/lib/supabase/config";
import { siteUrl } from "@/lib/site";

export const runtime = "nodejs";

type AuthMode = "login" | "signup";

function textField(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

function redirectToAuth(
  req: NextRequest,
  mode: AuthMode,
  next: string,
  error?: string,
): NextResponse {
  const url = new URL(mode === "signup" ? "/signup" : "/login", req.url);
  url.searchParams.set("next", next);
  if (error) url.searchParams.set("error", error);
  return NextResponse.redirect(url, 303);
}

function redirectToNext(req: NextRequest, next: string): NextResponse {
  return NextResponse.redirect(new URL(next, req.url), 303);
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const requestedMode = textField(form, "mode");
  const mode: AuthMode = requestedMode === "signup" ? "signup" : "login";
  const next = safeNextPath(textField(form, "next"), "/app");

  if (!isAuthConfigured()) {
    return redirectToAuth(req, mode, next, "config");
  }

  const rate = checkRateLimit(
    clientKeyFromHeaders(req.headers, `auth-${mode}`),
    12,
    60_000,
  );
  if (!rate.ok) return redirectToAuth(req, mode, next, "rate_limited");

  const email = textField(form, "email");
  const password = textField(form, "password");
  const emailError = validateEmail(email);
  const passwordError = validatePassword(password);
  if (emailError || passwordError) {
    return redirectToAuth(req, mode, next, "invalid_input");
  }
  if (mode === "signup" && password !== textField(form, "confirm")) {
    return redirectToAuth(req, mode, next, "invalid_input");
  }

  // Create the response before the Supabase client so session cookies are
  // attached to the exact redirect response returned by this route handler.
  const response = redirectToNext(req, next);
  const cookieStore = await cookies();
  const supabase = createServerClient(
    getSupabaseUrl()!,
    getSupabasePublishableKey()!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            try {
              cookieStore.set(name, value, options);
            } catch {
              // The response cookie below is the authoritative path in a
              // Route Handler; the request cookie store can be read-only.
            }
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  if (mode === "login") {
    const { error } = await supabase.auth.signInWithPassword({
      email: normalizeEmail(email),
      password,
    });
    if (error) {
      const code = (error as { code?: string }).code ?? "";
      const message = (error.message || "").toLowerCase();
      return redirectToAuth(
        req,
        mode,
        next,
        code === "email_not_confirmed" || message.includes("email not confirmed")
          ? "unconfirmed"
          : "invalid",
      );
    }
    return response;
  }

  const { data, error } = await supabase.auth.signUp({
    email: normalizeEmail(email),
    password,
    options: {
      emailRedirectTo: `${siteUrl("/auth/callback")}?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) {
    const message = signupErrorMessage(error);
    return redirectToAuth(
      req,
      mode,
      next,
      message.includes("confirmation") ? "confirmation" : "unavailable",
    );
  }

  if (data.session) return response;

  const outcome = signupOutcome({
    hasSession: false,
    identityCount: data.user?.identities?.length,
  });
  if (outcome?.kind === "existing_account") {
    return redirectToAuth(req, mode, next, "existing");
  }
  return redirectToAuth(req, mode, next, "confirmation");
}

export async function GET() {
  return NextResponse.redirect(publicLoginUrl(), 303);
}
