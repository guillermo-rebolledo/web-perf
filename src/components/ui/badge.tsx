import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center tracking-tighter px-1 rounded-md text-[10px] font-bold uppercase w-fit select-none font-geist-mono focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border border-primary bg-primary text-primary-foreground",
        destructive: "border border-destructive bg-destructive text-white",
        outline: "text-foreground border border-foreground",
        success: "border border-score-good bg-score-good text-white",
        successMinor:
          "border border-score-good/40 bg-score-good/15 text-score-good",
        warning: "border border-score-warning bg-score-warning text-white",
        warningMinor:
          "border border-score-warning/40 bg-score-warning/15 text-score-warning",
        poor: "border border-score-poor bg-score-poor text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
