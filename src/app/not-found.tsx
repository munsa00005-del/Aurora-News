import Link from "next/link";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-8xl font-bold aurora-text">404</p>
      <h1 className="mt-4 text-2xl font-semibold">Lost in the aurora</h1>
      <p className="mt-2 max-w-sm text-white/55">
        This story has drifted beyond the horizon. Let’s get you back to the
        feed.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple to-cyan px-5 py-2.5 text-sm font-medium text-white shadow-glow transition hover:opacity-90"
      >
        <Home className="h-4 w-4" />
        Back home
      </Link>
    </div>
  );
}
