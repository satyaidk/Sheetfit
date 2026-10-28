"use client";

/**
 * Scroll motion for the home page, in one small effect instead of a library.
 *
 * - `data-reveal`: sections below the fold are marked hidden on mount and
 *   shown as they scroll into view. Content above the fold, and everything
 *   when scripts are off, is never hidden, so nothing flashes or disappears.
 * - `data-parallax="0.06"`: decorative hero artwork drifts at a fraction of
 *   the scroll speed, through a CSS variable (transform only, no layout).
 *
 * Both are skipped when the visitor prefers reduced motion.
 */

import { useEffect } from "react";

export function StudioMotion() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const reveal = [...document.querySelectorAll<HTMLElement>("[data-reveal]")];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          // Also reveal anything already scrolled past (a jump to #features skips frames).
          if (!e.isIntersecting && e.boundingClientRect.top >= 0) continue;
          (e.target as HTMLElement).dataset.reveal = "shown";
          observer.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    for (const el of reveal) {
      if (el.getBoundingClientRect().top > window.innerHeight * 0.9) {
        el.dataset.reveal = "hidden";
        observer.observe(el);
      }
    }

    const layers = [...document.querySelectorAll<HTMLElement>("[data-parallax]")];
    let frame = 0;
    const update = () => {
      frame = 0;
      for (const el of layers) {
        const speed = Number(el.dataset.parallax) || 0;
        el.style.setProperty("--parallax", `${(-window.scrollY * speed).toFixed(1)}px`);
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    if (layers.length) window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}
