import { siteUrl } from "@/lib/site";

/** Public auth destinations must not be derived from an internal proxy URL. */
export function publicLoginUrl(): string {
  return siteUrl("/login");
}
