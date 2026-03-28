"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  wide?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export default function Modal({ open, onClose, title, subtitle, wide, children, footer }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-black/72 backdrop-blur-[4px] z-[100] flex items-center justify-center animate-fade-in"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div
        className={cn(
          "bg-bg-2 border border-[rgba(200,175,120,0.15)] rounded-[10px] p-[22px] animate-fade-up",
          wide ? "w-[490px]" : "w-[420px]"
        )}
      >
        <div className="font-serif text-[19px] text-vastu-text mb-[2px]">{title}</div>
        {subtitle && (
          <div className="text-[10px] text-vastu-text-3 mb-4 leading-relaxed">{subtitle}</div>
        )}
        {children}
        {footer && (
          <div className="flex gap-[6px] justify-end mt-4">{footer}</div>
        )}
      </div>
    </div>
  );
}
