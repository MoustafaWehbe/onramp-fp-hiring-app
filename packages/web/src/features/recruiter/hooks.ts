import { useQuery } from "@tanstack/react-query";
import * as api from "./api";

export const recruiterKeys = {
  dashboard: ["recruiter", "dashboard"] as const,
  candidates: ["recruiter", "candidates"] as const,
  candidate: (id: string | undefined) =>
    [...recruiterKeys.candidates, id] as const,
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

export function useRecruiterCandidates() {
  return useQuery({
    queryKey: recruiterKeys.candidates,
    queryFn: api.getRecruiterCandidates,
    refetchOnWindowFocus: "always",
  });
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
