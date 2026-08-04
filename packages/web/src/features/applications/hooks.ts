import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ApplicationSubmission,
  RecruiterPipelineApplication,
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
    // Phase 2 polled this every 10s. RealtimeProvider now invalidates the
    // key when the server pushes an application.changed event, so the
    // refetch happens because something actually changed. The focus refetch
    // stays as the belt-and-braces path for a tab that was asleep.
    refetchOnWindowFocus: "always",
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

/**
 * Optimistic because a Kanban card must land in its new column on drop —
 * waiting for a round trip reads as the drag having failed. The cached list
 * is snapshotted first so a server rejection can put the card back exactly
 * where it was.
 *
 * The same hook still backs the button-based transition, so both paths share
 * one mutation and one rollback.
 */
export function useUpdateApplicationStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateApplicationStageInput) =>
      api.updateApplicationStage(input),
    onMutate: async (input) => {
      const queryKey = applicationKeys.byJob(input.jobId);

      // Stop a refetch in flight from landing on top of the optimistic edit.
      await queryClient.cancelQueries({ queryKey });
      const previous =
        queryClient.getQueryData<RecruiterPipelineApplication[]>(queryKey);

      if (previous) {
        queryClient.setQueryData<RecruiterPipelineApplication[]>(
          queryKey,
          previous.map((application) =>
            application.id === input.applicationId
              ? { ...application, stage: input.stage }
              : application,
          ),
        );
      }

      return { previous, queryKey };
    },
    onError: (_error, _input, context) => {
      // Restore the whole list rather than flipping the one card back: the
      // snapshot is the last state the server actually confirmed.
      if (context?.previous) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }
    },
    onSettled: (_application, _error, input) => {
      // Success or failure, the server is the authority on ordering and on
      // fields the optimistic edit did not touch.
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
