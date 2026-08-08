import { NextResponse } from "next/server";
import { hasSupabaseAdmin, getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  ensureZeropsSchema,
  getZeropsPool,
  isZeropsPostgresConfigured,
} from "@/lib/zerops-postgres";

export const runtime = "nodejs";

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

  const ok = isProd ? marketingOk : true;

  return NextResponse.json(
    {
      ok,
      product: "vibemarketer",
      status: ok ? "ready" : "degraded",
      checkedAt: new Date().toISOString(),
    },
    { status: ok ? 200 : 503 },
  );
}
