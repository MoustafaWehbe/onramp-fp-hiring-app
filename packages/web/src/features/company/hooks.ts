import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { CompanyProfileInput } from "../../types/company";
import * as api from "./api";

export const companyKeys = {
  profile: ["company", "profile"] as const,
};

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
