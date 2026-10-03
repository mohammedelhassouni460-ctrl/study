import { SettingsNav } from "@/components/settings/settings-nav";
import { PageHeader } from "@/components/shared/page-header";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHeader title="Paramètres" description="Ton profil, ton abonnement et tes données." />
      <div className="grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
        <SettingsNav />
        <div className="grid min-w-0 content-start gap-6">{children}</div>
      </div>
    </>
  );
}
