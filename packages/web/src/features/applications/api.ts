import { apiClient } from "../../lib/api-client";
import type {
  ApplicationSubmission,
  CandidateApplication,
  RecruiterPipelineApplication,
  SubmittedApplication,
  UpdateApplicationStageInput,
} from "../../types/applications";

interface Envelope<T> {
  data: T;
}

export async function getMyApplications(): Promise<CandidateApplication[]> {
  const { data } =
    await apiClient.get<Envelope<CandidateApplication[]>>("/applications/me");
  return data.data;
}

export async function applyToJob(
  input: ApplicationSubmission,
): Promise<SubmittedApplication> {
  const { data } = await apiClient.post<Envelope<SubmittedApplication>>(
    "/applications",
    input,
  );
  return data.data;
}

export async function getApplicationsByJob(
  jobId: string,
): Promise<RecruiterPipelineApplication[]> {
  const { data } = await apiClient.get<
    Envelope<RecruiterPipelineApplication[]>
  >(`/applications/job/${jobId}`);
  return data.data;
}

export async function updateApplicationStage({
  applicationId,
  stage,
}: UpdateApplicationStageInput): Promise<SubmittedApplication> {
  const { data } = await apiClient.patch<Envelope<SubmittedApplication>>(
    `/applications/${applicationId}/stage`,
    { stage },
  );
  return data.data;
}
