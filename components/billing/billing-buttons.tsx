"use client";

import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { BillingInterval } from "@/lib/billing/plans";
import { errorMessage, postJson } from "@/lib/http/client";

function useRedirect(url: string) {
  const [pending, setPending] = useState(false);
  const go = async (body: unknown = {}) => {
    setPending(true);
    try {
      const { url: target } = await postJson<{ url: string }>(url, body);
      window.location.assign(target);
    } catch (error) {
      toast.error(errorMessage(error));
      setPending(false);
    }
  };
  return { pending, go };
}

export function CheckoutButton({
  interval,
  children,
  className,
}: {
  interval: BillingInterval;
  children: React.ReactNode;
  className?: string;
}) {
  const { pending, go } = useRedirect("/api/stripe/checkout");
  return (
    <Button className={className} disabled={pending} onClick={() => go({ interval })}>
      {pending && <Loader2Icon className="animate-spin" />} {children}
    </Button>
  );
}

export function PortalButton({ children, className, variant = "outline" }: { children: React.ReactNode; className?: string; variant?: "outline" | "default" }) {
  const { pending, go } = useRedirect("/api/stripe/portal");
  return (
    <Button className={className} variant={variant} disabled={pending} onClick={() => go()}>
      {pending && <Loader2Icon className="animate-spin" />} {children}
    </Button>
  );
}
