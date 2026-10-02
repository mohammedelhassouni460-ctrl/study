import type { Metadata } from "next";

import { Logo } from "@/components/shared/logo";

export const metadata: Metadata = { robots: { index: false, follow: true } };

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-gradient-to-b from-primary/10 to-transparent"
      />
      <Logo className="mb-8 text-lg" />
      <main className="w-full max-w-sm">{children}</main>
    </div>
  );
}
