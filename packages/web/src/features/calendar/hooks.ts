import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "./api";

export const calendarKeys = {
  all: ["recruiter", "calendar"] as const,
  connection: ["recruiter", "calendar", "connection"] as const,
  interviews: ["recruiter", "calendar", "interviews"] as const,
};

export function useCalendarConnection() {
  return useQuery({
    queryKey: calendarKeys.connection,
    queryFn: api.getCalendarConnection,
    retry: false,
  });
}

export function useRecruiterCalendar() {
  return useQuery({
    queryKey: calendarKeys.interviews,
    queryFn: api.getRecruiterCalendar,
    refetchOnWindowFocus: "always",
  });
}

export function useDisconnectCalendar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.disconnectCalendar,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: calendarKeys.all });
    },
  });
}
