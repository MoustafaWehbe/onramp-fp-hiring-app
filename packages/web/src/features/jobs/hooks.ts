import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import * as api from "./api";
import type {
  RecruiterJobCreateInput,
  RecruiterJobInput,
} from "../../types/jobs";

export const jobKeys = {
  public: ["jobs", "public"] as const,
  publicDetail: (id: string | undefined) =>
    [...jobKeys.public, id] as const,
  recruiter: ["jobs", "recruiter"] as const,
  recruiterDetail: (id: string | undefined) =>
    [...jobKeys.recruiter, id] as const,
};

export function usePublicJobs() {
  return useQuery({
    queryKey: jobKeys.public,
    queryFn: api.getPublicJobs,
  });
}

export function usePublicJob(id: string | undefined) {
  return useQuery({
    queryKey: jobKeys.publicDetail(id),
    queryFn: () => api.getPublicJob(id as string),
    enabled: Boolean(id),
    // A missing or closed job is an expected public 404, so retrying it only
    // delays the role-not-found state.
    retry: false,
  });
}

export function useRecruiterJobs() {
  return useQuery({
    queryKey: jobKeys.recruiter,
    queryFn: api.getRecruiterJobs,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useRecruiterJob(id: string | undefined) {
  return useQuery({
    queryKey: jobKeys.recruiterDetail(id),
    queryFn: () => api.getRecruiterJob(id as string),
    enabled: Boolean(id),
    retry: false,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}

export function useCreateRecruiterJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: RecruiterJobCreateInput) =>
      api.createRecruiterJob(input),
    onSuccess: (job) => {
      queryClient.setQueryData(jobKeys.recruiterDetail(job.id), job);
      void queryClient.invalidateQueries({ queryKey: jobKeys.recruiter });
      void queryClient.invalidateQueries({ queryKey: jobKeys.public });
    },
  });
}

export function useUpdateRecruiterJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: RecruiterJobInput;
    }) => api.updateRecruiterJob({ id, input }),
    onSuccess: (job) => {
      queryClient.setQueryData(jobKeys.recruiterDetail(job.id), job);
      void queryClient.invalidateQueries({ queryKey: jobKeys.recruiter });
      void queryClient.invalidateQueries({ queryKey: jobKeys.public });
    },
  });
}
