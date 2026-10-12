"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Modal built on <dialog>: native focus trapping, Escape to close, and an inert page behind it. */
export function Dialog({
  open,
  onClose,
  title,
  children,
  labelledBy = "dialog-title",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  labelledBy?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        // Click on the backdrop closes.
        if (e.target === ref.current) onClose();
      }}
      className="m-auto w-[min(92vw,26rem)] rounded-3xl border border-line bg-surface p-0 text-ink shadow-soft backdrop:bg-[rgb(40_32_28/0.35)] backdrop:backdrop-blur-[2px] fade-in"
    >
      <div className="p-6">
        <h2 id={labelledBy} className="text-xl font-extrabold">
          {title}
        </h2>
        <div className="mt-3">{children}</div>
      </div>
    </dialog>
  );
}
