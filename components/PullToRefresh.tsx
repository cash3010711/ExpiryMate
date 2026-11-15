"use client";

import React, { useState, useRef, useCallback } from "react";
import { ArrowDown, Loader2 } from "lucide-react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  threshold?: number;
  maxPull?: number;
  disabled?: boolean;
  className?: string;
}

export type PullStatus = "idle" | "pulling" | "ready" | "refreshing";

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  threshold = 65,
  maxPull = 80,
  disabled = false,
  className = "",
}) => {
  const [status, setStatus] = useState<PullStatus>("idle");
  const [pullDistance, setPullDistance] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const startYRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (disabled || status === "refreshing") return;

      const scrollTop =
        window.scrollY ||
        document.documentElement.scrollTop ||
        (containerRef.current ? containerRef.current.scrollTop : 0);

      if (scrollTop <= 0) {
        startYRef.current = e.touches[0].clientY;
      } else {
        startYRef.current = null;
      }
    },
    [disabled, status]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent<HTMLDivElement>) => {
      if (startYRef.current === null || disabled || status === "refreshing") return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - startYRef.current;

      if (diff > 0) {
        const scrollTop =
          window.scrollY ||
          document.documentElement.scrollTop ||
          (containerRef.current ? containerRef.current.scrollTop : 0);

        if (scrollTop <= 0) {
          setIsDragging(true);
          // Apply damping resistance (diff * 0.45)
          const distance = Math.min(maxPull, Math.max(0, diff * 0.45));
          setPullDistance(distance);

          if (distance >= threshold) {
            setStatus("ready");
          } else {
            setStatus("pulling");
          }
        }
      } else {
        // Scrolling up or normal scroll
        if (isDragging) {
          setPullDistance(0);
          setStatus("idle");
          setIsDragging(false);
        }
      }
    },
    [disabled, status, isDragging, threshold, maxPull]
  );

  const handleTouchEnd = useCallback(async () => {
    startYRef.current = null;
    setIsDragging(false);

    if (disabled || status === "refreshing") return;

    if (pullDistance >= threshold) {
      setStatus("refreshing");
      setPullDistance(52); // Hold indicator position during refresh

      // Subtle haptic vibration on devices that support it
      if (typeof window !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate(12);
        } catch {}
      }

      try {
        await onRefresh();
      } catch (err) {
        console.warn("Pull-to-refresh execution error:", err);
      } finally {
        setPullDistance(0);
        setStatus("idle");
      }
    } else {
      setPullDistance(0);
      setStatus("idle");
    }
  }, [disabled, status, pullDistance, threshold, onRefresh]);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`relative overscroll-y-contain ${className}`}
      style={{ overscrollBehaviorY: "contain" }}
    >
      {/* Pull indicator bar */}
      <div
        className={`w-full overflow-hidden flex items-center justify-center pointer-events-none select-none ${
          isDragging ? "" : "transition-all duration-300 ease-out"
        }`}
        style={{
          height: `${pullDistance}px`,
          opacity: pullDistance > 10 ? Math.min(1, pullDistance / 40) : 0,
        }}
        aria-live="polite"
        data-testid="pull-to-refresh-indicator"
        data-status={status}
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-white/90 backdrop-blur-xs px-4 py-1.5 rounded-full border border-slate-200 shadow-sm">
          {status === "refreshing" ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              <span className="text-emerald-700">正在同步...</span>
            </>
          ) : status === "ready" ? (
            <>
              <ArrowDown className="w-4 h-4 text-emerald-600 rotate-180 transition-transform duration-200" />
              <span className="text-emerald-700">放開立即更新</span>
            </>
          ) : (
            <>
              <ArrowDown
                className="w-4 h-4 text-slate-500 transition-transform duration-200"
                style={{
                  transform: `rotate(${Math.min(180, (pullDistance / threshold) * 180)}deg)`,
                }}
              />
              <span>下拉刷新</span>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      {children}
    </div>
  );
};
