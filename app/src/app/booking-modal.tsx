"use client";

import { type ReactNode, useEffect, useId, useState } from "react";

import { captureClientEvent } from "@/lib/client-analytics";

export const BOOKING_FORM_SRC =
  "https://calendar.google.com/calendar/appointments/schedules/AcZssZ19NLGr7INpECubuQkgtYZUS_au3B49ybotOBKBqtdtCXHp1a7jwawkzlNqgZvlRs5F8gcQofg1?gv=true";

export function BookingModalCta({
  surface,
  className,
  children = "Book onboarding",
  initialOpen = false,
}: {
  surface: string;
  className: string;
  children?: ReactNode;
  initialOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const titleId = useId();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  function openModal() {
    captureClientEvent("landing_booking_cta_clicked", { surface });
    setIsOpen(true);
  }

  function closeModal() {
    captureClientEvent("landing_booking_modal_closed", { surface });
    setIsOpen(false);
  }

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

      {isOpen ? (
        <div className="fixed inset-0 z-50 bg-[rgba(8,8,8,0.74)] px-4 py-5 sm:px-8 sm:py-8">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="mx-auto flex h-full max-h-[46rem] max-w-5xl flex-col overflow-hidden border border-[var(--ink)] bg-[var(--paper)] shadow-[10px_10px_0_rgba(255,255,255,0.22)]"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--ink)] bg-[var(--white)] px-5 py-4">
              <div>
                <p className="font-editorial-mono text-[0.68rem] font-bold uppercase">
                  Concierge onboarding
                </p>
                <h2 id={titleId} className="mt-2 font-editorial-sans text-2xl font-bold">
                  Book concierge onboarding
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close onboarding booking"
                className="grid h-10 w-10 shrink-0 place-items-center border border-[var(--ink)] bg-[var(--paper)] font-editorial-sans text-2xl leading-none hover:bg-[var(--ink)] hover:text-[var(--paper)]"
                onClick={closeModal}
              >
                x
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
      ) : null}
    </>
  );
}
