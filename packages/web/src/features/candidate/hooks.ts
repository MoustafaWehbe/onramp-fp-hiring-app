import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "./api";
import type { ExperienceInput, ExperienceUpdateInput } from "../../types/candidate";

/**
 * Cache invalidation only — toasts and inline field errors are handled by
 * the components calling these mutations, since the right UX response
 * (toast vs. setError on a specific form field) depends on the call site.
 */
export const candidateKeys = {
  profile: ["candidate", "profile"] as const,
  experience: ["candidate", "experience"] as const,
  skills: ["candidate", "skills"] as const,
  skillCatalog: ["candidate", "skillCatalog"] as const,
};

export function useProfile() {
  return useQuery({
    queryKey: candidateKeys.profile,
    queryFn: api.getProfile,
    // A missing profile (404) is an expected first-visit state, not a
    // transient failure — retrying would just 404 again.
    retry: false,
  });
}

export function useCreateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createProfile,
    onSuccess: (profile) => {
      queryClient.setQueryData(candidateKeys.profile, profile);
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.updateProfile,
    onSuccess: (profile) => {
      queryClient.setQueryData(candidateKeys.profile, profile);
    },
  });
}

export function useExperience(enabled = true) {
  return useQuery({
    queryKey: candidateKeys.experience,
    queryFn: api.listExperience,
    enabled,
  });
}

export function useCreateExperience() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ExperienceInput) => api.createExperience(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: candidateKeys.experience });
    },
  });
}

export function useUpdateExperience() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ExperienceUpdateInput }) =>
      api.updateExperience(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: candidateKeys.experience });
    },
  });
}

export function useDeleteExperience() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteExperience(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: candidateKeys.experience });
    },
  });
}

/** The candidate's own currently-selected skills. */
export function useSkills(enabled = true) {
  return useQuery({
    queryKey: candidateKeys.skills,
    queryFn: api.getSkills,
    enabled,
  });
}

/** The full reference list to pick from — reference data, rarely changes. */
export function useSkillCatalog(enabled = true) {
  return useQuery({
    queryKey: candidateKeys.skillCatalog,
    queryFn: api.getSkillCatalog,
    staleTime: 5 * 60_000,
    enabled,
  });
}

export function useSetSkills() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (skillIds: string[]) => api.setSkills(skillIds),
    onSuccess: (skills) => {
      queryClient.setQueryData(candidateKeys.skills, skills);
    },
  });
}

export function useUploadResume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => api.uploadResume(file),
    onSuccess: (profile) => {
      queryClient.setQueryData(candidateKeys.profile, profile);
    },
  });
}
