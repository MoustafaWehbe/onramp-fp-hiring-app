import {
  CandidateEducation,
  CandidateProfile,
} from "@starter-kit/shared/db";
import { createError } from "../middleware/error-handler";

interface EducationInput {
  institution?: string;
  degree?: string | null;
  fieldOfStudy?: string | null;
  startDate?: string;
  endDate?: string | null;
}

/**
 * Mirrors the existing work-experience service: education hangs off the
 * profile the same way, so ownership runs through candidate_profile_id and a
 * candidate without a profile is told to create one rather than silently
 * getting an empty list.
 */
export class CandidateEducationService {
  private async requireOwnProfile(userId: string): Promise<CandidateProfile> {
    const profile = await CandidateProfile.findOne({ where: { userId } });

    if (!profile) {
      throw createError(
        "Create your candidate profile before adding this",
        404,
      );
    }

    return profile;
  }

  async list(userId: string): Promise<CandidateEducation[]> {
    const profile = await this.requireOwnProfile(userId);

    return CandidateEducation.findAll({
      where: { candidateProfileId: profile.id },
      order: [["startDate", "DESC"]],
    });
  }

  async create(
    userId: string,
    input: EducationInput,
  ): Promise<CandidateEducation> {
    const profile = await this.requireOwnProfile(userId);

    return CandidateEducation.create({
      candidateProfileId: profile.id,
      institution: input.institution as string,
      degree: input.degree ?? null,
      fieldOfStudy: input.fieldOfStudy ?? null,
      startDate: input.startDate as string,
      endDate: input.endDate ?? null,
    });
  }

  async update(
    education: CandidateEducation,
    input: EducationInput,
  ): Promise<CandidateEducation> {
    // The DB check constraint is the final authority on date order, but
    // catching it here gives a readable message instead of a driver error.
    const startDate = input.startDate ?? education.startDate;
    const endDate =
      input.endDate === undefined ? education.endDate : input.endDate;

    if (endDate && endDate < startDate) {
      throw createError("endDate must be on or after startDate", 422);
    }

    return education.update(input);
  }

  async remove(education: CandidateEducation): Promise<void> {
    await education.destroy();
  }
}

export const candidateEducationService = new CandidateEducationService();
