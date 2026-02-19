export function deriveTitle(html: string): string {
  if (!html) return "Untitled";

  // Try to extract first heading text
  const headingMatch = html.match(/<h[12][^>]*>(.*?)<\/h[12]>/i);
  if (headingMatch) {
    const text = headingMatch[1].replace(/<[^>]*>/g, "").trim();
    if (text) return text.slice(0, 80);
  }

  // Fall back to first 80 chars of text content
  const text = html.replace(/<[^>]*>/g, "").trim();
  if (text) return text.slice(0, 80);

  return "Untitled";
}
