import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "./api";
import type {
  ScorecardTemplateInput,
  SubmitScorecardInput,
} from "../../types/scorecards";

export const scorecardKeys = {
  templates: ["scorecards", "templates"] as const,
  application: (applicationId: string | undefined) =>
    ["scorecards", "application", applicationId] as const,
};

export function useScorecardTemplates(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: scorecardKeys.templates,
    queryFn: api.getScorecardTemplates,
    // A company with no templates is a normal state the UI renders as
    // guidance, not a failure worth retrying.
    retry: false,
    // Scorecard templates are Pro-only server-side. RecruiterScorecardTemplatesPage
    // passes enabled: isPro so a Free company never fires a request that's
    // guaranteed to 403.
    enabled: options.enabled ?? true,
  });
}

export function useApplicationScorecards(applicationId: string | undefined) {
  return useQuery({
    queryKey: scorecardKeys.application(applicationId),
    queryFn: () => api.getApplicationScorecards(applicationId as string),
    enabled: Boolean(applicationId),
    retry: false,
  });
}

export function useCreateScorecardTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ScorecardTemplateInput) =>
      api.createScorecardTemplate(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: scorecardKeys.templates });
    },
  });
}

export function useUpdateScorecardTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ScorecardTemplateInput }) =>
      api.updateScorecardTemplate({ id, input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: scorecardKeys.templates });
    },
  });
}

export function useDeleteScorecardTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.deleteScorecardTemplate(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: scorecardKeys.templates });
    },
  });
}

export function useSubmitScorecard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SubmitScorecardInput) => api.submitScorecard(input),
    onSuccess: (_scorecard, variables) => {
      // The aggregate has changed by definition, and so has the badge on the
      // pipeline board this candidate sits on.
      void queryClient.invalidateQueries({
        queryKey: scorecardKeys.application(variables.applicationId),
      });
      void queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });
}
