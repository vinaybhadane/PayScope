"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** One-shot reveals. Content stays visible when JavaScript or motion is unavailable. */
export function WorkspaceMotion() {
  const pathname = usePathname();
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const seen = new WeakSet<Element>();
    const animations = new Set<Animation>();
    const selector = "[data-reveal], .dashboard-metric, .stat-card, .dash-panel, .surface, .relation-explorer, .dashboard-next-step, .workspace-content > .rounded-xl, .workspace-content > .rounded-2xl, .workspace-content > .rounded-3xl, .public-content > section";
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => {
        if (!isIntersecting) return;
        observer.unobserve(target);
        if (preference.matches || !target.animate) return;
        const siblings = target.parentElement ? [...target.parentElement.children] : [];
        const delay = Math.min(Math.max(siblings.indexOf(target), 0), 3) * 45;
        const animation = target.animate(
          [{ opacity: 0, translate: "0 16px" }, { opacity: 1, translate: "0 0" }],
          { duration: 620, delay, easing: "cubic-bezier(.22,1,.36,1)", fill: "backwards" },
        );
        animations.add(animation);
        animation.onfinish = () => animations.delete(animation);
        target.classList.add("motion-arrived");
      });
    }, { threshold: 0.06, rootMargin: "0px 0px -20px 0px" });
    const observe = (root: Element) => {
      const targets = root.matches(selector) ? [root, ...root.querySelectorAll(selector)] : root.querySelectorAll(selector);
      targets.forEach((element) => {
        if (seen.has(element)) return;
        seen.add(element);
        observer.observe(element);
      });
    };
    observe(document.body);
    const mutations = new MutationObserver((records) => {
      records.forEach((record) => record.addedNodes.forEach((node) => {
        if (node instanceof Element) observe(node);
      }));
    });
    mutations.observe(document.body, { childList: true, subtree: true });
    const stop = () => {
      if (preference.matches) { animations.forEach((animation) => animation.cancel()); animations.clear(); }
    };
    preference.addEventListener("change", stop);
    return () => {
      observer.disconnect(); mutations.disconnect();
      animations.forEach((animation) => animation.cancel());
      preference.removeEventListener("change", stop);
    };
  }, [pathname]);
  return null;
}
