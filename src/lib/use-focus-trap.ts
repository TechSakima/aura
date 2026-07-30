"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), video[controls], [tabindex]:not([tabindex="-1"])';

function focusableIn(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true",
  );
}

/**
 * Trap focus inside a modal root; restore prior focus on cleanup (AURA-253).
 */
export function useFocusTrap(
  active: boolean,
  containerRef: RefObject<HTMLElement | null>,
  opts?: { onEscape?: () => void; initialFocusRef?: RefObject<HTMLElement | null> },
) {
  const onEscape = opts?.onEscape;
  const initialFocusRef = opts?.initialFocusRef;

  useEffect(() => {
    if (!active) return;
    const root = containerRef.current;
    if (!root) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const initial =
      initialFocusRef?.current || focusableIn(root)[0] || root;
    initial.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onEscape?.();
        return;
      }
      if (e.key !== "Tab" || !root) return;
      const items = focusableIn(root);
      if (!items.length) {
        e.preventDefault();
        root.focus();
        return;
      }
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const activeEl = document.activeElement;
      if (e.shiftKey) {
        if (activeEl === first || !root.contains(activeEl)) {
          e.preventDefault();
          last.focus();
        }
      } else if (activeEl === last || !root.contains(activeEl)) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [active, containerRef, onEscape, initialFocusRef]);
}
