import { Badge } from "@/components/ui/badge";
import { MASTERY_LABELS, masteryLevel } from "@/lib/learning/mastery";
import { cn } from "@/lib/utils";

export function masteryColor(score: number) {
  const level = masteryLevel(score);
  if (level === "never") return "bg-muted-foreground/30";
  if (level === "weak") return "bg-destructive";
  if (level === "medium") return "bg-warning";
  return "bg-success";
}

export function MasteryBar({ score, className, label }: { score: number; className?: string; label?: string }) {
  return (
    <div
      role="meter"
      aria-valuenow={score}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? "Niveau de maîtrise"}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}
    >
      <div
        className={cn("h-full rounded-full transition-all duration-700", masteryColor(score))}
        style={{ width: `${Math.max(score, 2)}%` }}
      />
    </div>
  );
}

export function MasteryBadge({ score }: { score: number }) {
  const level = masteryLevel(score);
  const variant =
    level === "weak" ? "destructive" : level === "medium" ? "warning" : level === "never" ? "secondary" : "success";
  return <Badge variant={variant}>{MASTERY_LABELS[level]}</Badge>;
}
