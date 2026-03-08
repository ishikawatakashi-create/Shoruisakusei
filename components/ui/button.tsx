"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4a9cf5] focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        default:
          "bg-[#4a9cf5] text-white shadow-sm hover:bg-[#3a8ce5] active:bg-[#2d7fd3]",
        destructive:
          "bg-[#e74c3c] text-white shadow-sm hover:bg-[#d44332] active:bg-[#c0392b]",
        outline:
          "border border-[#d0d5da] bg-white text-[#333] shadow-sm hover:bg-[#f5f7fa] active:bg-[#ebedf0]",
        secondary:
          "bg-[#eef2f7] text-[#333] hover:bg-[#e0e6ed] active:bg-[#d5dce5]",
        ghost:
          "text-[#555] hover:bg-[#eef2f7] hover:text-[#333]",
        link:
          "text-[#4a9cf5] underline-offset-4 hover:underline hover:text-[#2d7fd3]",
      },
      size: {
        default: "h-[34px] px-4",
        sm: "h-[28px] px-3 text-[12px]",
        lg: "h-[38px] px-6",
        icon: "h-[34px] w-[34px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
