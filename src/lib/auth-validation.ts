import { z } from "zod";

export const displayNameSchema = z
  .string()
  .trim()
  .min(2, "NAME_TOO_SHORT")
  .max(80, "NAME_TOO_LONG");
