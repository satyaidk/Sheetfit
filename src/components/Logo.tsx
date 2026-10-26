/**
 * Sheetfit mark: a printer's registration target over a sheet corner.
 * Registration marks are how presses check that layers line up exactly,
 * which is the job this tool does for designs on a page.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect x="1" y="1" width="30" height="30" rx="6" fill="#24493d" />
      <path d="M8 24V8h11l5 5v11z" fill="#fff" />
      <path d="M19 8v5h5" fill="none" stroke="#24493d" strokeWidth="1.2" />
      <circle cx="16" cy="18" r="4" fill="none" stroke="#0079ad" strokeWidth="1.6" />
      <path d="M16 12.5v11M10.5 18h11" stroke="#0079ad" strokeWidth="1.2" />
    </svg>
  );
}
