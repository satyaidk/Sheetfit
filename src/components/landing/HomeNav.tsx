"use client";

/**
 * Home page navigation. Transparent over the dark hero; once the page
 * scrolls it becomes a blurred ink bar, and a thin CMY bar along its bottom
 * edge shows how far down the page the reader is. On small screens the links
 * fold into a menu; "Start designing" stays visible at every width.
 */

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "#why", label: "Why Sheetfit" },
  { href: "#how", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#faq", label: "FAQ" },
];

function subscribeScroll(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  window.addEventListener("resize", onChange);
  return () => {
    window.removeEventListener("scroll", onChange);
    window.removeEventListener("resize", onChange);
  };
}

/** Scroll position in 1/1000ths of the page, so the snapshot is a stable number. */
function progressSnapshot() {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  return max > 0 ? Math.round((window.scrollY / max) * 1000) : 0;
}

export function HomeNav() {
  const scrolled = useSyncExternalStore(subscribeScroll, () => window.scrollY > 12, () => false);
  const progress = useSyncExternalStore(subscribeScroll, progressSnapshot, () => 0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const solid = scrolled || open;
  return (
    <header
      data-scrolled={solid}
      className="fixed inset-x-0 top-0 z-50 text-white transition-[background-color,box-shadow] duration-300 data-[scrolled=true]:bg-night/85 data-[scrolled=true]:shadow-[0_1px_0_rgb(255_255_255/0.08)] data-[scrolled=true]:backdrop-blur-xl"
    >
      <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5 rounded-md">
          <Logo className="size-8" />
          <span className="home-display text-[20px] tracking-[-0.02em]">Sheetfit</span>
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 text-[14.5px] lg:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="rounded-full px-4 py-2 text-white/75 transition-colors hover:bg-white/10 hover:text-white">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/editor"
            className="rounded-full bg-white px-5 py-2.5 text-[14.5px] font-semibold text-night transition-[transform,background-color] duration-200 hover:bg-white/90 active:scale-[0.97]"
          >
            Start designing
          </Link>
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-full hover:bg-white/10 lg:hidden"
            aria-expanded={open}
            aria-controls="home-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      <nav id="home-menu" aria-label="Main" className={cn("border-t border-white/10 px-4 pb-4 lg:hidden", open ? "block" : "hidden")}>
        {LINKS.map((l) => (
          <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="block rounded-lg px-2 py-3.5 text-[17px] font-medium hover:bg-white/10">
            {l.label}
          </a>
        ))}
      </nav>
      <div aria-hidden className="home-inkbar h-[2px] origin-left transition-transform duration-150" style={{ transform: `scaleX(${progress / 1000})` }} />
    </header>
  );
}
