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
    refetchOnWindowFocus: "always",
    refetchInterval: 30_000,
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
  });
}
