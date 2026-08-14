import { apiClient } from "../../lib/api-client";
import type { SkillOption } from "../../types/skills";

interface Envelope<T> {
  data: T;
}

export async function searchSkills(
  query: string,
  signal?: AbortSignal,
): Promise<SkillOption[]> {
  const { data } = await apiClient.get<Envelope<SkillOption[]>>("/skills", {
    params: { q: query },
    signal,
  });
  return data.data;
}

export async function createSkill(name: string): Promise<SkillOption> {
  const { data } = await apiClient.post<Envelope<SkillOption>>("/skills", {
    name,
  });
  return data.data;
}
