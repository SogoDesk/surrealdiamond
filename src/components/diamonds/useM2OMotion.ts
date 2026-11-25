"use client";

import type { RefObject } from "react";
import { registerGsap, gsap, ScrollTrigger, SplitText, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/hooks/useMedia";

/**
 * The Made to Order page's motion (asked for on this page, November 2026;
 * the site's calm mode in lib/motion.ts stays for the other chapters). Every
 * effect runs once, as its part arrives, and moves only opacity, transform or
 * clip, so nothing is pinned or tied to the scroll position:
 * - [data-split] headings rise in word by word from masked lines.
 * - [data-rise] blocks fade up 28px, batched as they enter.
 * - [data-reveal-img] frames open from the bottom while the image settles.
 * - [data-timeline] draws its [data-line] (across, or down on phones), then its items step in.
 * The cost table animates on its own (useM2OBars), since its rows arrive later.
 * The hero needs no script: it enters with CSS on load (m2o.module.css).
 * Reduced motion: nothing is hidden and nothing moves.
 */
export function useM2OMotion(scope: RefObject<HTMLElement | null>, dependencies: unknown[] = []) {
  useGSAP(
    () => {
      registerGsap();
      const root = scope.current;
      if (!root || prefersReducedMotion()) return;

      gsap.utils.toArray<HTMLElement>("[data-split]", root).forEach((el) =>
        SplitText.create(el, {
          type: "lines,words",
          mask: "lines",
          autoSplit: true,
          onSplit: (self) =>
            gsap.fromTo(
              self.words,
              { yPercent: 110 },
              { yPercent: 0, duration: 1, ease: "surreal", stagger: 0.045, scrollTrigger: { trigger: el, start: "top 88%", once: true } },
            ),
        }),
      );

      const rise = gsap.utils.toArray<HTMLElement>("[data-rise]", root);
      if (rise.length) {
        gsap.set(rise, { autoAlpha: 0, y: 28 });
        ScrollTrigger.batch(rise, {
          start: "top 90%",
          once: true,
          onEnter: (batch) => gsap.to(batch, { autoAlpha: 1, y: 0, duration: 1, ease: "surreal", stagger: 0.08, overwrite: true, clearProps: "transform" }),
        });
      }

      gsap.utils.toArray<HTMLElement>("[data-reveal-img]", root).forEach((frame) => {
        const img = frame.querySelector("img");
        const tl = gsap.timeline({ scrollTrigger: { trigger: frame, start: "top 88%", once: true } });
        tl.fromTo(frame, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.3, ease: "surreal", clearProps: "clipPath" });
        if (img) tl.fromTo(img, { scale: 1.12 }, { scale: 1, duration: 1.6, ease: "surreal", clearProps: "transform" }, 0);
      });

      gsap.utils.toArray<HTMLElement>("[data-timeline]", root).forEach((list) => {
        const line = list.querySelector<HTMLElement>("[data-line]");
        const items = list.querySelectorAll("li");
        const tl = gsap.timeline({ scrollTrigger: { trigger: list, start: "top 85%", once: true } });
        // Across on laptops, down on phones (the line stands upright below 1024px).
        const upright = line ? line.offsetHeight > line.offsetWidth : false;
        if (line)
          tl.fromTo(
            line,
            upright ? { scaleY: 0 } : { scaleX: 0 },
            { ...(upright ? { scaleY: 1 } : { scaleX: 1 }), duration: 1.5, ease: "power2.inOut", transformOrigin: upright ? "50% 0%" : "0% 50%" },
          );
        tl.fromTo(items, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: "surreal", stagger: 0.1, clearProps: "transform" }, line ? 0.15 : 0);
      });
    },
    { scope, dependencies, revertOnUpdate: true },
  );
}

/**
 * The cost table's motion, on its own because the rows arrive later (the
 * costs load after sign-in): the rows slide in and each [data-bar] grows,
 * once, when the table comes into view.
 */
export function useM2OBars(scope: RefObject<HTMLElement | null>, ready: boolean) {
  useGSAP(
    () => {
      registerGsap();
      const table = scope.current;
      if (!table || !ready || prefersReducedMotion()) return;
      const rows = table.querySelectorAll("[data-row]");
      const bars = table.querySelectorAll("[data-bar]");
      const tl = gsap.timeline({ scrollTrigger: { trigger: table, start: "top 85%", once: true } });
      tl.fromTo(rows, { autoAlpha: 0, x: -12 }, { autoAlpha: 1, x: 0, duration: 0.7, ease: "surreal", stagger: 0.06, clearProps: "transform" });
      tl.fromTo(bars, { scaleX: 0 }, { scaleX: 1, duration: 1.1, ease: "surreal", stagger: 0.06, transformOrigin: "0% 50%" }, 0.1);
    },
    { scope, dependencies: [ready], revertOnUpdate: true },
  );
}
