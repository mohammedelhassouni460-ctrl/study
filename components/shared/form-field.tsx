import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Label + control + error message, wired with aria-describedby. */
export function FormField({
  id,
  label,
  error,
  hint,
  className,
  children,
}: {
  id: string;
  label: string;
  error?: string[] | string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const message = Array.isArray(error) ? error[0] : error;
  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !message && (
        <p id={`${id}-hint`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {message && (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-destructive">
          {message}
        </p>
      )}
    </div>
  );
}
