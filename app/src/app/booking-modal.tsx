"use client";

import { type MouseEvent, type ReactNode, useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { captureClientEvent } from "@/lib/client-analytics";

export const BOOKING_FORM_SRC =
  "https://calendar.google.com/calendar/appointments/schedules/AcZssZ19NLGr7INpECubuQkgtYZUS_au3B49ybotOBKBqtdtCXHp1a7jwawkzlNqgZvlRs5F8gcQofg1?gv=true";

export function BookingModalCta({
  surface,
  className,
  children = "Book onboarding",
  initialOpen = false,
  onOpen,
}: {
  surface: string;
  className: string;
  children?: ReactNode;
  initialOpen?: boolean;
  onOpen?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  const closeModal = useCallback(
    (reason: "backdrop" | "button" | "escape" = "button") => {
      captureClientEvent("landing_booking_modal_closed", { surface, reason });
      setIsOpen(false);
    },
    [surface],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    previousActiveElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeModal("escape");
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      previousActiveElementRef.current?.focus();
      previousActiveElementRef.current = null;
    };
  }, [closeModal, isOpen]);

  function openModal() {
    onOpen?.();
    captureClientEvent("meeting_booking_clicked", { surface });
    setIsOpen(true);
  }

  function closeOnBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      closeModal("backdrop");
    }
  }

  const modal = isOpen ? (
    <div
      className="fixed inset-0 z-[100] bg-[rgba(8,8,8,0.74)] px-4 py-5 sm:px-8 sm:py-8"
      onMouseDown={closeOnBackdrop}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="mx-auto flex h-full max-h-[46rem] max-w-5xl flex-col overflow-hidden border border-[var(--ink)] bg-[var(--paper)] shadow-[10px_10px_0_rgba(255,255,255,0.22)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--ink)] bg-[var(--white)] px-5 py-4">
          <div>
            <h2 id={titleId} className="font-editorial-sans text-2xl font-bold">
              Book concierge onboarding
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close onboarding booking"
            className="relative h-10 w-10 shrink-0 border border-[var(--ink)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--ink)] hover:text-[var(--paper)]"
            onClick={() => closeModal("button")}
          >
            <span
              aria-hidden="true"
              className="absolute left-1/2 top-1/2 h-0.5 w-4 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-current"
            />
            <span
              aria-hidden="true"
              className="absolute left-1/2 top-1/2 h-0.5 w-4 -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-current"
            />
          </button>
        </div>
        <div className="min-h-0 flex-1 bg-[var(--white)]">
          <iframe
            src={BOOKING_FORM_SRC}
            title="Book Skillfully onboarding"
            style={{ border: 0 }}
            width="100%"
            height="600"
            frameBorder="0"
            className="h-full min-h-[32rem] w-full"
          />
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        className={className}
        data-booking-surface={surface}
        aria-haspopup="dialog"
        onClick={openModal}
      >
        {children}
      </button>

      {typeof document === "undefined" ? modal : createPortal(modal, document.body)}
    </>
  );
}
