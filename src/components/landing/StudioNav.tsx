"use client";

/**
 * Home page navigation: transparent over the hero, a paper bar with a
 * hairline once the page scrolls. On small screens the links fold into a
 * menu button; the "Start designing" action stays visible at every width.
 */

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "#templates", label: "Templates" },
  { href: "#how", label: "How it works" },
  { href: "#features", label: "Features" },
];

function subscribeScroll(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

export function StudioNav() {
  const scrolled = useSyncExternalStore(subscribeScroll, () => window.scrollY > 8, () => false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header
      data-scrolled={scrolled || open}
      className="sticky top-0 z-40 border-b border-transparent transition-[background-color,border-color] duration-300 data-[scrolled=true]:border-hairline data-[scrolled=true]:bg-paper/92 data-[scrolled=true]:backdrop-blur-md"
    >
      <div className="mx-auto flex h-16 w-full max-w-[1320px] items-center justify-between gap-4 px-4 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5 rounded-md">
          <Logo className="size-8" />
          <span className="font-display text-[21px] font-bold tracking-tight">Sheetfit</span>
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 text-[15px] md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="rounded-full px-4 py-2 text-graphite-soft transition-colors hover:bg-graphite/6 hover:text-graphite">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/editor"
            className="rounded-full bg-graphite px-5 py-2.5 text-[14.5px] font-semibold text-paper transition-[background-color,transform] duration-200 hover:bg-graphite/88 active:scale-[0.97]"
          >
            Start designing
          </Link>
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-full text-graphite hover:bg-graphite/6 md:hidden"
            aria-expanded={open}
            aria-controls="studio-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      <nav
        id="studio-menu"
        aria-label="Main"
        className={cn("border-t border-hairline px-4 pb-4 md:hidden", open ? "block" : "hidden")}
      >
        {LINKS.map((l) => (
          <a
            key={l.href}
            href={l.href}
            onClick={() => setOpen(false)}
            className="block rounded-lg px-2 py-3.5 text-[17px] font-medium text-graphite hover:bg-graphite/6"
          >
            {l.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
