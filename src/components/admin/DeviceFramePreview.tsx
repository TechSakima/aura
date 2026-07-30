"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { SegmentedControl } from "@/components/ui";
import { cn } from "@/lib/cn";

const PHONE_WIDTH = 375;
/** Secondary wide preview — not a full desktop layout editor. */
const DESKTOP_WIDTH = 960;

export type DevicePreviewMode = "phone" | "desktop";

function frameHeightPx(mode: DevicePreviewMode) {
  if (typeof window === "undefined") {
    return mode === "phone" ? 560 : 640;
  }
  const vh = window.innerHeight;
  return mode === "phone"
    ? Math.min(Math.round(vh * 0.7), 640)
    : Math.min(Math.round(vh * 0.75), 720);
}

/**
 * Forced logical-width device frame that scales down to fit the column
 * (AURA-285). Phone 375px is primary; desktop is a secondary toggle.
 */
export function DeviceFramePreview({
  children,
  label = "Preview",
  className,
  frameClassName,
  frameStyle,
  defaultMode = "phone",
  showModeToggle = true,
  status,
}: {
  children: ReactNode;
  label?: string;
  className?: string;
  frameClassName?: string;
  frameStyle?: CSSProperties;
  defaultMode?: DevicePreviewMode;
  showModeToggle?: boolean;
  /** Extra line under the mode toggle (e.g. unsaved status). */
  status?: ReactNode;
}) {
  const [mode, setMode] = useState<DevicePreviewMode>(defaultMode);
  const outerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [heightPx, setHeightPx] = useState(() => frameHeightPx(defaultMode));
  const logicalWidth = mode === "phone" ? PHONE_WIDTH : DESKTOP_WIDTH;

  useEffect(() => {
    const syncHeight = () => setHeightPx(frameHeightPx(mode));
    syncHeight();
    window.addEventListener("resize", syncHeight);
    return () => window.removeEventListener("resize", syncHeight);
  }, [mode]);

  useEffect(() => {
    const el = outerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const update = () => {
      const w = el.clientWidth;
      if (w <= 0) return;
      setScale(w >= logicalWidth ? 1 : w / logicalWidth);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [logicalWidth]);

  const scaledWidth = logicalWidth * scale;
  const scaledHeight = heightPx * scale;

  return (
    <div className={cn("min-w-0", className)}>
      <div className="mb-3 flex flex-col items-center gap-2 text-center">
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted">
          {label} · {mode === "phone" ? "375px" : "Desktop"}
        </p>
        {showModeToggle ? (
          <SegmentedControl
            ariaLabel="Preview size"
            options={[
              { id: "phone", label: "Phone" },
              { id: "desktop", label: "Desktop" },
            ]}
            value={mode}
            onChange={setMode}
          />
        ) : null}
        {status ? <div className="text-xs text-muted">{status}</div> : null}
      </div>

      <div
        ref={outerRef}
        className="mx-auto w-full"
        style={{
          maxWidth: mode === "phone" ? PHONE_WIDTH : DESKTOP_WIDTH,
        }}
      >
        <div
          className="relative mx-auto overflow-hidden"
          style={{
            width: scaledWidth,
            height: scaledHeight,
          }}
        >
          <div
            className={cn(
              "absolute left-0 top-0 overflow-hidden rounded-device border-[6px] border-ink bg-canvas shadow-lg",
              frameClassName,
            )}
            style={{
              ...frameStyle,
              width: logicalWidth,
              height: heightPx,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            <div className="h-full overflow-y-auto overscroll-contain">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
