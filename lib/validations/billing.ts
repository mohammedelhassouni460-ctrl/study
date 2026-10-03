import { z } from "zod";

export const checkoutRequestSchema = z.object({
  interval: z.enum(["monthly", "yearly"]).default("monthly"),
});
