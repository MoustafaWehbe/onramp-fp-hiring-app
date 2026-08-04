import { apiClient } from "../../lib/api-client";
import type {
  ApplicationTimeline,
  CandidateProfileRecord,
  EasyApplyReadiness,
  EducationInput,
  EducationRecord,
  EducationUpdateInput,
  ExperienceInput,
  ExperienceUpdateInput,
  ProfileExtrasInput,
  ProfileInput,
  RecommendationsResponse,
  SkillRecord,
  WorkExperienceRecord,
} from "../../types/candidate";

interface Envelope<T> {
  data: T;
}

export async function getProfile(): Promise<CandidateProfileRecord> {
  const { data } = await apiClient.get<Envelope<CandidateProfileRecord>>(
    "/candidate/profile",
  );
  return data.data;
}

export async function createProfile(
  input: ProfileInput,
): Promise<CandidateProfileRecord> {
  const { data } = await apiClient.post<Envelope<CandidateProfileRecord>>(
    "/candidate/profile",
    input,
  );
  return data.data;
}

export async function updateProfile(
  input: ProfileInput,
): Promise<CandidateProfileRecord> {
  const { data } = await apiClient.patch<Envelope<CandidateProfileRecord>>(
    "/candidate/profile",
    input,
  );
  return data.data;
}

export async function listExperience(): Promise<WorkExperienceRecord[]> {
  const { data } = await apiClient.get<Envelope<WorkExperienceRecord[]>>(
    "/candidate/experience",
  );
  return data.data;
}

export async function createExperience(
  input: ExperienceInput,
): Promise<WorkExperienceRecord> {
  const { data } = await apiClient.post<Envelope<WorkExperienceRecord>>(
    "/candidate/experience",
    input,
  );
  return data.data;
}

export async function updateExperience(
  id: string,
  input: ExperienceUpdateInput,
): Promise<WorkExperienceRecord> {
  const { data } = await apiClient.patch<Envelope<WorkExperienceRecord>>(
    `/candidate/experience/${id}`,
    input,
  );
  return data.data;
}

export async function deleteExperience(id: string): Promise<void> {
  await apiClient.delete(`/candidate/experience/${id}`);
}

/** The candidate's own currently-selected skills. */
export async function getSkills(): Promise<SkillRecord[]> {
  const { data } = await apiClient.get<Envelope<SkillRecord[]>>(
    "/candidate/skills",
  );
  return data.data;
}

/** Replaces the candidate's whole skill set with this exact id list. */
export async function setSkills(skillIds: string[]): Promise<SkillRecord[]> {
  const { data } = await apiClient.put<Envelope<SkillRecord[]>>(
    "/candidate/skills",
    { skillIds },
  );
  return data.data;
}

/** The full reference list to pick from — not scoped to the candidate. */
export async function getSkillCatalog(): Promise<SkillRecord[]> {
  const { data } = await apiClient.get<Envelope<SkillRecord[]>>(
    "/candidate/skills/catalog",
  );
  return data.data;
}

export async function uploadResume(
  file: File,
): Promise<CandidateProfileRecord> {
  const formData = new FormData();
  formData.append("resume", file);
  // postForm (not post) so axios sets the multipart Content-Type + boundary
  // itself, instead of inheriting apiClient's default "application/json".
  const { data } = await apiClient.postForm<
    Envelope<CandidateProfileRecord>
  >("/candidate/resume", formData);
  return data.data;
}

// ─── Education ───────────────────────────────────────────────────────────────

export async function listEducation(): Promise<EducationRecord[]> {
  const { data } =
    await apiClient.get<Envelope<EducationRecord[]>>("/candidate/education");
  return data.data;
}

export async function createEducation(
  input: EducationInput,
): Promise<EducationRecord> {
  const { data } = await apiClient.post<Envelope<EducationRecord>>(
    "/candidate/education",
    input,
  );
  return data.data;
}

export async function updateEducation(
  id: string,
  input: EducationUpdateInput,
): Promise<EducationRecord> {
  const { data } = await apiClient.patch<Envelope<EducationRecord>>(
    `/candidate/education/${id}`,
    input,
  );
  return data.data;
}

export async function deleteEducation(id: string): Promise<void> {
  await apiClient.delete(`/candidate/education/${id}`);
}

// ─── Profile extras ──────────────────────────────────────────────────────────

export async function updateProfileExtras(
  input: ProfileExtrasInput,
): Promise<CandidateProfileRecord> {
  const { data } = await apiClient.patch<Envelope<CandidateProfileRecord>>(
    "/candidate/profile/extras",
    input,
  );
  return data.data;
}

/** One-time pre-fill from parsed resume data; a no-op once already seeded. */
export async function seedProfileFromResume(): Promise<{
  seeded: boolean;
  skillsAdded: number;
  profile: CandidateProfileRecord;
}> {
  const { data} = await apiClient.post<
    Envelope<{
      seeded: boolean;
      skillsAdded: number;
      profile: CandidateProfileRecord;
    }>
  >("/candidate/profile/seed-from-resume");
  return data.data;
}

// ─── Easy Apply ──────────────────────────────────────────────────────────────

export async function getEasyApplyReadiness(): Promise<EasyApplyReadiness> {
  const { data } = await apiClient.get<Envelope<EasyApplyReadiness>>(
    "/candidate/easy-apply/readiness",
  );
  return data.data;
}

export async function easyApply(input: {
  jobId: string;
  coverLetter?: string;
}): Promise<{ id: string; jobId: string; stage: string }> {
  const { data } = await apiClient.post<
    Envelope<{ id: string; jobId: string; stage: string }>
  >("/candidate/easy-apply", input);
  return data.data;
}

// ─── Recommendations ─────────────────────────────────────────────────────────

export async function getRecommendations(
  limit?: number,
): Promise<RecommendationsResponse> {
  const { data } = await apiClient.get<Envelope<RecommendationsResponse>>(
    "/candidate/recommendations",
    limit ? { params: { limit } } : undefined,
  );
  return data.data;
}

// ─── Application timeline ────────────────────────────────────────────────────

export async function getApplicationTimeline(
  applicationId: string,
): Promise<ApplicationTimeline> {
  const { data } = await apiClient.get<Envelope<ApplicationTimeline>>(
    `/applications/${applicationId}/timeline`,
  );
  return data.data;
}
