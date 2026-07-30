import { apiClient } from "../../lib/api-client";
import type {
  ApplicationSubmission,
  CandidateApplication,
  ReplaceApplicationResumeInput,
  RescoreApplicationInput,
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
  const { resumeFile, onUploadProgress, ...fields } = input;
  const body = resumeFile ? new FormData() : fields;

  if (resumeFile && body instanceof FormData) {
    body.append("jobId", fields.jobId);
    if (fields.coverLetter) {
      body.append("coverLetter", fields.coverLetter);
    }
    body.append("resume", resumeFile);
  }

  const { data } = await apiClient.post<Envelope<SubmittedApplication>>(
    "/applications",
    body,
    resumeFile
      ? {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (event) => {
            if (event.total) {
              onUploadProgress?.(
                Math.min(100, Math.round((event.loaded / event.total) * 100)),
              );
            }
          },
        }
      : undefined,
  );
  return data.data;
}

export async function replaceApplicationResume({
  applicationId,
  file,
  onUploadProgress,
}: ReplaceApplicationResumeInput): Promise<SubmittedApplication> {
  const body = new FormData();
  body.append("resume", file);

  const { data } = await apiClient.put<Envelope<SubmittedApplication>>(
    `/applications/${applicationId}/resume`,
    body,
    {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (event) => {
        if (event.total) {
          onUploadProgress?.(
            Math.min(100, Math.round((event.loaded / event.total) * 100)),
          );
        }
      },
    },
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

export async function rescoreApplication({
  applicationId,
}: RescoreApplicationInput): Promise<RecruiterPipelineApplication> {
  const { data } = await apiClient.post<
    Envelope<RecruiterPipelineApplication>
  >(`/applications/${applicationId}/rescore`);
  return data.data;
}
