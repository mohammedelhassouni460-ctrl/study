import type { Metadata } from "next";

import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { Logo } from "@/components/shared/logo";
import { getCurrentProfile, requireUser } from "@/lib/auth/session";
import { educationLevelSchema, goalSchema } from "@/lib/validations/onboarding";

export const metadata: Metadata = { title: "Bienvenue", robots: { index: false } };

export default async function OnboardingPage() {
  await requireUser();
  const profile = await getCurrentProfile();
  return (
    <div className="flex min-h-dvh flex-col items-center px-4 py-8 sm:py-14">
      <Logo className="mb-8" />
      <main className="w-full max-w-lg">
        <OnboardingWizard
          defaults={{
            fullName: profile?.full_name ?? "",
            educationLevel: educationLevelSchema.safeParse(profile?.education_level).data,
            goal: goalSchema.safeParse(profile?.goal).data,
            nextExamDate: profile?.next_exam_date ?? undefined,
          }}
        />
      </main>
    </div>
  );
}
