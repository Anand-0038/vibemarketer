import {
  completeJsonDetailed,
  discoverThenScrapeMarkdown,
  fetchPublicText,
  htmlToText,
  isSupermemoryConfigured,
  syncBrandMemory,
  tavilySearch,
  UNTRUSTED_SCRAPE_SYSTEM,
  validatePublicHttpUrl,
  wrapUntrustedScrapedData,
  type BrandFact,
} from "@vibe/engine";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import {
  currentOwnerId,
  toBrandMemoryInput,
} from "@/lib/brand-memory-context";
import {
  checkMarketingExpensiveLimit,
  recordGeneration,
} from "@/lib/marketing-approve";
import { getMarketingStore, type BrandContext } from "@/lib/marketing-store";
import { zeropsBrandMemoryMeta } from "@/lib/marketing-memory";
import { normalizeHttpUrl } from "@/lib/url";
import { withMarketingStore } from "@/lib/with-marketing";

export const runtime = "nodejs";
export const maxDuration = 60;

function factId(parts: Array<string | null | undefined>): string {
  return createHash("sha1")
    .update(parts.filter(Boolean).join("|").toLowerCase())
    .digest("hex")
    .slice(0, 16);
}

function normalizeConfidence(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(1, value));
}

function normalizeExtractedFacts(
  raw: unknown,
  evidenceUrl: string,
  source: BrandFact["source"],
): BrandFact[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item): BrandFact | null => {
      if (!item || typeof item !== "object") return null;
      const obj = item as Record<string, unknown>;
      const label = String(obj.label || obj.claim_type || "").trim();
      const value = String(obj.value || obj.claim || "").trim();
      if (!label || !value) return null;
      return {
        id: factId([source, evidenceUrl, label, value]),
        label: label.slice(0, 80),
        value: value.slice(0, 500),
        source,
        evidence_url: evidenceUrl,
        confidence: normalizeConfidence(obj.confidence),
        status: "pending",
        note: "Extracted from the submitted site; verify before treating as durable truth.",
      };
    })
    .filter((fact): fact is BrandFact => Boolean(fact))
    .slice(0, 24);
}

async function researchBrandFacts(brand: {
  name: string;
  url: string;
  oneliner: string;
  competitors?: string[];
}): Promise<{ facts: BrandFact[]; ok: boolean; error?: string }> {
  const host = (() => {
    try {
      return new URL(brand.url).hostname.replace(/^www\./, "");
    } catch {
      return brand.url;
    }
  })();
  const queries = [
    `"${brand.name}" ${host} product`,
    `"${brand.name}" competitors alternatives`,
    `"${brand.name}" ${brand.oneliner}`,
  ];
  const facts: BrandFact[] = [];
  let lastError: string | undefined;
  for (const query of queries) {
    const result = await tavilySearch(query, {
      maxResults: 3,
      searchDepth: "basic",
    });
    if (!result.ok) {
      lastError = result.error;
      continue;
    }
    for (const hit of result.results) {
      if (!hit.url || hit.url.includes("vibemarketer.fun")) continue;
      facts.push({
        id: factId(["tavily", query, hit.url, hit.title]),
        label: "web_research",
        value: `${hit.title}: ${hit.content}`.slice(0, 500),
        source: "tavily",
        evidence_url: hit.url,
        confidence: hit.score ?? null,
        status: "pending",
        note: `Relevant web search: ${query}`,
      });
    }
  }
  const deduped = Array.from(new Map(facts.map((f) => [f.id, f])).values());
  return { facts: deduped.slice(0, 12), ok: deduped.length > 0, error: lastError };
}

export async function GET() {
  return withMarketingStore(async () => {
    const store = getMarketingStore();
    const brand = await store.getBrand();
    return NextResponse.json({ brand });
  });
}

/**
 * POST { url } — Firecrawl map→markdown followed by a live structured model extraction.
 * Never runs Firecrawl JSON extract here (wallet protection).
 * Bare domains (kaggleingest.com) are accepted.
 */
export async function POST(req: Request) {
  return withMarketingStore(async () => {
  try {
    const limited = await checkMarketingExpensiveLimit(
      currentOwnerId(),
      "brand",
    );
    if (!limited.ok) return limited.response;

    const body = (await req.json()) as { url?: string };
    const url = normalizeHttpUrl(String(body.url || ""));
    if (!url) {
      return NextResponse.json(
        { error: "url required (e.g. https://example.com or example.com)" },
        { status: 400 },
      );
    }

    // Validate before Firecrawl receives the URL. Firecrawl performs its own
    // outbound fetch, so local direct-fetch SSRF checks are not sufficient.
    const publicUrl = await validatePublicHttpUrl(url);
    if (!publicUrl.ok) {
      return NextResponse.json(
        {
          error:
            "The product URL must resolve to a public HTTP(S) host. Private, local, credentialed, and non-standard-port URLs are not allowed.",
          error_code: publicUrl.errorCode,
        },
        { status: 400 },
      );
    }

    const disc = await discoverThenScrapeMarkdown(publicUrl.url);
    let sourceText = disc.markdown;
    let extractionProvider: "firecrawl" | "direct_http" = "firecrawl";
    let primaryUrl = disc.primaryUrl || url;

    // Firecrawl is a richer optional extractor. The core product remains
    // usable with the existing SSRF-safe public fetcher and real OpenAI
    // extraction, while the source and limitation stay visible in the UI.
    if (!sourceText) {
      const direct = await fetchPublicText(url);
      const readable = direct.ok ? htmlToText(direct.text) : "";
      if (!direct.ok || readable.length < 120) {
        return NextResponse.json(
          {
            error:
              direct.error ||
              "Could not read enough public text from the target URL. Check the URL and retry.",
            extraction: "direct_http",
          },
          { status: 502 },
        );
      }
      sourceText = readable;
      extractionProvider = "direct_http";
      primaryUrl = direct.url || url;
    }

    const schema = `{
  "name": string,
  "oneliner": string,
  "description": string,
  "icp": string,
  "tone": string,
  "pillars": [string, string, string],
  "competitors": string[],
  "facts": [
    {
      "label": string,
      "value": string,
      "confidence": number
    }
  ]
}`;
    const extracted = await completeJsonDetailed(
      `${wrapUntrustedScrapedData(sourceText)}\n\nExtract a concise, evidence-grounded brand profile for ${primaryUrl}. Include a 2–4 sentence product description for a CMO dashboard, up to 5 competitor domains/names if mentioned, and 5–12 concrete brand facts visible in the source. Do not invent customers, traction, integrations, or claims not present in the source.`,
      schema,
      { system: `${UNTRUSTED_SCRAPE_SYSTEM}\nReturn JSON only matching the schema.` },
    );
    if (!extracted.ok || !extracted.data || typeof extracted.data !== "object") {
      return NextResponse.json(
        { error: `Live model extraction failed: ${extracted.ok ? "invalid model output" : extracted.error}` },
        { status: 502 },
      );
    }
    const profile = extracted.data as Partial<BrandContext>;
    const pillars = Array.isArray(profile.pillars)
      ? profile.pillars.filter((p): p is string => typeof p === "string" && p.trim().length > 0).slice(0, 6)
      : [];
    if (
      typeof profile.name !== "string" || !profile.name.trim() ||
      typeof profile.oneliner !== "string" || !profile.oneliner.trim() ||
      typeof profile.icp !== "string" || !profile.icp.trim() ||
      typeof profile.tone !== "string" || !profile.tone.trim() ||
      pillars.length === 0
    ) {
      return NextResponse.json(
        { error: "Live model extraction returned an incomplete brand profile." },
        { status: 502 },
      );
    }
    const competitors = Array.isArray(
      (profile as { competitors?: unknown }).competitors,
    )
      ? ((profile as { competitors: unknown[] }).competitors
          .map(String)
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 8) as string[])
      : [];
    const descriptionRaw = (profile as { description?: unknown }).description;
    const description =
      typeof descriptionRaw === "string" && descriptionRaw.trim()
        ? descriptionRaw.trim().slice(0, 1200)
        : profile.oneliner.trim();
    const extractedFacts = normalizeExtractedFacts(
      (profile as { facts?: unknown }).facts,
      primaryUrl,
      extractionProvider,
    );
    const draft = {
      url: primaryUrl,
      name: profile.name.trim(),
      oneliner: profile.oneliner.trim(),
      description,
      icp: profile.icp.trim(),
      tone: profile.tone.trim(),
      pillars,
      competitors: competitors.length ? competitors : undefined,
    };
    const research = await researchBrandFacts(draft);
    const facts = [
      ...extractedFacts,
      ...research.facts.filter(
        (fact) => !extractedFacts.some((existing) => existing.id === fact.id),
      ),
    ].slice(0, 40);

    const ownerId = currentOwnerId();
    const memory = isSupermemoryConfigured()
      ? await syncBrandMemory(
          toBrandMemoryInput({ ...draft, facts }, { markdown: sourceText }),
          { ownerId },
        )
      : null;
    if (memory && (!memory.factsOk || !memory.documentOk)) {
      const failedLayers = [
        !memory.factsOk ? "semantic facts" : null,
        !memory.documentOk ? "site document" : null,
      ].filter(Boolean).join(" and ");
      return NextResponse.json(
        {
          error: `Live Supermemory sync failed for ${failedLayers}: ${memory.error || "indexing was not confirmed"}`,
          supermemory: memory,
        },
        { status: 502 },
      );
    }
    const store = getMarketingStore();
    const memoryMeta = memory
      ? {
          provider: "supermemory" as const,
          container_tag: memory.containerTag,
          last_synced_at: new Date().toISOString(),
          fact_count: memory.factCount,
        }
      : zeropsBrandMemoryMeta({
          ownerId,
          brandName: draft.name,
          factCount: facts.length,
        });
    const brand = await store.setBrand({
      ...draft,
      facts,
      memory: memoryMeta,
    });

    const meter = await recordGeneration("brand");

    return NextResponse.json({
      brand,
      firecrawl: extractionProvider === "firecrawl",
      extraction: { provider: extractionProvider },
      primaryUrl,
      mappedTargets: disc.targets.slice(0, 6),
      creditsHint: disc.creditsHint,
      research: {
        provider: "tavily",
        ok: research.ok,
        fact_count: research.facts.length,
        error: research.error,
      },
      facts: {
        pending: facts.filter((fact) => fact.status === "pending").length,
        verified: facts.filter((fact) => fact.status === "verified").length,
        rejected: facts.filter((fact) => fact.status === "rejected").length,
      },
      supermemory: memory,
      meter: { used: meter.used, limit: meter.limit, remaining: meter.remaining },
      architecture: {
        source_of_truth: "marketing_state.brand",
        retrieval: memory ? "supermemory" : "zerops_postgres",
        container: memoryMeta.container_tag,
        layers: memory?.layers ?? { core: 7, semantic: facts.length },
      },
      note: memory
        ? `Brand SoT saved + retrieval index synced (${memory.factCount} semantic facts → ${memory.containerTag}).`
        : `Brand SoT saved in Zerops PostgreSQL (${facts.length} evidence-backed facts; direct public HTTP extraction). Supermemory is optional enrichment.`,
    });
  } catch (e) {
    const { reportError } = await import("@/lib/errors");
    await reportError("api/brand", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "brand extract failed" },
      { status: 500 },
    );
  }
  });
}
