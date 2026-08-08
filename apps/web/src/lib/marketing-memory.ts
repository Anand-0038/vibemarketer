import { brandSlug } from "@vibe/engine";
import type { BrandContext } from "@/lib/marketing-store";

export type MarketingMemoryProvider = "supermemory" | "zerops_postgres";

/** The structured brand in Zerops PostgreSQL is a real, non-vector fallback. */
export function hasStructuredBrandMemory(
  brand: BrandContext | null | undefined,
): boolean {
  return brand?.memory?.provider === "zerops_postgres";
}

export function memoryProviderFor(
  brand: BrandContext | null | undefined,
  supermemoryConfigured: boolean,
): MarketingMemoryProvider | null {
  if (supermemoryConfigured) return "supermemory";
  return hasStructuredBrandMemory(brand) ? "zerops_postgres" : null;
}

export function zeropsBrandMemoryMeta(input: {
  ownerId: string;
  brandName: string;
  factCount: number;
  at?: string;
}): NonNullable<BrandContext["memory"]> {
  const owner = input.ownerId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 12) || "anon";
  return {
    provider: "zerops_postgres",
    container_tag: `zerops_pg:${owner.toLowerCase()}:brand_${brandSlug(input.brandName)}`,
    last_synced_at: input.at ?? new Date().toISOString(),
    fact_count: Math.max(0, Math.floor(input.factCount)),
  };
}
