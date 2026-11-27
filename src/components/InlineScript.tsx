"use client";

/**
 * An inline <script> that runs while the HTML is parsed, before React starts
 * (the Next.js "preventing flash before hydration" pattern). The server
 * renders it as JavaScript; the client renders it as text, so React does not
 * warn about script tags and never runs it twice. `suppressHydrationWarning`
 * accepts the type difference.
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
