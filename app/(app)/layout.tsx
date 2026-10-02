import type { Metadata } from "next";

import { CreditsMeter } from "@/components/app/credits-meter";
import { MobileNav } from "@/components/app/mobile-nav";
import { SidebarNav } from "@/components/app/sidebar-nav";
import { UserMenu } from "@/components/app/user-menu";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { getBillingState } from "@/lib/billing/access";
import { requireOnboardedUser } from "@/lib/auth/session";

// Private area: never indexed.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireOnboardedUser();
  const billing = await getBillingState(user.id);

  const footer = (
    <>
      <CreditsMeter plan={billing.plan} used={billing.creditsUsed} limit={billing.limits.monthlyCredits} />
      <UserMenu
        name={profile.full_name}
        email={profile.email ?? user.email ?? null}
        avatarUrl={profile.avatar_url}
        plan={billing.plan}
      />
    </>
  );

  return (
    <div className="flex min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:shadow"
      >
        Aller au contenu
      </a>
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 border-r bg-sidebar p-4 lg:flex">
        <div className="flex items-center justify-between px-2">
          <Logo href="/dashboard" />
          <ThemeToggle />
        </div>
        <SidebarNav />
        <div className="mt-auto grid gap-3">{footer}</div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur lg:hidden">
          <MobileNav footer={footer} />
          <Logo href="/dashboard" />
          <ThemeToggle />
        </header>
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
