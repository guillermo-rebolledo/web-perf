"use client";

import { ReactNode } from "react";

interface TerminalWindowProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export function TerminalWindow({
  title = "Terminal",
  children,
  className = "",
}: TerminalWindowProps) {
  return (
    <div
      className={
        "overflow-hidden rounded-lg border border-[#2d2d2d] bg-[#1a1a1a] shadow-[0_8px_32px_-8px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.04)] " +
        className
      }
    >
      {/* macOS title bar */}
      <div className="flex items-center gap-3 border-b border-[#2d2d2d] bg-[#2d2d2d]/90 px-3 py-1">
        <div className="flex gap-1.5 shrink-0" aria-hidden>
          <span
            className="h-2.5 w-2.5 rounded-full bg-[#ff5f57] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.2)]"
            title="Close"
          />
          <span
            className="h-2.5 w-2.5 rounded-full bg-[#febc2e] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.2)]"
            title="Minimize"
          />
          <span
            className="h-2.5 w-2.5 rounded-full bg-[#28c840] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.2)]"
            title="Zoom"
          />
        </div>
        <div className="min-w-0 flex-1 text-center">
          <span className="truncate text-[11px] font-medium text-[#8e8e93]">
            {title}
          </span>
        </div>
        {/* Spacer for symmetry */}
        <div className="w-[34px] shrink-0" aria-hidden />
      </div>

      {/* Terminal content area */}
      <div className="font-mono text-[13px] text-[#e5e5e7] antialiased">
        {children}
      </div>
    </div>
  );
}
