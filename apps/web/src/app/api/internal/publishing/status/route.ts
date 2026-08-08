import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin, hasSupabaseAdmin } from "@/lib/supabase-admin";
import { authorizeWorkerRequest } from "@/lib/internal-worker-auth";
import { MarketingStoreError } from "@/lib/marketing-store";
import {
  isZeropsPostgresConfigured,
  zeropsQuery,
} from "@/lib/zerops-postgres";
import {
  summarizePublishingStatus,
  type PublishingAttemptStatusRow,
  type PublishingOutboxStatusRow,
} from "@/lib/publishing/status-summary";

export const runtime = "nodejs";

function unauthorized(message: string, status = 401) {
  return NextResponse.json({ error: message }, { status });
}

function ensureDb() {
  const sb = getSupabaseAdmin();
  if (!hasSupabaseAdmin() || !sb) {
    throw new MarketingStoreError("Supabase admin unavailable", "UNAVAILABLE", 503);
  }
  return sb;
}

function usesZeropsPostgres(): boolean {
  const forced = process.env.MARKETING_STORE_BACKEND?.trim().toLowerCase();
  if (forced === "zerops") {
    if (!isZeropsPostgresConfigured()) {
      throw new MarketingStoreError(
        "MARKETING_STORE_BACKEND=zerops but DATABASE_URL is missing",
        "MISCONFIGURED",
        503,
      );
    }
    return true;
  }
  if (forced === "supabase" || forced === "local") return false;

  const isZeropsRuntime =
    process.env.ZEROPS === "1" || process.env.ZEROPS_ENV === "production";
  if (!isZeropsRuntime) return false;
  if (!isZeropsPostgresConfigured()) {
    throw new MarketingStoreError(
      "Zerops production requires DATABASE_URL for publishing status",
      "MISCONFIGURED",
      503,
    );
  }
  return true;
}

type StatusRows = {
  attempts: PublishingAttemptStatusRow[];
  jobs: PublishingOutboxStatusRow[];
};

async function readZeropsRows(): Promise<StatusRows> {
  const [attempts, jobs] = await Promise.all([
    zeropsQuery<PublishingAttemptStatusRow>(
      `select provider, status, created_at::text, updated_at::text
         from public.vibemarketer_publish_attempts
        order by updated_at desc
        limit 5000`,
    ),
    zeropsQuery<PublishingOutboxStatusRow>(
      `select status, created_at::text, updated_at::text,
              lease_owner, lease_expires_at::text
         from public.vibemarketer_outbox_jobs
        order by updated_at desc
        limit 5000`,
    ),
  ]);

  return { attempts: attempts.rows, jobs: jobs.rows };
}

async function readSupabaseRows(): Promise<StatusRows> {
  const sb = ensureDb();
  const attemptsRows = (await sb
    .from("marketing_publish_attempts")
    .select("provider,status,created_at,updated_at")
    .order("updated_at", { ascending: false })
    .limit(5000)) as {
    data: PublishingAttemptStatusRow[];
    error: { message?: string } | null;
  };

  if (attemptsRows.error) {
    throw new MarketingStoreError(
      `attempts query failed: ${attemptsRows.error.message ?? "db error"}`,
      "UNAVAILABLE",
      503,
    );
  }

  const outboxRows = (await sb
    .from("marketing_outbox_jobs")
    .select("status,created_at,updated_at,lease_owner,lease_expires_at")
    .order("updated_at", { ascending: false })
    .limit(5000)) as {
    data: PublishingOutboxStatusRow[];
    error: { message?: string } | null;
  };

  if (outboxRows.error) {
    throw new MarketingStoreError(
      `outbox query failed: ${outboxRows.error.message ?? "db error"}`,
      "UNAVAILABLE",
      503,
    );
  }

  return {
    attempts: attemptsRows.data ?? [],
    jobs: outboxRows.data ?? [],
  };
}

export async function GET(req: Request) {
  const authorization = authorizeWorkerRequest(
    req,
    "internal",
    process.env.INTERNAL_WORKER_SECRET,
  );
  if (!authorization.ok) {
    return unauthorized(authorization.error, authorization.status);
  }

  try {
    const rows = usesZeropsPostgres()
      ? await readZeropsRows()
      : await readSupabaseRows();
    const summary = summarizePublishingStatus(rows.attempts, rows.jobs);

    const response = {
      generated_at: new Date().toISOString(),
      ...summary,
      report_id: `ops-${randomUUID()}`,
    };

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof MarketingStoreError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = error instanceof Error ? error.message : "Unknown worker status error";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
