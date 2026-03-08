import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded border px-2 py-0.5 text-[11px] font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[#4a9cf5] text-white",
        secondary: "border-[#d9dce0] bg-[#f5f7fa] text-[#555]",
        destructive: "border-transparent bg-[#e74c3c] text-white",
        outline: "border-[#d9dce0] text-[#555]",
        success: "border-transparent bg-[#e6f7ee] text-[#27ae60]",
        warning: "border-transparent bg-[#fef5e7] text-[#e67e22]",
        info: "border-transparent bg-[#eaf4fd] text-[#2d7fd3]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
