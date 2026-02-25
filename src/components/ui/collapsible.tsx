"use client";

import * as CollapsiblePrimitive from "@radix-ui/react-collapsible";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const CollapsibleRoot = CollapsiblePrimitive.Root;

const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger;

const CollapsibleContent = CollapsiblePrimitive.CollapsibleContent;

interface CollapsibleSectionProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

function Collapsible({
  trigger,
  children,
  defaultOpen = true,
  open: controlledOpen,
  onOpenChange,
  className,
}: CollapsibleSectionProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;

  const handleOpenChange = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  return (
    <CollapsibleRoot
      open={isOpen}
      onOpenChange={handleOpenChange}
      className={className}
    >
      <CollapsibleTrigger asChild>
        <button className="flex w-full items-center justify-between gap-2 rounded-md px-1.5 py-1 -ml-1.5 text-left hover:bg-muted transition-colors cursor-pointer group">
          <span className="flex items-center gap-2">{trigger}</span>
          <span className="flex items-center justify-center rounded border border-border bg-muted/60 p-0.5 group-hover:bg-background transition-colors">
            <ChevronDown
              className={cn(
                "size-3 text-muted-foreground transition-transform duration-200 shrink-0",
                !isOpen && "-rotate-90",
              )}
            />
          </span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </CollapsibleRoot>
  );
}

export { CollapsibleRoot, CollapsibleTrigger, CollapsibleContent, Collapsible };
