"use client";

import { useEffect, RefObject } from "react";

let activeModalsCount = 0;
let originalOverflow = "";

/**
 * Custom hook to lock body scrolling when a modal or overlay is open.
 * Prevents mobile background scrolling / bounce-scroll bleed and restores
 * document.body overflow when closed or unmounted.
 */
export function useBodyScrollLock(
  isOpen: boolean,
  backdropRef?: RefObject<HTMLElement | null>
) {
  useEffect(() => {
    if (!isOpen) return;

    if (activeModalsCount === 0) {
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    activeModalsCount++;

    return () => {
      activeModalsCount = Math.max(0, activeModalsCount - 1);
      if (activeModalsCount === 0) {
        document.body.style.overflow = originalOverflow;
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !backdropRef || !backdropRef.current) return;
    const el = backdropRef.current;

    const handleTouchMove = (e: TouchEvent) => {
      // Prevent touch-drag on the backdrop overlay itself from scrolling the page
      if (e.target === el) {
        e.preventDefault();
      }
    };

    el.addEventListener("touchmove", handleTouchMove, { passive: false });
    return () => {
      el.removeEventListener("touchmove", handleTouchMove);
    };
  }, [isOpen, backdropRef]);
}
