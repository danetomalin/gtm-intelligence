import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <Suspense
        fallback={
          <div className="w-full max-w-sm">
            <div className="space-y-2 text-center">
              <div className="text-[11px] font-medium uppercase tracking-[1.5px] text-accent">
                Throughline
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Loading…
              </h1>
            </div>
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}
