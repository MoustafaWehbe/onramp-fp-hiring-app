import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "./api";
import type {
  CandidatePoolInput,
  RecruiterCandidateFilters,
} from "../../types/recruiter";

export const recruiterKeys = {
  dashboard: ["recruiter", "dashboard"] as const,
  analytics: ["recruiter", "analytics"] as const,
  candidates: ["recruiter", "candidates"] as const,
  candidateList: (filters: RecruiterCandidateFilters) =>
    [...recruiterKeys.candidates, "list", filters] as const,
  candidate: (id: string | undefined) =>
    [...recruiterKeys.candidates, "detail", id] as const,
  tags: ["recruiter", "candidate-tags"] as const,
};

export function useRecruiterDashboard() {
  return useQuery({
    queryKey: recruiterKeys.dashboard,
    queryFn: api.getRecruiterDashboard,
    staleTime: 0,
    // Live: RealtimeProvider invalidates this key on every
    // application.changed event, so the counts move without a 30s timer.
    refetchOnWindowFocus: "always",
  });
}

export function useRecruiterAnalytics() {
  return useQuery({
    queryKey: recruiterKeys.analytics,
    queryFn: api.getRecruiterAnalytics,
    // No refetchInterval: the realtime provider invalidates this on every
    // application.changed event, which is what phase 4 replaced polling with.
    staleTime: 0,
    refetchOnWindowFocus: "always",
  });
}

export function useRecruiterCandidates(
  filters: RecruiterCandidateFilters = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: recruiterKeys.candidateList(filters),
    queryFn: () => api.getRecruiterCandidates(filters),
    refetchOnWindowFocus: "always",
    // Talent pool listing is Pro-only server-side. The page passes
    // enabled: isPro so a Free company never fires a request that's
    // guaranteed to 403 — the locked state renders from the company
    // profile's tier instead of from a failed fetch.
    enabled: options.enabled ?? true,
  });
}

/** The filters RecruiterCandidatesPage requests on first load — exported so
 * the sidebar's badge peek (below) reads the exact same cache entry rather
 * than maintaining an independent copy that could drift out of sync. */
export const DEFAULT_CANDIDATE_FILTERS: RecruiterCandidateFilters = {
  poolStatus: "all",
};

/**
 * Passive cache reads for the sidebar's nav badges — `enabled: false` means
 * neither of these ever triggers its own fetch. They only surface whatever
 * is already in the React Query cache from an actual visit to the owning
 * page (Dashboard / Talent pool), so a badge is simply absent until that
 * page has been opened once this session. That's deliberate: the sidebar
 * must not add a new query just to populate a badge.
 */
export function usePeekRecruiterDashboard() {
  return useQuery({
    queryKey: recruiterKeys.dashboard,
    queryFn: api.getRecruiterDashboard,
    enabled: false,
  }).data;
}

export function usePeekRecruiterCandidateCount() {
  return useQuery({
    queryKey: recruiterKeys.candidateList(DEFAULT_CANDIDATE_FILTERS),
    queryFn: () => api.getRecruiterCandidates(DEFAULT_CANDIDATE_FILTERS),
    enabled: false,
  }).data?.length;
}

export function useRecruiterTags(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: recruiterKeys.tags,
    queryFn: api.getRecruiterTags,
    // Tags are Pro-only server-side, same reasoning as useRecruiterCandidates.
    enabled: options.enabled ?? true,
  });
}

function useInvalidateCandidateData() {
  const queryClient = useQueryClient();
  return (candidateId?: string) => {
    void queryClient.invalidateQueries({ queryKey: recruiterKeys.candidates });
    if (candidateId) {
      void queryClient.invalidateQueries({
        queryKey: recruiterKeys.candidate(candidateId),
      });
    }
  };
}

export function useCreateRecruiterTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createRecruiterTag,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: recruiterKeys.tags });
    },
  });
}

export function useDeleteRecruiterTag() {
  const queryClient = useQueryClient();
  const invalidateCandidates = useInvalidateCandidateData();
  return useMutation({
    mutationFn: api.deleteRecruiterTag,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: recruiterKeys.tags });
      invalidateCandidates();
    },
  });
}

export function useAddCandidateToPool() {
  const invalidate = useInvalidateCandidateData();
  return useMutation({
    mutationFn: (variables: {
      candidateId: string;
      input: CandidatePoolInput;
    }) => api.addCandidateToPool(variables),
    onSuccess: (_entry, variables) => invalidate(variables.candidateId),
  });
}

export function useUpdateCandidatePool() {
  const invalidate = useInvalidateCandidateData();
  return useMutation({
    mutationFn: (variables: {
      candidateId: string;
      input: CandidatePoolInput;
    }) => api.updateCandidatePool(variables),
    onSuccess: (_entry, variables) => invalidate(variables.candidateId),
  });
}

export function useRemoveCandidateFromPool() {
  const invalidate = useInvalidateCandidateData();
  return useMutation({
    mutationFn: api.removeCandidateFromPool,
    onSuccess: (_result, candidateId) => invalidate(candidateId),
  });
}

export function useInviteCandidateToApply() {
  return useMutation({ mutationFn: api.inviteCandidateToApply });
}

export function useRecruiterCandidate(id: string | undefined) {
  return useQuery({
    queryKey: recruiterKeys.candidate(id),
    queryFn: () => api.getRecruiterCandidate(id as string),
    enabled: Boolean(id),
    retry: false,
    refetchOnWindowFocus: "always",
    // A pending fit score used to be polled for here. The worker now
    // publishes when it lands, and RealtimeProvider invalidates this key.
  });
}
