import type { Metadata } from "next";

import { AvatarUploader } from "@/components/settings/avatar-uploader";
import { ProfileForm } from "@/components/settings/profile-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireOnboardedUser } from "@/lib/auth/session";
import { educationLevelSchema, goalSchema } from "@/lib/validations/onboarding";
import { TIMEZONES } from "@/lib/validations/settings";

export const metadata: Metadata = { title: "Profil" };

export default async function ProfileSettingsPage() {
  const { user, profile } = await requireOnboardedUser();
  const timezone = (TIMEZONES as readonly string[]).includes(profile.timezone) ? (profile.timezone as (typeof TIMEZONES)[number]) : "Europe/Paris";

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Photo de profil</CardTitle>
          <CardDescription>PNG, JPEG ou WebP, 2 Mo maximum.</CardDescription>
        </CardHeader>
        <CardContent>
          <AvatarUploader userId={user.id} avatarUrl={profile.avatar_url} name={profile.full_name} email={user.email ?? null} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Informations</CardTitle>
          <CardDescription>Elles personnalisent les fiches, les quiz et ton planning. Email : {user.email}</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            defaultValues={{
              fullName: profile.full_name ?? "",
              educationLevel: educationLevelSchema.safeParse(profile.education_level).data ?? "licence",
              goal: goalSchema.safeParse(profile.goal).data ?? "exams",
              nextExamDate: profile.next_exam_date ?? "",
              dailyStudyMinutes: profile.daily_study_minutes,
              timezone,
            }}
          />
        </CardContent>
      </Card>
    </>
  );
}
