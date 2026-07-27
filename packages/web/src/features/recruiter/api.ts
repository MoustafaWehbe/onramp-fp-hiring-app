import { apiClient } from "../../lib/api-client";
import type {
  RecruiterCandidateRecord,
  RecruiterDashboardRecord,
} from "../../types/recruiter";

interface Envelope<T> {
  data: T;
}

export async function getRecruiterDashboard(): Promise<RecruiterDashboardRecord> {
  const { data } =
    await apiClient.get<Envelope<RecruiterDashboardRecord>>(
      "/recruiter/dashboard",
    );
  return data.data;
}

export async function getRecruiterCandidates(): Promise<
  RecruiterCandidateRecord[]
> {
  const { data } = await apiClient.get<Envelope<RecruiterCandidateRecord[]>>(
    "/candidate-profiles",
  );
  return data.data;
}

export async function getRecruiterCandidate(
  id: string,
): Promise<RecruiterCandidateRecord> {
  const { data } = await apiClient.get<Envelope<RecruiterCandidateRecord>>(
    `/candidate-profiles/${id}`,
  );
  return data.data;
}
