import { useQuery } from "@tanstack/react-query";
import * as api from "./api";

export const interviewerKeys = {
  assignments: ["interviewer", "assignments"] as const,
};

export function useInterviewerAssignments() {
  return useQuery({
    queryKey: interviewerKeys.assignments,
    queryFn: api.getMyAssignments,
    staleTime: 0,
    refetchOnWindowFocus: "always",
    refetchInterval: 30_000,
  });
}
