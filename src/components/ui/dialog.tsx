"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import "./dialog.css";

let scrollLocks = 0;
let originalOverflow = "";

export type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  variant?: "compact" | "wide";
  children: ReactNode;
};

/** Native top-layer dialogs provide focus containment and safe nested consent sheets. */
export function Dialog({
  open,
  onClose,
  title,
  description,
  variant = "compact",
  children,
}: DialogProps) {
  const native = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const [shown, setShown] = useState(false);
  const reduce = useReducedMotion();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const id = useId();

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!mounted || !open) return;
    trigger.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    if (!native.current?.open) native.current?.showModal();
    setShown(true);
  }, [mounted, open]);

  useEffect(() => {
    if (!shown) return;
    if (scrollLocks++ === 0) {
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    return () => {
      scrollLocks = Math.max(0, scrollLocks - 1);
      if (!scrollLocks) document.body.style.overflow = originalOverflow;
    };
  }, [shown]);

  useEffect(
    () => () => {
      native.current?.close();
    },
    [],
  );

  function finishClose() {
    native.current?.close();
    setShown(false);
    if (
      trigger.current?.isConnected &&
      !trigger.current.matches(":disabled") &&
      !trigger.current.closest("dialog:not([open])")
    ) {
      trigger.current.focus({ preventScroll: true });
    } else {
      const parent = [
        ...document.querySelectorAll<HTMLDialogElement>("dialog[open]"),
      ]
        .filter((dialog) => dialog.dataset.closing !== "true")
        .at(-1);
      if (parent) {
        parent
          .querySelector<HTMLElement>(
            "button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled)",
          )
          ?.focus({ preventScroll: true });
      } else {
        const heading = document.querySelector<HTMLElement>("main h1");
        heading?.setAttribute("tabindex", "-1");
        heading?.focus({ preventScroll: true });
      }
    }
  }

  if (!mounted) return null;
  return createPortal(
    <dialog
      ref={native}
      className={`mm-dialog mm-dialog-${variant}`}
      aria-labelledby={`${id}-title`}
      aria-describedby={description ? `${id}-description` : undefined}
      data-closing={!open}
      onCancel={(event) => {
        event.preventDefault();
        closeRef.current();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) closeRef.current();
      }}
    >
      <AnimatePresence onExitComplete={finishClose}>
        {open && (
          <motion.div
            key="dialog-content"
            className="mm-dialog-panel"
            initial={
              reduce
                ? { opacity: 0 }
                : { opacity: 0, y: variant === "wide" ? 24 : 14, scale: 0.97 }
            }
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.985 }}
            transition={{
              duration: reduce ? 0.12 : 0.28,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <header className="mm-dialog-header">
              <div>
                <h2 id={`${id}-title`}>{title}</h2>
                {description && <p id={`${id}-description`}>{description}</p>}
              </div>
              <button
                type="button"
                className="mm-dialog-close"
                onClick={() => closeRef.current()}
                aria-label="Close dialog"
              >
                <X size={18} strokeWidth={1.6} />
              </button>
            </header>
            <div className="mm-dialog-body">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </dialog>,
    document.body,
  );
}

export default Dialog;
