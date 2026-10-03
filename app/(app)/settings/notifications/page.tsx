import type { Metadata } from "next";

import { NotificationsForm } from "@/components/settings/notifications-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireOnboardedUser } from "@/lib/auth/session";
import { notificationPreferencesSchema } from "@/lib/validations/settings";

export const metadata: Metadata = { title: "Notifications" };

const DEFAULTS = { email_reminders: true, weekly_report: true, product_updates: false };

export default async function NotificationsSettingsPage() {
  const { profile } = await requireOnboardedUser();
  const prefs = notificationPreferencesSchema.safeParse({ ...DEFAULTS, ...(profile.notification_preferences as object) });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications par email</CardTitle>
        <CardDescription>Choisis ce que StudyOS peut t&apos;envoyer.</CardDescription>
      </CardHeader>
      <CardContent>
        <NotificationsForm defaultValues={prefs.success ? prefs.data : DEFAULTS} />
      </CardContent>
    </Card>
  );
}
