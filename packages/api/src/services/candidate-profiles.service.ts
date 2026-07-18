import {
  CandidateProfile,
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
  async getAll() {
  return CandidateProfile.findAll({
    include: [
      {
        model: User,
        as: "user",
        attributes: ["id", "name", "email"],
      },
    ],
  });
}async getById(id: string) {
  console.log("ID =", id);

  const profile = await CandidateProfile.findByPk(id);

  if (!profile) {
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