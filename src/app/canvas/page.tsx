import { Suspense } from "react";
import AppShell from "@/components/layout/AppShell";
import CanvasWorkspace from "./CanvasWorkspace";

export default function CanvasPage() {
  return (
    <AppShell>
      <Suspense>
        <CanvasWorkspace />
      </Suspense>
    </AppShell>
  );
}
