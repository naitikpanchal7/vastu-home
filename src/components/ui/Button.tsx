"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "danger";
  size?: "sm" | "md";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "ghost", size = "sm", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center gap-[5px] font-sans font-medium cursor-pointer border-none transition-all duration-[130ms]",
          size === "sm" && "text-[11px] px-3 py-[5px] rounded-md",
          size === "md" && "text-[12px] px-4 py-2 rounded-md",
          variant === "primary" && "bg-gold text-[#faf7f0] hover:bg-gold-2",
          variant === "ghost" &&
            "bg-transparent text-vastu-text-2 border border-[rgba(100,70,20,0.20)] hover:text-vastu-text hover:border-gold-3",
          variant === "danger" &&
            "bg-[rgba(192,64,64,0.15)] text-[#c04040] border border-[rgba(192,64,64,0.3)] hover:bg-[rgba(192,64,64,0.25)]",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export default Button;
