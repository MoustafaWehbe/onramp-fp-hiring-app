import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ApplicationSubmission,
  ReplaceApplicationResumeInput,
  RescoreApplicationInput,
  UpdateApplicationInterviewInput,
  UpdateApplicationStageInput,
} from "../../types/applications";
import { recruiterKeys } from "../recruiter/hooks";
import * as api from "./api";

export const applicationKeys = {
  all: ["applications"] as const,
  mine: ["applications", "mine"] as const,
  byJob: (jobId: string) => ["applications", "job", jobId] as const,
};

export function useMyApplications(enabled = true) {
  return useQuery({
    queryKey: applicationKeys.mine,
    queryFn: api.getMyApplications,
    enabled,
    // Candidates without a profile receive an expected 404 from the guard.
    retry: false,
  });
}

export function useApplyToJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ApplicationSubmission) => api.applyToJob(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: applicationKeys.mine });
    },
  });
}

export function useReplaceApplicationResume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ReplaceApplicationResumeInput) =>
      api.replaceApplicationResume(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: applicationKeys.all });
    },
  });
}

export function useApplicationsByJob(jobId: string | undefined) {
  return useQuery({
    queryKey: applicationKeys.byJob(jobId ?? ""),
    queryFn: () => api.getApplicationsByJob(jobId as string),
    enabled: Boolean(jobId),
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: "always",
    refetchInterval: jobId ? 10_000 : false,
  });
}

export function useRescoreApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RescoreApplicationInput) =>
      api.rescoreApplication(input),
    onSuccess: (_application, input) => {
      void queryClient.invalidateQueries({
        queryKey: applicationKeys.byJob(input.jobId),
      });
    },
  });
}

export function useUpdateApplicationStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateApplicationStageInput) =>
      api.updateApplicationStage(input),
    onSuccess: (_application, input) => {
      void queryClient.invalidateQueries({
        queryKey: applicationKeys.byJob(input.jobId),
      });
    },
  });
}

export function useUpdateApplicationInterview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateApplicationInterviewInput) =>
      api.updateApplicationInterview(input),
    onSuccess: (_application, input) => {
      void queryClient.invalidateQueries({
        queryKey: applicationKeys.byJob(input.jobId),
      });

      // The same application is also rendered from the candidate detail
      // endpoint, which carries its own copy of these fields.
      if (input.candidateProfileId) {
        void queryClient.invalidateQueries({
          queryKey: recruiterKeys.candidate(input.candidateProfileId),
        });
      }
    },
  });
}
