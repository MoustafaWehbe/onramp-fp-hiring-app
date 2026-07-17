import { z } from "zod";

export const attachSkillsSchema = z.object({
  skillIds: z.array(z.string().uuid()).min(1),
});