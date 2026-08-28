export type InlineSegment =
  | { type: "text"; text: string }
  | { type: "code"; text: string }
  | { type: "strong"; text: string }
  | { type: "link"; text: string; href: string };

export const assetImageSrc = (storagePath: string, assetId?: string) => {
  // Local storage paths are MinIO object keys — route through the authenticated proxy
  if (assetId && !storagePath.startsWith("http") && !storagePath.startsWith("/")) {
    return `/api/proxy/assets/${assetId}/stream`;
  }
  if (storagePath.startsWith("/")) return storagePath;
  try {
    const url = new URL(storagePath);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
};

export const inlineMarkdown = (text: string): InlineSegment[] => {
  const segments: InlineSegment[] = [];
  const pattern = /(`([^`]+)`|\*\*([^*]+)\*\*|\[([^\]]+)\]\((https:\/\/[^)\s]+)\))/g;
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > cursor) segments.push({ type: "text", text: text.slice(cursor, match.index) });
    if (match[2]) segments.push({ type: "code", text: match[2] });
    else if (match[3]) segments.push({ type: "strong", text: match[3] });
    else if (match[4] && match[5]) segments.push({ type: "link", text: match[4], href: match[5] });
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) segments.push({ type: "text", text: text.slice(cursor) });
  return segments;
};
