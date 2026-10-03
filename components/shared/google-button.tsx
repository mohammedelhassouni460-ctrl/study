import { SubmitButton } from "@/components/shared/submit-button";
import { googleSignInAction } from "@/lib/auth/actions";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </svg>
  );
}

export function GoogleButton({ next, label = "Continuer avec Google" }: { next?: string; label?: string }) {
  return (
    <form action={googleSignInAction}>
      {next && <input type="hidden" name="next" value={next} />}
      <SubmitButton variant="outline" className="w-full">
        <GoogleIcon />
        {label}
      </SubmitButton>
    </form>
  );
}

export function AuthDivider() {
  return (
    <div className="relative my-2 text-center text-xs text-muted-foreground">
      <span className="absolute inset-x-0 top-1/2 h-px bg-border" aria-hidden />
      <span className="relative bg-card px-2">ou</span>
    </div>
  );
}
