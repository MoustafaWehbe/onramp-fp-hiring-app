import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type {
  CompanyProfileInput,
  SubscriptionTier,
} from "../../types/company";
import * as api from "./api";

export const companyKeys = {
  profile: ["company", "profile"] as const,
  careers: (companyId: string | undefined) =>
    ["company", "careers", companyId] as const,
};

export function useCompanyCareersPage(companyId: string | undefined) {
  return useQuery({
    queryKey: companyKeys.careers(companyId),
    queryFn: () => api.getCompanyCareersPage(companyId as string),
    enabled: Boolean(companyId),
    // A bad or unknown company id is an expected public 404 — retrying only
    // delays the not-found state. Same reasoning as usePublicJob.
    retry: false,
  });
}

export function useCompanyProfile() {
  return useQuery({
    queryKey: companyKeys.profile,
    queryFn: api.getCompanyProfile,
    retry: false,
    refetchOnWindowFocus: true,
  });
}

export function useCreateCompanyProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CompanyProfileInput) =>
      api.createCompanyProfile(input),
    onSuccess: (profile) => {
      queryClient.setQueryData(companyKeys.profile, profile);
    },
  });
}

export function useUpdateCompanyProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: CompanyProfileInput;
    }) => api.updateCompanyProfile({ id, input }),
    onSuccess: (profile) => {
      queryClient.setQueryData(companyKeys.profile, profile);
    },
  });
}

export function useUpdateCompanySubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, tier }: { id: string; tier: SubscriptionTier }) =>
      api.updateCompanySubscription({ id, tier }),
    onSuccess: (profile) => {
      // Same cache-write pattern as useUpdateCompanyProfile: every reader of
      // companyKeys.profile (sidebar, settings, locked-feature checks)
      // re-renders with the new tier in this same pass — no re-login, no
      // extra fetch.
      queryClient.setQueryData(companyKeys.profile, profile);
    },
  });
}
