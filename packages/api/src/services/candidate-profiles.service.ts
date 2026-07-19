import {
  Application,
  CandidateProfile,
  Job,
  User,
} from "@starter-kit/shared/db";

import { createError } from "../middleware/error-handler";

export class CandidateProfileService {
  async create(input: {
    userId: string;
    headline?: string;
    bio?: string;
    phone?: string;
    location?: string;
    resumeUrl?: string;
  }) {
    const user = await User.findByPk(input.userId);

    if (!user) {
      throw createError("User not found", 404);
    }

    const profile = await CandidateProfile.create(input);

    return profile;
  }
  // Recruiters/admins only ever see candidates who have applied to one of
  // their own company's jobs — never the full candidate roster.
  async getAll(companyId: string) {
  const applications = await Application.findAll({
    attributes: ["candidateProfileId"],
    include: [
      { model: Job, as: "job", attributes: [], where: { companyId } },
    ],
  });

  const profileIds = [
    ...new Set(applications.map((a) => a.candidateProfileId)),
  ];

  if (profileIds.length === 0) {
    return [];
  }

  return CandidateProfile.findAll({
    where: { id: profileIds },
    include: [
      {
        model: User,
        as: "user",
        attributes: ["id", "name", "email"],
      },
    ],
  });
}async getById(id: string, companyId: string) {
  const profile = await CandidateProfile.findByPk(id, {
    include: [
      {
        model: User,
        as: "user",
        attributes: ["id", "name", "email"],
      },
    ],
  });

  if (!profile) {
    throw createError(
      "Candidate profile not found",
      404,
    );
  }

  const hasAppliedToCompany = await Application.findOne({
    where: { candidateProfileId: id },
    include: [
      { model: Job, as: "job", attributes: [], where: { companyId } },
    ],
  });

  if (!hasAppliedToCompany) {
    throw createError(
      "Candidate profile not found",
      404,
    );
  }

  return profile;
}
}

export const candidateProfileService =
  new CandidateProfileService();
