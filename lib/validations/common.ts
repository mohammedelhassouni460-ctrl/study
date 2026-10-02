import { z } from "zod";

export const uuidSchema = z.uuid({ message: "Identifiant invalide." });

/** "" -> undefined, so optional form fields can be left empty. */
export const emptyToUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

export const optionalDateSchema = z.preprocess(
  emptyToUndefined,
  z.iso.date({ message: "Date invalide." }).optional(),
);

/** Only allow same-site relative redirects ("/x", never "//evil.com" or "https://..."). */
export function safeRedirectPath(value: unknown, fallback = "/dashboard") {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}
