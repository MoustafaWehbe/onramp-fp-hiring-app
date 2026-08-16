import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "./api";
import type {
  EducationInput,
  EducationUpdateInput,
  ExperienceInput,
  ExperienceUpdateInput,
} from "../../types/candidate";

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
  education: ["candidate", "education"] as const,
  easyApplyReadiness: ["candidate", "easyApplyReadiness"] as const,
  recommendations: ["candidate", "recommendations"] as const,
  timeline: (applicationId: string | undefined) =>
    ["candidate", "timeline", applicationId] as const,
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

// ─── Education ───────────────────────────────────────────────────────────────

export function useEducation(enabled = true) {
  return useQuery({
    queryKey: candidateKeys.education,
    queryFn: api.listEducation,
    enabled,
    retry: false,
  });
}

export function useCreateEducation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: EducationInput) => api.createEducation(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: candidateKeys.education });
    },
  });
}

export function useUpdateEducation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; data: EducationUpdateInput }) =>
      api.updateEducation(input.id, input.data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: candidateKeys.education });
    },
  });
}

export function useDeleteEducation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteEducation(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: candidateKeys.education });
    },
  });
}

// ─── Profile extras ──────────────────────────────────────────────────────────

export function useUpdateProfileExtras() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.updateProfileExtras,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: candidateKeys.profile });
    },
  });
}

/**
 * Runs the one-time pre-fill, then refreshes profile and skills. Safe to call
 * on every visit: the server no-ops once a profile has been seeded, which is
 * what stops it from ever overwriting an edit.
 */
export function useSeedProfileFromResume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.seedProfileFromResume,
    onSuccess: (result) => {
      if (result.seeded) {
        void queryClient.invalidateQueries({ queryKey: candidateKeys.profile });
        void queryClient.invalidateQueries({ queryKey: candidateKeys.skills });
      }
    },
  });
}

// ─── Easy Apply ──────────────────────────────────────────────────────────────

export function useEasyApplyReadiness(enabled = true) {
  return useQuery({
    queryKey: candidateKeys.easyApplyReadiness,
    queryFn: api.getEasyApplyReadiness,
    enabled,
    // A candidate with no profile gets an expected 404 from the guard.
    retry: false,
  });
}

export function useEasyApply() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.easyApply,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["applications"] });
      // A job just applied to must drop out of the recommendations.
      void queryClient.invalidateQueries({
        queryKey: candidateKeys.recommendations,
      });
    },
  });
}

// ─── Recommendations ─────────────────────────────────────────────────────────

export function useRecommendations(limit?: number, enabled = true) {
  return useQuery({
    queryKey: [...candidateKeys.recommendations, limit ?? null],
    queryFn: () => api.getRecommendations(limit),
    enabled,
    retry: false,
    // A first visit queues the scoring job, so poll briefly until it lands
    // rather than leaving the candidate on an empty panel. Stops as soon as
    // there is something to show.
    refetchInterval: (query) =>
      query.state.data?.status === "computing" ? 4_000 : false,
  });
}

// ─── AI resume review ────────────────────────────────────────────────────────

/**
 * A plain mutation, not a query: its result belongs only in whichever
 * component called it. There is no query key and nothing is cached, so
 * navigating away (or asking again) discards the previous result rather than
 * quietly reusing it.
 */
export function useReviewResumeForJob() {
  return useMutation({
    mutationFn: api.reviewResumeForJob,
  });
}

// ─── Application timeline ────────────────────────────────────────────────────

export function useApplicationTimeline(
  applicationId: string | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: candidateKeys.timeline(applicationId),
    queryFn: () => api.getApplicationTimeline(applicationId as string),
    enabled: Boolean(applicationId) && enabled,
    retry: false,
  });
}
