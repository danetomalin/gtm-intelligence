import Link from "next/link";

// Demo mode: auth disabled. Restore by re-adding the getUser() check
// and redirect to /login if !user (see git history for the original).
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-surface/60 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            href="/dashboard"
            className="text-sm font-semibold tracking-tight text-text"
          >
            <span className="text-accent">Throughline</span>
          </Link>
          <nav className="flex items-center gap-5 text-xs text-text-muted">
            <Link href="/dashboard" className="hover:text-text transition">
              Dashboard
            </Link>
            <Link href="/onboarding" className="hover:text-text transition">
              New brand
            </Link>
            <span className="text-text-dim">demo mode</span>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
