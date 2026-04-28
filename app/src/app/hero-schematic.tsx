"use client";

import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";

const GRID_STYLE: CSSProperties = {
  backgroundImage:
    "linear-gradient(to right, rgba(8, 8, 8, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(8, 8, 8, 0.08) 1px, transparent 1px)",
  backgroundSize: "44px 44px",
};

const MAGNETIC_LAYER_SELECTOR = "[data-magnetic-strength]";

type MagneticLayer = HTMLElement | SVGElement;

function IllustrationRegistrationMark({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`registration-mark${className ? ` ${className}` : ""}`}
    />
  );
}

function useMagneticCursor() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const layers = Array.from(
      container.querySelectorAll<MagneticLayer>(MAGNETIC_LAYER_SELECTOR),
    ).map((element) => ({
      element,
      strength: Number(element.getAttribute("data-magnetic-strength")) || 0,
    }));

    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    const velocity = { x: 0, y: 0 };
    let frameId = 0;
    let isRunning = false;
    let reducedMotion = motionQuery.matches;

    const clearTransforms = () => {
      for (const { element } of layers) {
        element.style.transform = "";
      }
    };

    const prepareLayers = () => {
      for (const { element } of layers) {
        element.style.willChange = "transform";
        element.style.transformOrigin = "center";

        if (element instanceof SVGElement) {
          element.style.setProperty("transform-box", "fill-box");
        }
      }
    };

    const stopAnimation = () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }

      frameId = 0;
      isRunning = false;
    };

    const settleAtOrigin = () => {
      target.x = 0;
      target.y = 0;
      current.x = 0;
      current.y = 0;
      velocity.x = 0;
      velocity.y = 0;
      clearTransforms();
    };

    const runFrame = () => {
      velocity.x = (velocity.x + (target.x - current.x) * 0.09) * 0.78;
      velocity.y = (velocity.y + (target.y - current.y) * 0.09) * 0.78;
      current.x += velocity.x;
      current.y += velocity.y;

      const isSettled =
        Math.abs(target.x - current.x) < 0.001 &&
        Math.abs(target.y - current.y) < 0.001 &&
        Math.abs(velocity.x) < 0.001 &&
        Math.abs(velocity.y) < 0.001;

      if (isSettled && target.x === 0 && target.y === 0) {
        settleAtOrigin();
        stopAnimation();
        return;
      }

      for (const { element, strength } of layers) {
        const x = current.x * strength;
        const y = current.y * strength;
        element.style.transform = `translate3d(${x.toFixed(3)}px, ${y.toFixed(3)}px, 0)`;
      }

      frameId = window.requestAnimationFrame(runFrame);
    };

    const startAnimation = () => {
      if (isRunning || reducedMotion) {
        return;
      }

      isRunning = true;
      frameId = window.requestAnimationFrame(runFrame);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (reducedMotion || event.pointerType === "touch") {
        return;
      }

      const rect = container.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      const length = Math.hypot(x, y);
      const dampedLength = length > 1 ? 1 / length : 1;

      target.x = x * dampedLength;
      target.y = y * dampedLength;
      startAnimation();
    };

    const handlePointerLeave = () => {
      target.x = 0;
      target.y = 0;
      startAnimation();
    };

    const handleMotionPreferenceChange = (event: MediaQueryListEvent) => {
      reducedMotion = event.matches;

      if (reducedMotion) {
        stopAnimation();
        settleAtOrigin();
      } else {
        prepareLayers();
      }
    };

    if (!reducedMotion) {
      prepareLayers();
    }

    container.addEventListener("pointermove", handlePointerMove);
    container.addEventListener("pointerleave", handlePointerLeave);
    container.addEventListener("pointercancel", handlePointerLeave);
    motionQuery.addEventListener("change", handleMotionPreferenceChange);

    return () => {
      container.removeEventListener("pointermove", handlePointerMove);
      container.removeEventListener("pointerleave", handlePointerLeave);
      container.removeEventListener("pointercancel", handlePointerLeave);
      motionQuery.removeEventListener("change", handleMotionPreferenceChange);
      stopAnimation();
      clearTransforms();
    };
  }, []);

  return containerRef;
}

export function SchematicGraphic() {
  const containerRef = useMagneticCursor();

  return (
    <div
      ref={containerRef}
      data-magnetic-cursor-area="hero-illustration"
      className="relative h-full min-h-[28rem] overflow-hidden bg-[var(--white)]"
    >
      <div
        aria-hidden
        data-magnetic-layer="background"
        data-magnetic-strength="3"
        className="absolute inset-0"
        style={GRID_STYLE}
      />
      <div
        aria-hidden
        data-magnetic-layer="background"
        data-magnetic-strength="2.25"
        className="editorial-halftone absolute inset-[7%] opacity-60"
      />

      <svg
        aria-hidden
        className="absolute inset-0 h-full w-full text-[var(--ink)]"
        viewBox="0 0 620 620"
        preserveAspectRatio="xMidYMid meet"
        fill="none"
      >
        <g
          data-magnetic-layer="geometry"
          data-magnetic-strength="7.5"
          stroke="currentColor"
          strokeWidth="1.4"
        >
          <line x1="0" y1="310" x2="620" y2="310" />
          <line x1="310" y1="0" x2="310" y2="620" />
          <circle cx="310" cy="310" r="150" strokeDasharray="5 5" />
          <circle cx="310" cy="310" r="112" />
        </g>

        <g data-magnetic-layer="center" data-magnetic-strength="12">
          <circle cx="310" cy="310" r="58" fill="currentColor" strokeWidth="0" />
        </g>

        <g
          data-magnetic-layer="geometry"
          data-magnetic-strength="7.5"
          stroke="currentColor"
          strokeWidth="1.4"
        >
          <rect x="205" y="205" width="210" height="210" />
          <path d="M310 126 486 310 310 494 134 310Z" />
          <path d="M310 158 452 310 310 462 168 310Z" />
          <path d="M150 310C150 184 226 94 310 58" />
          <path d="M310 58C386 80 470 168 470 310" />
          <path d="M470 310C470 436 394 526 310 562" />
          <path d="M310 562C234 540 150 452 150 310" />
        </g>

        <g
          data-magnetic-layer="outer"
          data-magnetic-strength="5.5"
          stroke="currentColor"
          strokeWidth="1.4"
        >
          <rect x="286" y="34" width="48" height="48" fill="var(--paper)" />
          <path d="M296 70 326 40" />
          <rect x="286" y="538" width="48" height="48" fill="var(--paper)" />
          <path d="M296 574 326 544" />
          <path d="M108 104h28v28h-28zM112 108h8M124 108h12M112 120h24M112 132h8M128 132h8" />
          <path d="M484 104h28v28h-28zM488 108h8M500 108h12M488 120h24M488 132h8M504 132h8" />
          <path d="M108 488h28v28h-28zM112 492h8M124 492h12M112 504h24M112 516h8M128 516h8" />
          <path d="M484 488h28v28h-28zM488 492h8M500 492h12M488 504h24M488 516h8M504 516h8" />
        </g>
      </svg>

      <aside className="absolute inset-y-0 right-0 flex w-16 flex-col items-center border-l border-[var(--ink)] bg-[var(--paper)] px-2 py-8 sm:w-20">
        <div aria-hidden className="flex h-48 w-8 justify-between">
          {[3, 6, 2, 8, 4, 7].map((width, index) => (
            <span key={index} className="h-full bg-[var(--ink)]" style={{ width }} />
          ))}
        </div>
        <IllustrationRegistrationMark className="bottom-12 left-1/2 -translate-x-1/2" />
      </aside>
    </div>
  );
}
