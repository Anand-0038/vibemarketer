"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import type { BrandContext } from "@/lib/marketing-store";
import { readJsonSafe } from "@/lib/safe-json";
import { normalizeHttpUrl } from "@/lib/url";

type Scorecard = {
  url: string;
  ok: boolean;
  scores: {
    overall: number;
    seo: number;
    geo: number;
    performance: number;
    a11y: number;
    security: number;
  };
  lighthouse_style: {
    performance: number;
    accessibility: number;
    best_practices: number;
    seo: number;
    note: string;
  };
  recommendations: string[];
  checks: Array<{ id: string; label: string; pass: boolean; category: string }>;
};

type Phase = "idle" | "branding" | "drafting" | "ready";

const ONBOARDING_STEPS = [
  { id: "branding", label: "Analyze site" },
  { id: "memory", label: "Save brand memory" },
  { id: "drafting", label: "Draft channels" },
] as const;

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color =
    value >= 80 ? "bg-ok" : value >= 50 ? "bg-accent" : "bg-danger";
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-sm">
        <span className="text-muted">{label}</span>
        <span className="font-mono font-semibold text-ink">{value}</span>
      </div>
      <div
        className="h-2 overflow-hidden bg-line"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
      >
        <div
          className={`h-full ${color}`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const [brand, setBrand] = useState<BrandContext | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [saving, setSaving] = useState(false);
  const [auditBusy, setAuditBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [auditNote, setAuditNote] = useState<string | null>(null);
  const [scorecard, setScorecard] = useState<Scorecard | null>(null);
  const [draftCount, setDraftCount] = useState(0);
  const [draftNote, setDraftNote] = useState<string | null>(null);
  const [productUrl, setProductUrl] = useState("");

  async function runAudit(url?: string) {
    setAuditBusy(true);
    setAuditNote(null);
    try {
      const res = await fetch("/api/marketing/site-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(url ? { url } : {}),
      });
      const data = (await res.json()) as {
        error?: string;
        scorecard?: Scorecard;
      };
      if (!res.ok || !data.scorecard) {
        setAuditNote(
          data.error || "Live site audit is unavailable. Retry when the target site is reachable.",
        );
        return;
      }
      setScorecard(data.scorecard);
    } catch (cause) {
      setAuditNote(
        cause instanceof Error
          ? cause.message
          : "Live site audit is unavailable. Retry when the target site is reachable.",
      );
    } finally {
      setAuditBusy(false);
    }
  }

  async function autoDraft() {
    setPhase("drafting");
    setDraftNote(null);
    try {
      const res = await fetch("/api/marketing/draft", { method: "POST" });
      const data = (await res.json()) as {
        error?: string;
        source?: string;
        posts?: unknown[];
        auto_queued?: number;
      };
      if (!res.ok) {
        throw new Error(data.error || "Draft generation failed");
      }
      const n = Array.isArray(data.posts) ? data.posts.length : 0;
      if (n === 0) {
        throw new Error("Live draft generation returned no drafts");
      }
      setDraftCount(n);
      const aq = data.auto_queued ?? 0;
      setDraftNote(
        aq > 0
          ? `On-brand drafts ready (${data.source ?? "model"}). ${aq} low-risk auto-queued (L2) — not published. You still control the rest.`
          : `On-brand drafts ready (${data.source ?? "model"}). Nothing published — approve in the queue.`,
      );
    } catch (e) {
      setDraftCount(0);
      setDraftNote(
        e instanceof Error
          ? `${e.message} — open Studio to retry drafts.`
          : "Drafts failed — open Studio to retry.",
      );
    } finally {
      setPhase("ready");
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setNote(null);
    setDraftCount(0);
    setDraftNote(null);
    setScorecard(null);
    setAuditNote(null);
    setPhase("branding");
    const url = normalizeHttpUrl(productUrl);
    if (!url) {
      setError("Enter a valid URL (e.g. yourproduct.in or https://…)");
      setSaving(false);
      setPhase("idle");
      return;
    }
    try {
      const scrapeRes = await fetch("/api/brand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const scrape = await readJsonSafe<{
        brand?: BrandContext;
        note?: string;
        error?: string;
      }>(scrapeRes);
      if (scrapeRes.ok && scrape.data?.brand) {
        setBrand(scrape.data.brand);
        setNote(scrape.data.note ?? "Brand memory saved.");
        // Parallel: scorecard (background) + first drafts (wow path)
        void runAudit(url);
        setSaving(false);
        await autoDraft();
        return;
      }
      throw new Error(scrape.data?.error || "Live brand extraction failed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setPhase("idle");
    } finally {
      setSaving(false);
    }
  }

  const busy = saving || phase === "branding" || phase === "drafting";

  function resetOnboarding() {
    setBrand(null);
    setPhase("idle");
    setSaving(false);
    setAuditBusy(false);
    setError(null);
    setNote(null);
    setAuditNote(null);
    setScorecard(null);
    setDraftCount(0);
    setDraftNote(null);
    setProductUrl("");
  }

  return (
    <div className="mx-auto max-w-6xl">
      <header className="flex flex-col gap-6 border-b border-line pb-7 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="section-label mb-3 text-accent">01 / Brand launch</p>
          <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
            Turn your website into a marketing system.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted">
            One URL becomes attributable brand memory and three channel-native
            drafts. Every draft waits for your approval before anything can go
            live.
          </p>
        </div>
        <div className="grid shrink-0 grid-cols-3 border border-line bg-bg-panel text-center">
          {[
            ["01", "Research"],
            ["02", "Remember"],
            ["03", "Draft"],
          ].map(([number, label]) => (
            <div
              key={number}
              className="min-w-20 border-r border-line px-3 py-3 last:border-r-0"
            >
              <span className="block font-mono text-[10px] text-accent">
                {number}
              </span>
              <span className="mt-0.5 block text-xs text-muted">{label}</span>
            </div>
          ))}
        </div>
      </header>

      {!brand ? (
        <form
          onSubmit={onSubmit}
          className="panel mt-8 max-w-4xl border-accent/30 p-5 shadow-[5px_5px_0_var(--line)] sm:p-7"
        >
          <label
            htmlFor="url"
            className="font-display text-lg font-semibold text-ink"
          >
            What are you marketing?
          </label>
          <p className="mt-1 text-sm text-muted">
            Paste a public product homepage. We only save evidence returned by
            live providers.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <input
              id="url"
              type="text"
              inputMode="url"
              required
              disabled={busy}
              value={productUrl}
              onChange={(event) => setProductUrl(event.target.value)}
              className="input-field focus-ring min-h-12 flex-1"
              placeholder="yourproduct.com"
              aria-describedby="url-help"
            />
            <button
              type="submit"
              className="btn-primary focus-ring min-h-12 shrink-0 !px-6"
              disabled={busy}
            >
              {phase === "branding"
                ? "Researching site…"
                : phase === "drafting"
                  ? "Drafting posts…"
                  : saving
                    ? "Working…"
                    : "Build my launch kit →"}
            </button>
          </div>
          <div
            id="url-help"
            className="mt-4 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[10px] uppercase tracking-wider text-muted"
          >
            <span>✓ Live website evidence</span>
            <span>✓ Private brand memory</span>
            <span>✓ Human approval required</span>
          </div>
        </form>
      ) : null}

      {phase !== "idle" ? (
        <ol
          className="mt-6 grid max-w-4xl grid-cols-1 border border-line bg-bg-panel sm:grid-cols-3"
          aria-label="Onboarding progress"
          aria-live="polite"
        >
          {ONBOARDING_STEPS.map((step, index) => {
            const complete =
              step.id === "branding"
                ? Boolean(brand)
                : step.id === "memory"
                  ? Boolean(brand)
                  : phase === "ready" && draftCount > 0;
            const active =
              (step.id === "branding" && phase === "branding") ||
              (step.id === "drafting" && phase === "drafting");
            const failed =
              (step.id === "branding" && Boolean(error)) ||
              (step.id === "drafting" &&
                phase === "ready" &&
                draftCount === 0);
            return (
              <li
                key={step.id}
                aria-current={active ? "step" : undefined}
                className={`flex min-w-0 items-center gap-3 border-b border-line px-4 py-3 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 ${
                  complete
                    ? "bg-ok/10"
                    : failed
                      ? "bg-danger/10"
                      : active
                        ? "bg-accent/10"
                        : ""
                }`}
              >
                <span
                  aria-hidden
                  className={`grid h-8 w-8 shrink-0 place-items-center border font-mono text-xs font-bold ${
                    complete
                      ? "border-ok bg-ok text-bg"
                      : failed
                        ? "border-danger text-danger"
                        : active
                          ? "pulse-step border-accent text-accent"
                          : "border-line text-muted"
                  }`}
                >
                  {complete ? "✓" : failed ? "!" : index + 1}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink">
                    {step.label}
                  </span>
                  <span className="block truncate font-mono text-[9px] uppercase tracking-widest text-muted">
                    {complete
                      ? "Done"
                      : failed
                        ? "Needs retry"
                        : active
                          ? "Working now"
                          : "Waiting"}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      ) : null}

      {error ? (
        <div
          className="mt-5 max-w-4xl border border-danger/50 bg-danger/10 p-4 text-sm text-danger"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      {phase === "drafting" && brand ? (
        <div
          className="panel pulse-loop mt-8 max-w-4xl border-accent/40 p-6"
          role="status"
        >
          <div className="flex items-start gap-4">
            <span
              aria-hidden
              className="grid h-10 w-10 shrink-0 place-items-center bg-accent font-mono font-bold text-[var(--on-accent)]"
            >
              03
            </span>
            <div>
              <p className="section-label mb-1 text-accent">Agents drafting</p>
              <p className="font-display text-xl font-semibold">{brand.name}</p>
              <p className="mt-2 text-sm text-muted">
                Brand memory is locked. Writing X, LinkedIn, and Reddit drafts
                in the product&apos;s voice.
              </p>
              <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-muted">
                Nothing publishes without your approval
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {brand && phase === "ready" ? (
        <section className="mt-8" aria-labelledby="launch-kit-heading">
          <div className="flex flex-col gap-4 border border-ok/50 bg-ok/10 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span
                aria-hidden
                className="grid h-11 w-11 shrink-0 place-items-center bg-ok text-xl font-bold text-bg"
              >
                ✓
              </span>
              <div>
                <p className="section-label text-ok">Launch kit ready</p>
                <h2
                  id="launch-kit-heading"
                  className="mt-1 font-display text-2xl font-bold text-ink"
                >
                  Research complete. Your move.
                </h2>
              </div>
            </div>
            {draftCount > 0 ? (
              <Link
                href="/app/queue?wow=1"
                className="btn-primary focus-ring shrink-0 !px-5 !py-3 text-sm"
              >
                Review {draftCount} draft{draftCount === 1 ? "" : "s"} →
              </Link>
            ) : (
              <button
                type="button"
                className="btn-primary focus-ring shrink-0 !px-5 !py-3 text-sm"
                onClick={() => void autoDraft()}
                disabled={busy}
              >
                Retry draft generation
              </button>
            )}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
            <article className="panel p-5 sm:p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="section-label mb-2">Brand source of truth</p>
                  <h3 className="font-display text-3xl font-bold text-ink">
                    {brand.name}
                  </h3>
                  <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">
                    {brand.oneliner}
                  </p>
                </div>
                <span className="w-fit border border-ok/40 bg-ok/10 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-ok">
                  Persisted
                </span>
              </div>

              <dl className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="border border-line bg-bg-elevated p-4">
                  <dt className="font-mono text-[9px] uppercase tracking-widest text-muted">
                    Ideal customer
                  </dt>
                  <dd className="mt-2 text-sm leading-relaxed text-ink">
                    {brand.icp}
                  </dd>
                </div>
                <div className="border border-line bg-bg-elevated p-4">
                  <dt className="font-mono text-[9px] uppercase tracking-widest text-muted">
                    Voice
                  </dt>
                  <dd className="mt-2 text-sm leading-relaxed text-ink">
                    {brand.tone}
                  </dd>
                </div>
              </dl>

              <div className="mt-5">
                <p className="font-mono text-[9px] uppercase tracking-widest text-muted">
                  Messaging pillars
                </p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {brand.pillars.map((pillar) => (
                    <li
                      key={pillar}
                      className="border border-accent/30 bg-accent/5 px-3 py-1.5 text-xs text-ink"
                    >
                      {pillar}
                    </li>
                  ))}
                </ul>
              </div>

              {note ? (
                <div
                  className="mt-6 border-l-2 border-ok bg-ok/5 px-4 py-3 text-xs leading-relaxed text-muted"
                  role="status"
                >
                  <span className="font-medium text-ok">Evidence saved.</span>{" "}
                  {note}
                </div>
              ) : null}
            </article>

            <aside className="panel flex flex-col border-accent/30 p-5 sm:p-6">
              <p className="section-label text-accent">Approval queue</p>
              <p className="mt-3 font-display text-6xl font-bold leading-none text-ink">
                {draftCount}
              </p>
              <p className="mt-2 text-sm font-medium text-ink">
                channel-native draft{draftCount === 1 ? "" : "s"} waiting
              </p>
              {draftNote ? (
                <p className="mt-3 text-xs leading-relaxed text-muted" role="status">
                  {draftNote}
                </p>
              ) : null}
              <div className="mt-5 border border-line bg-bg-elevated p-3 font-mono text-[10px] uppercase tracking-wider text-muted">
                Human approval gate is active
              </div>
              <div className="mt-5 grid gap-2">
                {draftCount > 0 ? (
                  <Link
                    href="/app/queue?wow=1"
                    className="btn-primary focus-ring w-full !py-3 text-sm"
                  >
                    Open HITL queue →
                  </Link>
                ) : null}
                <Link
                  href="/app/connectors"
                  className="btn-ghost focus-ring w-full !py-2.5 text-sm"
                >
                  Connect publishing channels
                </Link>
              </div>
              <nav
                className="mt-5 grid gap-2 border-t border-line pt-4 text-xs"
                aria-label="Launch kit next steps"
              >
                <Link href="/app/memory" className="text-accent hover:underline">
                  Inspect brand memory
                </Link>
                <Link href="/app/cmo?wow=1" className="text-accent hover:underline">
                  Ask the CMO desk
                </Link>
                <button
                  type="button"
                  className="text-left text-muted hover:text-ink"
                  onClick={resetOnboarding}
                >
                  Analyze another URL
                </button>
              </nav>
            </aside>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-muted">
            <button
              type="button"
              className="btn-ghost focus-ring !px-3 !py-2 text-xs"
              disabled={auditBusy}
              onClick={() => void runAudit(brand.url)}
            >
              {auditBusy ? "Auditing live site…" : "Re-run site audit"}
            </button>
            <span>
              Free plan includes 25 runs. Advanced workflows are on{" "}
              <Link href="/pricing" className="text-accent hover:underline">
                Starter and Growth
              </Link>
              .
            </span>
          </div>
          {auditNote ? (
            <p className="mt-3 text-xs text-warn" role="status">
              Site audit: {auditNote}
            </p>
          ) : null}
        </section>
      ) : null}

      {scorecard ? (
        <section className="panel mt-6 p-5 sm:p-7" aria-labelledby="site-health-heading">
          <div className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="section-label mb-2">Live site intelligence</p>
              <h2
                id="site-health-heading"
                className="font-display text-2xl font-bold text-ink"
              >
                GEO + site health
              </h2>
              <p className="mt-2 max-w-xl text-xs leading-relaxed text-muted">
                Actionable heuristic checks for positioning and discoverability;
                these are not official Google Lighthouse lab measurements.
              </p>
            </div>
            <div className="flex items-baseline gap-2 border border-accent/30 bg-accent/5 px-5 py-3">
              <span className="font-display text-4xl font-bold text-ink">
                {scorecard.scores.overall}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
                / 100 overall
              </span>
            </div>
          </div>

          <div className="mt-6 grid gap-8 lg:grid-cols-2">
            <div>
              <p className="section-label mb-4">Score breakdown</p>
              <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <ScoreBar label="SEO" value={scorecard.scores.seo} />
                <ScoreBar label="GEO / AEO" value={scorecard.scores.geo} />
                <ScoreBar
                  label="Performance*"
                  value={scorecard.lighthouse_style.performance}
                />
                <ScoreBar
                  label="Accessibility*"
                  value={scorecard.lighthouse_style.accessibility}
                />
                <ScoreBar
                  label="Best practices*"
                  value={scorecard.lighthouse_style.best_practices}
                />
                <ScoreBar
                  label="SEO heuristic*"
                  value={scorecard.lighthouse_style.seo}
                />
              </div>
              <p className="mt-4 font-mono text-[9px] uppercase tracking-wider text-muted">
                * Heuristic buckets · {scorecard.lighthouse_style.note}
              </p>
            </div>

            <div>
              <p className="section-label mb-4">Highest-impact fixes</p>
              {scorecard.recommendations.length > 0 ? (
                <ol className="grid gap-2">
                  {scorecard.recommendations.slice(0, 4).map((recommendation, index) => (
                    <li
                      key={recommendation}
                      className="flex gap-3 border border-line bg-bg-elevated p-3 text-sm text-muted"
                    >
                      <span className="font-mono text-xs font-bold text-accent">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span>{recommendation}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="border border-ok/40 bg-ok/10 p-4 text-sm text-ok">
                  Strong baseline — keep shipping.
                </p>
              )}
            </div>
          </div>

          <details className="mt-6 border-t border-line pt-4">
            <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-widest text-muted hover:text-ink">
              View all {scorecard.checks.length} technical checks
            </summary>
            <div className="mt-4 grid gap-2 font-mono text-[10px] text-muted sm:grid-cols-2">
              {scorecard.checks.map((check) => (
                <div
                  key={check.id}
                  className={`border px-3 py-2 ${
                    check.pass
                      ? "border-line bg-bg-elevated"
                      : "border-danger/30 bg-danger/5 text-danger"
                  }`}
                >
                  <span className={check.pass ? "text-ok" : "text-danger"}>
                    {check.pass ? "✓" : "✗"}
                  </span>{" "}
                  [{check.category}] {check.label}
                </div>
              ))}
            </div>
          </details>
        </section>
      ) : null}
    </div>
  );
}
