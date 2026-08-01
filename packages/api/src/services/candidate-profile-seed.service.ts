import {
  Application,
  CandidateProfile,
  CandidateSkill,
  Skill,
  getSequelize,
} from "@starter-kit/shared/db";
import { Op, type Transaction } from "sequelize";

/**
 * Seeds a candidate's profile from what phase 1 parsed out of their resume.
 *
 * Deliberately one-time, not a sync. The gate is profile_seeded_at: once it
 * is set the seed never runs again, so uploading a new CV can add nothing and
 * overwrite nothing. A candidate who corrects a skill the parser got wrong
 * keeps that correction, which would not survive a "refresh from resume"
 * design.
 *
 * It also never touches a field the candidate already filled in — the seed
 * fills blanks, it does not replace answers.
 */
export class CandidateProfileSeedService {
  async seedFromResume(candidateProfileId: string): Promise<{
    seeded: boolean;
    skillsAdded: number;
  }> {
    const profile = await CandidateProfile.findByPk(candidateProfileId);

    if (!profile || profile.profileSeededAt) {
      return { seeded: false, skillsAdded: 0 };
    }

    // The most recent parse with anything usable in it.
    const parsed = await Application.findOne({
      attributes: ["parsedSkills", "parsedYearsExperience", "resumeUploadedAt"],
      where: {
        candidateProfileId,
        [Op.or]: [
          { parsedSkills: { [Op.ne]: null } },
          { parsedYearsExperience: { [Op.ne]: null } },
        ],
      },
      order: [["resumeUploadedAt", "DESC"]],
    });

    if (!parsed) {
      return { seeded: false, skillsAdded: 0 };
    }

    const parsedSkills = (parsed.parsedSkills ?? []).filter(Boolean);
    let skillsAdded = 0;

    await getSequelize().transaction(async (transaction) => {
      if (parsedSkills.length > 0) {
        const existingLinks = await CandidateSkill.findAll({
          where: { candidateProfileId },
          transaction,
        });

        // A candidate who has already chosen skills has answered this
        // question; the parse does not get to weigh in.
        if (existingLinks.length === 0) {
          const skillIds = await this.resolveSkillIds(parsedSkills, transaction);

          if (skillIds.length > 0) {
            await CandidateSkill.bulkCreate(
              skillIds.map((skillId) => ({ candidateProfileId, skillId })),
              { transaction, ignoreDuplicates: true },
            );
            skillsAdded = skillIds.length;
          }
        }
      }

      const headline =
        profile.headline ??
        this.buildHeadline(parsed.parsedYearsExperience ?? null, parsedSkills);

      await profile.update(
        {
          // Only ever fills a blank.
          headline: profile.headline ?? headline ?? undefined,
          profileSeededAt: new Date(),
        },
        { transaction },
      );
    });

    return { seeded: true, skillsAdded };
  }

  /**
   * Parsed skills are free text; the profile stores references to the shared
   * skills table so candidate and job skills compare by id. Unknown names are
   * added to the catalog rather than dropped.
   */
  private async resolveSkillIds(
    names: string[],
    transaction: Transaction,
  ): Promise<string[]> {
    const unique = [...new Map(names.map((n) => [n.toLowerCase(), n])).values()];
    const ids: string[] = [];

    for (const name of unique) {
      const [skill] = await Skill.findOrCreate({
        where: { name },
        defaults: { name },
        transaction,
      });
      ids.push(skill.id);
    }

    return ids;
  }

  private buildHeadline(
    years: number | null,
    skills: string[],
  ): string | undefined {
    if (skills.length === 0 && years === null) {
      return undefined;
    }

    const skillPart = skills.slice(0, 2).join(" and ");
    const yearPart =
      years !== null && years > 0 ? `${Math.round(years)}+ years` : null;

    if (skillPart && yearPart) {
      return `${skillPart} developer · ${yearPart}`;
    }

    return skillPart ? `${skillPart} developer` : `${yearPart} of experience`;
  }
}

export const candidateProfileSeedService = new CandidateProfileSeedService();
