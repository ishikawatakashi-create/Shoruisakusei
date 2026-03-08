import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-[34px] w-full rounded border border-[#d0d5da] bg-white px-3 py-1 text-[13px] text-[#333] shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)] transition-colors file:border-0 file:bg-transparent file:text-[13px] file:font-medium placeholder:text-[#b0b5ba] focus:border-[#4a9cf5] focus:outline-none focus:ring-1 focus:ring-[#4a9cf5]/30 disabled:cursor-not-allowed disabled:bg-[#f5f7fa] disabled:opacity-70",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
