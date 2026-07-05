import Link from "next/link";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-8xl font-bold aurora-text">404</p>
      <h1 className="mt-4 text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 max-w-sm text-muted">
        This story has drifted beyond the horizon. Let’s get you back to the
        feed.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-accent to-mintblob px-5 py-2.5 text-sm font-medium text-ink shadow-glow transition hover:opacity-90"
      >
        <Home className="h-4 w-4" />
        Back home
      </Link>
    </div>
  );
}
