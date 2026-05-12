"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="flex flex-col items-center text-center gap-4 max-w-[360px]">

        <div className="font-serif text-[64px] font-semibold text-gold leading-none select-none">
          ⚠
        </div>

        <div className="font-serif text-[24px] text-gold-2 leading-tight">
          Something went wrong
        </div>

        <p className="text-[13px] text-vastu-text-2 leading-relaxed">
          An unexpected error occurred. You can try again or return to the dashboard.
        </p>

        {process.env.NODE_ENV === "development" && (
          <div className="w-full bg-bg-3 border border-[rgba(200,175,120,0.15)] rounded-[8px] p-3 text-left">
            <p className="text-[10px] font-mono text-saffron break-words">{error.message}</p>
          </div>
        )}

        <div className="flex gap-3 mt-2">
          <button
            onClick={reset}
            className="px-5 py-[9px] bg-gold text-bg font-sans font-medium text-[12px] rounded-[8px] hover:bg-gold-2 transition-colors cursor-pointer"
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="px-5 py-[9px] border border-[rgba(200,175,120,0.15)] text-vastu-text-2 font-sans text-[12px] rounded-[8px] hover:border-gold-3 hover:text-vastu-text transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>

      </div>
    </div>
  );
}
