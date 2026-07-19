import { Skill } from "@starter-kit/shared/db";

export class SkillService {
  async create(input: { name: string }) {
    const skill = await Skill.create(input);

    return {
      id: skill.id,
      name: skill.name,
    };
  }
}

export const skillService = new SkillService();