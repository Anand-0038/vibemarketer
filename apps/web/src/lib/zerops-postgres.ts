import { Pool, type PoolClient, type QueryResultRow } from "pg";

const ZEROPS_SCHEMA = `
create table if not exists public.vibemarketer_marketing_state (
  owner_id text primary key,
  data jsonb not null,
  version integer not null default 1 check (version >= 1),
  updated_at timestamptz not null default now()
);

create table if not exists public.vibemarketer_publish_attempts (
  id text primary key,
  owner_id text not null,
  post_id text not null,
  content_revision_key text not null,
  provider text not null check (provider in ('x', 'linkedin', 'reddit', 'other')),
  provider_account_id text not null,
  idempotency_key text not null,
  request_hash text not null,
  status text not null default 'pending' check (
    status in (
      'pending', 'executing', 'provider_succeeded', 'outcome_unknown',
      'retryable_failure', 'permanent_failure', 'published', 'cancelled'
    )
  ),
  provider_post_id text,
  provider_url text,
  provider_response jsonb,
  attempt_count integer not null default 0,
  last_error_code text,
  last_error_message text,
  outcome_unknown boolean not null default false,
  next_retry_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, idempotency_key),
  unique (owner_id, post_id, provider, provider_account_id, content_revision_key)
);

create index if not exists vibemarketer_publish_attempts_owner_status_idx
  on public.vibemarketer_publish_attempts (owner_id, status, updated_at desc);

create table if not exists public.vibemarketer_outbox_jobs (
  id text primary key,
  owner_id text not null,
  attempt_id text not null references public.vibemarketer_publish_attempts(id) on delete cascade,
  job_type text not null check (job_type in ('publish', 'confirm_publish')),
  status text not null default 'pending' check (
    status in ('pending', 'leased', 'completed', 'retryable_failure', 'dead_letter', 'cancelled')
  ),
  available_at timestamptz not null default now(),
  lease_owner text,
  lease_expires_at timestamptz,
  attempt_count integer not null default 0,
  last_error_code text,
  last_error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (attempt_id, job_type)
);

create index if not exists vibemarketer_outbox_runnable_idx
  on public.vibemarketer_outbox_jobs (status, available_at, created_at);
create index if not exists vibemarketer_outbox_attempt_idx
  on public.vibemarketer_outbox_jobs (attempt_id);
`;

let pool: Pool | null = null;
let schemaPromise: Promise<void> | null = null;

export function getZeropsDatabaseUrl(): string | undefined {
  return (
    process.env.DATABASE_URL?.trim() ||
    process.env.db_connectionString?.trim() ||
    undefined
  );
}

export function isZeropsPostgresConfigured(): boolean {
  return Boolean(getZeropsDatabaseUrl());
}

export function getZeropsPool(): Pool {
  if (!pool) {
    const connectionString = getZeropsDatabaseUrl();
    if (!connectionString) {
      throw new Error("DATABASE_URL is required for Zerops PostgreSQL");
    }
    pool = new Pool({
      connectionString,
      max: 8,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      allowExitOnIdle: true,
    });
  }
  return pool;
}

export async function ensureZeropsSchema(): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = getZeropsPool()
      .query(ZEROPS_SCHEMA)
      .then(() => undefined)
      .catch((error) => {
        schemaPromise = null;
        throw error;
      });
  }
  await schemaPromise;
}

export async function zeropsQuery<T = QueryResultRow>(
  text: string,
  values: readonly unknown[] = [],
): Promise<{ rows: T[]; rowCount: number | null }> {
  await ensureZeropsSchema();
  const result = await getZeropsPool().query<QueryResultRow>(
    text,
    values as unknown[],
  );
  return result as unknown as { rows: T[]; rowCount: number | null };
}

export async function withZeropsTransaction<T>(
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  await ensureZeropsSchema();
  const client = await getZeropsPool().connect();
  try {
    await client.query("begin");
    const result = await work(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
