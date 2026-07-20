import {
  getSequelize,
  CandidateProfile,
  WorkExperience,
  Skill,
  CandidateSkill,
} from "@starter-kit/shared/db";
import { createError } from "../middleware/error-handler";
import type { UploadResult } from "../lib/storage";

interface ProfileInput {
  headline?: string;
  bio?: string;
  phone?: string;
  location?: string;
}

interface ExperienceInput {
  company?: string;
  title?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

export class CandidateService {
  async findOwnProfile(userId: string): Promise<CandidateProfile | null> {
    return CandidateProfile.findOne({ where: { userId } });
  }

  /** Most sub-resources (experience, skills, resume) hang off the profile and can't exist without it. */
  private async requireOwnProfile(userId: string): Promise<CandidateProfile> {
    const profile = await this.findOwnProfile(userId);

    if (!profile) {
      throw createError(
        "Create your candidate profile before adding this",
        404,
      );
    }

    return profile;
  }

  async createProfile(
    userId: string,
    input: ProfileInput,
  ): Promise<CandidateProfile> {
    const existing = await this.findOwnProfile(userId);

    if (existing) {
      throw createError("Profile already exists", 409);
    }

    return CandidateProfile.create({ userId, ...input });
  }

  async updateProfile(
    profile: CandidateProfile,
    input: ProfileInput,
  ): Promise<CandidateProfile> {
    return profile.update(input);
  }

  async listExperience(userId: string): Promise<WorkExperience[]> {
    const profile = await this.requireOwnProfile(userId);

    return WorkExperience.findAll({
      where: { candidateProfileId: profile.id },
      order: [["startDate", "DESC"]],
    });
  }

  async createExperience(
    userId: string,
    input: ExperienceInput,
  ): Promise<WorkExperience> {
    const profile = await this.requireOwnProfile(userId);

    return WorkExperience.create({
      candidateProfileId: profile.id,
      company: input.company as string,
      title: input.title as string,
      startDate: input.startDate as string,
      endDate: input.endDate,
      description: input.description,
    });
  }

  async updateExperience(
    experience: WorkExperience,
    input: ExperienceInput,
  ): Promise<WorkExperience> {
    return experience.update(input);
  }

  async deleteExperience(experience: WorkExperience): Promise<void> {
    await experience.destroy();
  }

  async getSkills(userId: string): Promise<Skill[]> {
    const profile = await this.requireOwnProfile(userId);
    return this.loadSkills(profile.id);
  }

  /** The full reference list a candidate picks from — not scoped to any profile. */
  async listSkillCatalog(): Promise<Skill[]> {
    return Skill.findAll({ order: [["name", "ASC"]] });
  }

  async setSkills(userId: string, skillIds: string[]): Promise<Skill[]> {
    const profile = await this.requireOwnProfile(userId);
    const uniqueSkillIds = [...new Set(skillIds)];

    if (uniqueSkillIds.length > 0) {
      const found = await Skill.findAll({ where: { id: uniqueSkillIds } });

      if (found.length !== uniqueSkillIds.length) {
        throw createError("One or more skillIds do not exist", 422);
      }
    }

    await getSequelize().transaction(async (transaction) => {
      await CandidateSkill.destroy({
        where: { candidateProfileId: profile.id },
        transaction,
      });

      if (uniqueSkillIds.length > 0) {
        await CandidateSkill.bulkCreate(
          uniqueSkillIds.map((skillId) => ({
            candidateProfileId: profile.id,
            skillId,
          })),
          { transaction },
        );
      }
    });

    return this.loadSkills(profile.id);
  }

  private async loadSkills(candidateProfileId: string): Promise<Skill[]> {
    const withSkills = await CandidateProfile.findByPk(candidateProfileId, {
      include: [{ model: Skill, as: "skills", through: { attributes: [] } }],
    });

    return (
      (withSkills?.get("skills") as Skill[] | undefined) ?? []
    );
  }

  async attachResume(
    userId: string,
    upload: UploadResult,
  ): Promise<CandidateProfile> {
    const profile = await this.requireOwnProfile(userId);
    return profile.update({ resumeUrl: upload.url });
  }
}

export const candidateService = new CandidateService();
