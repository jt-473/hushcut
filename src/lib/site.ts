/**
 * Canonical site URL. Set NEXT_PUBLIC_SITE_URL in Vercel once your domain is
 * live (e.g. https://hushcut.app) so sitemap, robots, and OG tags use it.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://hush-cut.com"
).replace(/\/$/, "");
