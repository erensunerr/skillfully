"use client";

import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

export function CtaDotSpotlight({ children }: { children: ReactNode }) {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;

    if (!section) {
      return;
    }

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const target = { x: 0, y: 0, opacity: 0 };
    const current = { x: 0, y: 0, opacity: 0 };
    let frameId = 0;
    let isRunning = false;
    let reducedMotion = motionQuery.matches;

    const setSpotlight = () => {
      section.style.setProperty("--cta-spotlight-x", `${current.x.toFixed(1)}px`);
      section.style.setProperty("--cta-spotlight-y", `${current.y.toFixed(1)}px`);
      section.style.setProperty("--cta-spotlight-opacity", current.opacity.toFixed(3));
    };

    const clearSpotlight = () => {
      current.opacity = 0;
      target.opacity = 0;
      section.style.setProperty("--cta-spotlight-opacity", "0");
    };

    const stopAnimation = () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }

      frameId = 0;
      isRunning = false;
    };

    const animate = () => {
      current.x += (target.x - current.x) * 0.16;
      current.y += (target.y - current.y) * 0.16;
      current.opacity += (target.opacity - current.opacity) * 0.12;
      setSpotlight();

      const isSettled =
        Math.abs(target.x - current.x) < 0.05 &&
        Math.abs(target.y - current.y) < 0.05 &&
        Math.abs(target.opacity - current.opacity) < 0.004;

      if (isSettled && target.opacity === 0) {
        clearSpotlight();
        stopAnimation();
        return;
      }

      frameId = window.requestAnimationFrame(animate);
    };

    const startAnimation = () => {
      if (isRunning || reducedMotion) {
        return;
      }

      isRunning = true;
      frameId = window.requestAnimationFrame(animate);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (reducedMotion || event.pointerType === "touch") {
        return;
      }

      const rect = section.getBoundingClientRect();
      target.x = event.clientX - rect.left;
      target.y = event.clientY - rect.top;
      target.opacity = 0.68;

      if (current.x === 0 && current.y === 0 && current.opacity === 0) {
        current.x = target.x;
        current.y = target.y;
      }

      startAnimation();
    };

    const handlePointerLeave = () => {
      target.opacity = 0;
      startAnimation();
    };

    const handleMotionPreferenceChange = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches;

      if (reducedMotion) {
        stopAnimation();
        clearSpotlight();
      }
    };

    clearSpotlight();

    section.addEventListener("pointermove", handlePointerMove);
    section.addEventListener("pointerleave", handlePointerLeave);
    section.addEventListener("pointercancel", handlePointerLeave);
    motionQuery.addEventListener("change", handleMotionPreferenceChange);

    return () => {
      section.removeEventListener("pointermove", handlePointerMove);
      section.removeEventListener("pointerleave", handlePointerLeave);
      section.removeEventListener("pointercancel", handlePointerLeave);
      motionQuery.removeEventListener("change", handleMotionPreferenceChange);
      stopAnimation();
      clearSpotlight();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      data-dot-spotlight-area="footer-cta"
      className="cta-dot-spotlight relative overflow-hidden bg-[var(--ink)] text-[var(--paper)]"
    >
      {children}
    </section>
  );
}
