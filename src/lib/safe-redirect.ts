/**
 * Only allow post-auth redirects to a path on this origin. Reject protocol
 * relative (`//evil.example`), absolute URLs, backslashes, and control
 * characters so an invitation `next` parameter cannot become an open redirect.
 */
export function safeNextPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  if (value.includes("\\") || /[\u0000-\u001f]/.test(value)) return null;

  try {
    const url = new URL(value, "https://atlasshare.invalid");
    if (url.origin !== "https://atlasshare.invalid") return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}
