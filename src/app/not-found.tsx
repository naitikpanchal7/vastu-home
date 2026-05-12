import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="flex flex-col items-center text-center gap-4 max-w-[360px]">

        <div className="font-serif text-[96px] font-semibold text-gold leading-none select-none">
          404
        </div>

        <div className="font-serif text-[24px] text-gold-2 leading-tight">
          Page not found
        </div>

        <p className="text-[13px] text-vastu-text-2 leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <Link
          href="/dashboard"
          className="mt-2 px-5 py-[9px] bg-gold text-bg font-sans font-medium text-[12px] rounded-[8px] hover:bg-gold-2 transition-colors"
        >
          Go to Dashboard
        </Link>

      </div>
    </div>
  );
}
