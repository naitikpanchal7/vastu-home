"use client";

import { useEffect, Suspense } from "react";
import Sidebar from "./Sidebar";
import { ToastProvider } from "@/components/ui/Toast";

export default function AppShell({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    document.body.classList.add("app-page");
    document.body.classList.remove("public-page");
    return () => document.body.classList.remove("app-page");
  }, []);

  return (
    <ToastProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-bg text-vastu-text font-sans text-[13px]">
        <Suspense>
          <Sidebar />
        </Suspense>
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}
