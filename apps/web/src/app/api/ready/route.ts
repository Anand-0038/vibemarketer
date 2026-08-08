import { NextResponse } from "next/server";
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
} from "@/lib/supabase/config";
import { hasSupabaseAdmin, getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  ensureZeropsSchema,
  getZeropsPool,
  isZeropsPostgresConfigured,
} from "@/lib/zerops-postgres";

export const runtime = "nodejs";

type AuthReadiness = {
  configured: boolean;
  reachable: boolean;
  signupEnabled: boolean;
  confirmationRequired: boolean | null;
};

/**
 * Read only the public Supabase Auth settings needed by the judge smoke.
 * This catches a disabled signup or unavailable Auth service without ever
 * returning the URL, publishable key, or any provider response details.
 */
async function checkAuthReadiness(): Promise<AuthReadiness> {
  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();
  if (!url || !key) {
    return {
      configured: false,
      reachable: false,
      signupEnabled: false,
      confirmationRequired: null,
    };
  }

  try {
    const response = await fetch(`${url}/auth/v1/settings`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) {
      return {
        configured: true,
        reachable: false,
        signupEnabled: false,
        confirmationRequired: null,
      };
    }

    const settings = (await response.json()) as {
      disable_signup?: boolean;
      mailer_autoconfirm?: boolean;
    };
    return {
      configured: true,
      reachable: true,
      signupEnabled: settings.disable_signup !== true,
      confirmationRequired:
        typeof settings.mailer_autoconfirm === "boolean"
          ? !settings.mailer_autoconfirm
          : null,
    };
  } catch {
    return {
      configured: true,
      reachable: false,
      signupEnabled: false,
      confirmationRequired: null,
    };
  }
}

/**
 * GET /api/ready — public liveness for load balancers / uptime.
 * No service-role flags, table lists, or dual-write internals.
 * Deep diagnostics stay behind authenticated /api/health/keys.
 */
export async function GET() {
  const isProd =
    process.env.NODE_ENV === "production" || process.env.VERCEL === "1";
  const forcedBackend = process.env.MARKETING_STORE_BACKEND?.trim().toLowerCase();
  const isZeropsRuntime =
    forcedBackend === "zerops" ||
    process.env.ZEROPS === "1" ||
    process.env.ZEROPS_ENV === "production";

  const auth = await checkAuthReadiness();

  let marketingOk = !isProd;
  if (isZeropsRuntime) {
    if (!isZeropsPostgresConfigured()) {
      marketingOk = false;
    } else {
      try {
        await ensureZeropsSchema();
        await getZeropsPool().query("select 1");
        marketingOk = true;
      } catch {
        marketingOk = false;
      }
    }
  } else if (hasSupabaseAdmin()) {
    try {
      const sb = getSupabaseAdmin()!;
      const { error } = await sb
        .from("marketing_state")
        .select("owner_id")
        .limit(1);
      marketingOk = !error;
    } catch {
      marketingOk = false;
    }
  }

  const ok = isProd ? marketingOk && auth.reachable && auth.signupEnabled : true;

  return NextResponse.json(
    {
      ok,
      product: "vibemarketer",
      status: ok ? "ready" : "degraded",
      auth: {
        configured: auth.configured,
        reachable: auth.reachable,
        signupEnabled: auth.signupEnabled,
        confirmationRequired: auth.confirmationRequired,
      },
      checkedAt: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 },
  );
}
