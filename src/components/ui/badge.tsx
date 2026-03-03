import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 tracking-tight px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase w-fit select-none font-geist-mono focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "bg-primary/10 text-primary border border-primary/25",
        destructive:
          "bg-destructive/12 text-destructive border border-destructive/30",
        outline:
          "bg-muted/60 text-muted-foreground border border-border",
        success:
          "bg-score-good/15 text-score-good border border-score-good/35",
        successMinor:
          "bg-score-good/8 text-score-good/70 border border-score-good/20",
        warning:
          "bg-score-warning/15 text-score-warning border border-score-warning/35",
        warningMinor:
          "bg-score-warning/8 text-score-warning/70 border border-score-warning/20",
        poor:
          "bg-score-poor/12 text-score-poor border border-score-poor/30",
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
