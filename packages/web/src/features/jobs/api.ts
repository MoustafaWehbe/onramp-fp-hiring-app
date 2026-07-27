import { apiClient } from "../../lib/api-client";
import type {
  PublicJobRecord,
  RecruiterJobCreateInput,
  RecruiterJobInput,
  RecruiterJobRecord,
} from "../../types/jobs";

interface Envelope<T> {
  data: T;
}

export async function getPublicJobs(): Promise<PublicJobRecord[]> {
  const { data } = await apiClient.get<Envelope<PublicJobRecord[]>>(
    "/jobs/public",
  );
  return data.data;
}

export async function getPublicJob(id: string): Promise<PublicJobRecord> {
  const { data } = await apiClient.get<Envelope<PublicJobRecord>>(
    `/jobs/public/${id}`,
  );
  return data.data;
}

export async function getRecruiterJobs(): Promise<RecruiterJobRecord[]> {
  const { data } =
    await apiClient.get<Envelope<RecruiterJobRecord[]>>("/jobs");
  return data.data;
}

export async function getRecruiterJob(
  id: string,
): Promise<RecruiterJobRecord> {
  const { data } = await apiClient.get<Envelope<RecruiterJobRecord>>(
    `/jobs/${id}`,
  );
  return data.data;
}

export async function createRecruiterJob(
  input: RecruiterJobCreateInput,
): Promise<RecruiterJobRecord> {
  const { data } = await apiClient.post<Envelope<RecruiterJobRecord>>(
    "/jobs",
    input,
  );
  return data.data;
}

export async function updateRecruiterJob({
  id,
  input,
}: {
  id: string;
  input: RecruiterJobInput;
}): Promise<RecruiterJobRecord> {
  const { data } = await apiClient.put<Envelope<RecruiterJobRecord>>(
    `/jobs/${id}`,
    input,
  );
  return data.data;
}
