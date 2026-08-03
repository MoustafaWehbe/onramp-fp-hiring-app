import {
  Application,
  CandidateProfile,
  Job,
  Skill,
  WorkExperience,
} from "@starter-kit/shared/db";
import { Op, UniqueConstraintError } from "sequelize";
import { createError } from "../middleware/error-handler";

type ProfileWithRelations = CandidateProfile & {
  skills?: Skill[];
  workExperiences?: WorkExperience[];
};

export interface EasyApplyReadiness {
  ready: boolean;
  hasResumeOnFile: boolean;
  hasProfileContent: boolean;
  missing: string[];
}

/**
 * Applying with the standing profile instead of a fresh upload.
 *
 * The important property is that it snapshots. Phase 1 already stores the
 * resume text and parse on the application row, and that design is why a
 * later profile edit cannot rewrite history: this copies the profile's
 * current state onto the application at apply time, and nothing reads back
 * through to the live profile afterwards.
 */
export class EasyApplyService {
  private async loadProfile(userId: string): Promise<ProfileWithRelations> {
    const profile = (await CandidateProfile.findOne({
      where: { userId },
      include: [
        {
          model: Skill,
          as: "skills",
          attributes: ["id", "name"],
          through: { attributes: [] },
          required: false,
        },
        {
          model: WorkExperience,
          as: "workExperiences",
          required: false,
        },
      ],
    })) as ProfileWithRelations | null;

    if (!profile) {
      throw createError(
        "Create your candidate profile before applying",
        404,
      );
    }

    return profile;
  }

  /**
   * The bar for Easy Apply: there has to be something to send. A resume on
   * file counts, and so does a filled-in profile — but an empty profile with
   * no resume would submit a blank application and give the fit scorer
   * nothing to work with, so it is refused with a reason rather than
   * accepted and silently scored as unfit.
   */
  assessReadiness(profile: ProfileWithRelations): EasyApplyReadiness {
    const hasResumeOnFile = Boolean(profile.resumeUrl);
    const skills = profile.skills ?? [];
    const experiences = profile.workExperiences ?? [];
    const hasProfileContent =
      skills.length > 0 ||
      experiences.length > 0 ||
      Boolean(profile.bio?.trim());

    const missing: string[] = [];

    if (!hasResumeOnFile && skills.length === 0) {
      missing.push("at least one skill, or a resume on file");
    }

    if (!hasResumeOnFile && experiences.length === 0 && !profile.bio?.trim()) {
      missing.push("a summary or one work experience entry");
    }

    return {
      ready: hasResumeOnFile || hasProfileContent,
      hasResumeOnFile,
      hasProfileContent,
      missing,
    };
  }

  async getReadiness(userId: string): Promise<EasyApplyReadiness> {
    return this.assessReadiness(await this.loadProfile(userId));
  }

  /**
   * Builds the text the fit scorer reads, from the profile as it stands right
   * now. Stored on the application so the score and the record both reflect
   * what was actually submitted.
   */
  buildProfileSnapshot(profile: ProfileWithRelations): {
    resumeText: string;
    parsedSkills: string[];
    parsedYearsExperience: number | null;
  } {
    const skills = (profile.skills ?? []).map((skill) => skill.name);
    const experiences = [...(profile.workExperiences ?? [])].sort((a, b) =>
      b.startDate.localeCompare(a.startDate),
    );

    const sections: string[] = [];

    if (profile.headline) {
      sections.push(profile.headline);
    }

    if (profile.bio?.trim()) {
      sections.push(profile.bio.trim());
    }

    if (skills.length > 0) {
      sections.push(`Skills: ${skills.join(", ")}`);
    }

    if (experiences.length > 0) {
      sections.push(
        `Experience:\n${experiences
          .map((experience) => {
            const period = `${experience.startDate} – ${experience.endDate ?? "present"}`;
            const detail = experience.description
              ? `\n  ${experience.description}`
              : "";
            return `- ${experience.title} at ${experience.company} (${period})${detail}`;
          })
          .join("\n")}`,
      );
    }

    return {
      resumeText: sections.join("\n\n"),
      parsedSkills: skills,
      parsedYearsExperience: this.totalYears(experiences),
    };
  }

  private totalYears(experiences: WorkExperience[]): number | null {
    if (experiences.length === 0) {
      return null;
    }

    const totalMs = experiences.reduce((sum, experience) => {
      const start = new Date(experience.startDate).getTime();
      const end = experience.endDate
        ? new Date(experience.endDate).getTime()
        : Date.now();

      return sum + Math.max(0, end - start);
    }, 0);

    return Math.round((totalMs / (365.25 * 24 * 60 * 60 * 1000)) * 10) / 10;
  }

  /**
   * Resolves everything Easy Apply needs, leaving the actual write to
   * ApplicationService.create so submission, stage history, fit scoring, and
   * recruiter notification all stay on one path.
   */
  async prepare(userId: string, jobId: string) {
    const profile = await this.loadProfile(userId);
    const readiness = this.assessReadiness(profile);

    if (!readiness.ready) {
      throw createError(
        "Add a resume or fill in your profile before using Easy Apply",
        422,
      );
    }

    const job = await Job.findOne({ where: { id: jobId, status: "OPEN" } });

    if (!job) {
      throw createError("Job not found", 404);
    }

    const existing = await Application.findOne({
      where: {
        jobId,
        candidateProfileId: profile.id,
        stage: { [Op.ne]: "DRAFT" },
      },
    });

    if (existing) {
      throw createError("You have already applied for this job", 409);
    }

    return { profile, snapshot: this.buildProfileSnapshot(profile) };
  }

  /** Narrows a duplicate race to the same 409 the normal apply path returns. */
  isDuplicate(error: unknown): boolean {
    return error instanceof UniqueConstraintError;
  }
}

export const easyApplyService = new EasyApplyService();
