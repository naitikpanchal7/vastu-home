import Sidebar from "./Sidebar";
import { ToastProvider } from "@/components/ui/Toast";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-bg text-vastu-text font-sans text-[13px]">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}
