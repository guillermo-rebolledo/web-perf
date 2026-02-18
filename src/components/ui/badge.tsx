import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 font-semibold tracking-tighter font-geist-mono select-none",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-white hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-white hover:bg-destructive/80",
        outline: "text-foreground",
        neutral:
          "border-blue-400/40 bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 dark:text-blue-400",
        success:
          "border-transparent bg-score-good text-white hover:bg-score-good/80",
        successMinor:
          "border-score-good/40 bg-score-good/15 text-score-good hover:bg-score-good/25",
        warning:
          "border-transparent bg-score-warning text-white hover:bg-score-warning/80",
        warningMinor:
          "border-score-warning/40 bg-score-warning/15 text-score-warning hover:bg-score-warning/25",
        poor: "border-transparent bg-score-poor text-white hover:bg-score-poor/80",
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
