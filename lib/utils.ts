import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Coerce user-entered text into a safe http(s) URL, or null.
 * "lalucha.pe" becomes "https://lalucha.pe"; "javascript:..." and other
 * schemes are rejected. Use anywhere user-supplied links are rendered.
 */
export function safeHttpUrl(raw: string | null | undefined): string | null {
  const s = raw?.trim();
  if (!s) return null;
  const candidate = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(s) ? s : `https://${s}`;
  try {
    const url = new URL(candidate);
    if (url.protocol === "http:" || url.protocol === "https:") return url.href;
  } catch {
    // not a URL at all
  }
  return null;
}
