import { defineSettings } from "@getpaseo/plugin";
import { z } from "zod";

export const preferences = defineSettings({
  id: "delivery",
  scope: "host",
  version: 1,
  schema: z.object({
    provider: z.string().trim().min(1).default("cursor/composer-2.5"),
    model: z.string().default(""),
    modeId: z.string().trim().min(1).default("agent"),
    autoAccept: z.boolean().default(true),
  }),
});
