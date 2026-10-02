"use client";

import { CalendarSyncIcon, Loader2Icon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { errorMessage, postJson } from "@/lib/http/client";
import { PLAN_HORIZONS } from "@/lib/validations/planner";

export function PlanGenerator({ defaultMinutes, hasPlan }: { defaultMinutes: number; hasPlan: boolean }) {
  const router = useRouter();
  const [horizon, setHorizon] = useState<(typeof PLAN_HORIZONS)[number]>(14);
  const [minutes, setMinutes] = useState(String(defaultMinutes));
  const [pending, setPending] = useState(false);

  const generate = async () => {
    const dailyMinutes = Number(minutes);
    if (!Number.isInteger(dailyMinutes) || dailyMinutes < 10 || dailyMinutes > 480) {
      toast.error("Indique un temps quotidien entre 10 et 480 minutes.");
      return;
    }
    setPending(true);
    try {
      const { sessions } = await postJson<{ sessions: number }>("/api/study-plan/generate", { horizonDays: horizon, dailyMinutes });
      toast.success(`Planning prêt : ${sessions} sessions planifiées.`);
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="plan-horizon" className="text-xs">
          Période
        </Label>
        <Select value={String(horizon)} onValueChange={(v) => setHorizon(Number(v) as typeof horizon)}>
          <SelectTrigger id="plan-horizon" className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PLAN_HORIZONS.map((d) => (
              <SelectItem key={d} value={String(d)}>
                {d} jours
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="plan-minutes" className="text-xs">
          Minutes par jour
        </Label>
        <Input
          id="plan-minutes"
          type="number"
          inputMode="numeric"
          min={10}
          max={480}
          step={5}
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          className="w-28"
        />
      </div>
      <Button onClick={generate} disabled={pending}>
        {pending ? <Loader2Icon className="animate-spin" /> : <CalendarSyncIcon />}
        {hasPlan ? "Régénérer mon planning" : "Générer mon planning"}
      </Button>
    </div>
  );
}
