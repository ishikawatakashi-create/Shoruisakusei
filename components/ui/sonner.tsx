"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      toastOptions={{
        classNames: {
          toast: "bg-white text-[#333] border-[#d0d5da] shadow-[0_4px_12px_rgba(0,0,0,0.1)] rounded text-[13px]",
          description: "text-[#8a8a8a] text-[12px]",
          success: "border-l-4 border-l-[#27ae60]",
          error: "border-l-4 border-l-[#e74c3c]",
        },
      }}
    />
  );
}
