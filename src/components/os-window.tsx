import { ReactNode } from "react";

export function OSWindow({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="absolute -inset-3 rounded-2xl bg-linear-to-b from-primary/8 to-transparent blur-2xl pointer-events-none" />

      <div className="relative rounded-xl border border-border bg-card shadow-[0_20px_60px_-10px_rgba(0,0,0,0.15),0_0_0_1px_rgba(0,0,0,0.04)] dark:shadow-[0_20px_60px_-10px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.06)] overflow-hidden">
        <div className="flex items-center gap-3 border-b border-border bg-muted px-4 py-3">
          <div className="flex gap-1.5 shrink-0">
            <div className="h-3 w-3 rounded-full bg-[#FF5F57] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.12)]" />
            <div className="h-3 w-3 rounded-full bg-[#FEBC2E] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.12)]" />
            <div className="h-3 w-3 rounded-full bg-[#28C840] shadow-[inset_0_0_0_0.5px_rgba(0,0,0,0.12)]" />
          </div>

          {/* URL bar */}
          <div className="flex flex-1 justify-center">
            <div className="flex h-6 w-full max-w-xs items-center justify-center rounded-md border border-border bg-background px-3 text-[11px] font-mono text-muted-foreground shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]">
              perflabs.dev/dashboard
            </div>
          </div>
        </div>

        {children}
      </div>
    </>
  );
}
