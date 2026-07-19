import { apiClient } from "../../lib/api-client";
import type {
  CandidateProfileRecord,
  ExperienceInput,
  ExperienceUpdateInput,
  ProfileInput,
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
