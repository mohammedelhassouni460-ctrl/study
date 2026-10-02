import { CheckCircle2Icon, CircleAlertIcon } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import type { FormState } from "@/lib/http/action-result";

export function FormMessage({ state }: { state: FormState }) {
  if (!state) return null;
  if (!state.ok && state.error) {
    return (
      <Alert variant="destructive">
        <CircleAlertIcon />
        <AlertDescription>{state.error}</AlertDescription>
      </Alert>
    );
  }
  if (state.ok && state.message) {
    return (
      <Alert variant="info">
        <CheckCircle2Icon />
        <AlertDescription className="text-accent-foreground">{state.message}</AlertDescription>
      </Alert>
    );
  }
  return null;
}
