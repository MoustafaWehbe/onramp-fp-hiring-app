import { z } from "zod";
import { chatCompletion } from "./client";

/**
 * The reverse of fit-score.ts: that scores one candidate against the job they
 * applied to, this scores one candidate's standing profile against jobs they
 * have not applied to, to rank what is worth showing them.
 *
 * Two scorers, one interface. The deterministic one is not a stub — it is the
 * scorer whenever no LLM is configured, and its output is reproducible and
 * checkable by hand, which matters for a number shown to a candidate as a
 * reason to apply. The LLM path adds nuance the arithmetic cannot, and takes
 * over automatically when a key exists.
 */

const SKILL_WEIGHT = 60;
const EXPERIENCE_WEIGHT = 40;
/** Below this there is nothing to reason about; say so rather than scoring 0. */
const MIN_PROFILE_SIGNALS = 1;

export const jobRecommendationSchema = z
  .object({
    score: z.number().int().min(0).max(100),
    reason: z.string().trim().min(10).max(400),
    matched_skills: z.array(z.string().trim().min(1).max(100)).max(10),
  })
  .strict();

export type JobRecommendationResult = {
  score: number;
  reason: string;
  matchedSkills: string[];
};

export interface RecommendationCandidate {
  headline: string | null;
  summary: string | null;
  skills: string[];
  yearsExperience: number | null;
}

export interface RecommendationJob {
  title: string;
  description: string;
  experienceMin: number;
  experienceMax: number;
  requiredSkills: string[];
}

export class InsufficientProfileError extends Error {
  constructor() {
    super("The candidate profile has too little information to score");
    this.name = "InsufficientProfileError";
  }
}

export function hasEnoughProfileToScore(
  candidate: RecommendationCandidate,
): boolean {
  const signals = [
    candidate.skills.filter(Boolean).length > 0,
    Boolean(candidate.headline?.trim()),
    Boolean(candidate.summary?.trim()),
    candidate.yearsExperience !== null,
  ].filter(Boolean);

  // Skills alone carry a match; a headline alone does not, so require a skill
  // or at least two weaker signals before claiming a score means anything.
  return (
    candidate.skills.filter(Boolean).length > 0 ||
    signals.length > MIN_PROFILE_SIGNALS
  );
}

function normalizeSkill(skill: string): string {
  // "Node.js", "nodejs", and "Node JS" are the same skill to a human.
  return skill.toLowerCase().replace(/[^a-z0-9+#]/g, "");
}

/**
 * Skill overlap and experience fit, weighted 60/40. Deterministic: the same
 * profile and job always produce the same score, so a candidate asking "why
 * 80?" gets an answer that holds up.
 */
export function scoreJobForCandidateDeterministic(
  candidate: RecommendationCandidate,
  job: RecommendationJob,
): JobRecommendationResult {
  if (!hasEnoughProfileToScore(candidate)) {
    throw new InsufficientProfileError();
  }

  const candidateSkills = new Map(
    candidate.skills
      .filter(Boolean)
      .map((skill) => [normalizeSkill(skill), skill]),
  );
  const requiredSkills = job.requiredSkills.filter(Boolean);
  const matchedSkills = requiredSkills.filter((skill) =>
    candidateSkills.has(normalizeSkill(skill)),
  );

  // A job that lists no skills cannot discriminate on them, so the skill
  // component is neutral rather than zero — otherwise every such job would be
  // pushed to the bottom for reasons the candidate cannot act on.
  const skillScore =
    requiredSkills.length === 0
      ? SKILL_WEIGHT / 2
      : (matchedSkills.length / requiredSkills.length) * SKILL_WEIGHT;

  const years = candidate.yearsExperience;
  let experienceScore: number;

  if (years === null) {
    experienceScore = EXPERIENCE_WEIGHT / 2;
  } else if (years >= job.experienceMin && years <= job.experienceMax) {
    experienceScore = EXPERIENCE_WEIGHT;
  } else {
    // Partial credit that decays with distance from the band, so "one year
    // short" ranks above "eight years short".
    const distance =
      years < job.experienceMin
        ? job.experienceMin - years
        : years - job.experienceMax;
    experienceScore = Math.max(0, EXPERIENCE_WEIGHT * (1 - distance / 5));
  }

  const score = Math.round(skillScore + experienceScore);

  return {
    score: Math.min(100, Math.max(0, score)),
    reason: buildDeterministicReason(matchedSkills, requiredSkills, years, job),
    matchedSkills,
  };
}

function buildDeterministicReason(
  matchedSkills: string[],
  requiredSkills: string[],
  years: number | null,
  job: RecommendationJob,
): string {
  const parts: string[] = [];

  if (requiredSkills.length === 0) {
    parts.push("This role lists no specific skills");
  } else if (matchedSkills.length === 0) {
    parts.push(`No overlap yet with ${requiredSkills.slice(0, 3).join(", ")}`);
  } else {
    parts.push(
      `Matches ${matchedSkills.length} of ${requiredSkills.length} listed skills (${matchedSkills.slice(0, 3).join(", ")})`,
    );
  }

  if (years === null) {
    parts.push("add your years of experience for a sharper match");
  } else if (years >= job.experienceMin && years <= job.experienceMax) {
    parts.push(`your ${years} years fits the ${job.experienceMin}–${job.experienceMax} year range`);
  } else if (years < job.experienceMin) {
    parts.push(`asks for ${job.experienceMin}+ years`);
  } else {
    parts.push(`aimed at ${job.experienceMin}–${job.experienceMax} years`);
  }

  return `${parts.join("; ")}.`;
}

export function parseJobRecommendationResponse(
  content: string,
): JobRecommendationResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("The recommendation response was not valid JSON");
  }

  const result = jobRecommendationSchema.safeParse(parsed);

  if (!result.success) {
    throw new Error(
      `The recommendation response did not match the required schema: ${result.error.message}`,
    );
  }

  return {
    score: result.data.score,
    reason: result.data.reason,
    matchedSkills: result.data.matched_skills,
  };
}

export function isAIConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

/**
 * Scores one job for one candidate, preferring the LLM when configured and
 * falling back to the deterministic scorer both when it is not and when a
 * call fails — a recommendation is worth showing even if the nuanced version
 * could not be produced.
 */
export async function scoreJobForCandidate(
  candidate: RecommendationCandidate,
  job: RecommendationJob,
): Promise<JobRecommendationResult> {
  if (!hasEnoughProfileToScore(candidate)) {
    throw new InsufficientProfileError();
  }

  if (!isAIConfigured()) {
    return scoreJobForCandidateDeterministic(candidate, job);
  }

  try {
    const content = await chatCompletion(
      [
        {
          role: "system",
          content:
            "You rank open jobs for a job seeker. Reply with JSON only: " +
            '{"score": 0-100, "reason": "one sentence addressed to the candidate", "matched_skills": []}. ' +
            "Score on skill overlap and experience fit. Never invent skills the candidate did not list.",
        },
        {
          role: "user",
          content: JSON.stringify({
            candidate: {
              headline: candidate.headline,
              summary: candidate.summary?.slice(0, 2_000) ?? null,
              skills: candidate.skills,
              years_experience: candidate.yearsExperience,
            },
            job: {
              title: job.title,
              description: job.description.slice(0, 6_000),
              experience_min: job.experienceMin,
              experience_max: job.experienceMax,
              required_skills: job.requiredSkills,
            },
          }),
        },
      ],
      { response_format: { type: "json_object" }, temperature: 0 },
    );

    return parseJobRecommendationResponse(content);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.warn(
      `[recommendations] falling back to deterministic scoring: ${detail}`,
    );
    return scoreJobForCandidateDeterministic(candidate, job);
  }
}
