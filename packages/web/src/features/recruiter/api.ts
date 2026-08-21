import { apiClient } from "../../lib/api-client";
import type {
  RecruiterAnalyticsRecord,
  RecruiterReportFilters,
  RecruiterReportRecord,
} from "../../types/analytics";
import type {
  CandidatePoolEntryRecord,
  CandidatePoolInput,
  CandidateTagRecord,
  RecruiterCandidateRecord,
  RecruiterCandidateFilters,
  RecruiterDashboardRecord,
} from "../../types/recruiter";
import type { NotificationRecord } from "../../types/notifications";

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

export async function getRecruiterAnalytics(): Promise<RecruiterAnalyticsRecord> {
  const { data } = await apiClient.get<Envelope<RecruiterAnalyticsRecord>>(
    "/recruiter/analytics",
  );
  return data.data;
}

export async function getRecruiterReport(
  filters: RecruiterReportFilters,
): Promise<RecruiterReportRecord> {
  const { data } = await apiClient.get<Envelope<RecruiterReportRecord>>(
    "/recruiter/reports",
    { params: filters },
  );
  return data.data;
}

export async function downloadRecruiterReportCsv(
  filters: RecruiterReportFilters,
): Promise<Blob> {
  const { data } = await apiClient.get<Blob>("/recruiter/reports", {
    params: { ...filters, format: "csv" },
    responseType: "blob",
  });
  return data;
}

export async function getRecruiterCandidates(
  filters: RecruiterCandidateFilters = {},
): Promise<
  RecruiterCandidateRecord[]
> {
  const { data } = await apiClient.get<Envelope<RecruiterCandidateRecord[]>>(
    "/recruiter/candidates",
    { params: filters },
  );
  return data.data;
}

export async function getRecruiterCandidate(
  id: string,
): Promise<RecruiterCandidateRecord> {
  const { data } = await apiClient.get<Envelope<RecruiterCandidateRecord>>(
    `/recruiter/candidates/${id}`,
  );
  return data.data;
}

export async function getRecruiterTags(): Promise<CandidateTagRecord[]> {
  const { data } = await apiClient.get<Envelope<CandidateTagRecord[]>>(
    "/recruiter/tags",
  );
  return data.data;
}

export async function createRecruiterTag(
  label: string,
): Promise<CandidateTagRecord> {
  const { data } = await apiClient.post<Envelope<CandidateTagRecord>>(
    "/recruiter/tags",
    { label },
  );
  return data.data;
}

export async function deleteRecruiterTag(tagId: string): Promise<void> {
  await apiClient.delete(`/recruiter/tags/${tagId}`);
}

export async function addCandidateToPool({
  candidateId,
  input,
}: {
  candidateId: string;
  input: CandidatePoolInput;
}): Promise<CandidatePoolEntryRecord> {
  const { data } = await apiClient.post<Envelope<CandidatePoolEntryRecord>>(
    `/recruiter/candidates/${candidateId}/pool`,
    input,
  );
  return data.data;
}

export async function updateCandidatePool({
  candidateId,
  input,
}: {
  candidateId: string;
  input: CandidatePoolInput;
}): Promise<CandidatePoolEntryRecord> {
  const { data } = await apiClient.patch<Envelope<CandidatePoolEntryRecord>>(
    `/recruiter/candidates/${candidateId}/pool`,
    input,
  );
  return data.data;
}

export async function removeCandidateFromPool(
  candidateId: string,
): Promise<void> {
  await apiClient.delete(`/recruiter/candidates/${candidateId}/pool`);
}

export async function inviteCandidateToApply({
  candidateId,
  jobId,
}: {
  candidateId: string;
  jobId: string;
}): Promise<NotificationRecord> {
  const { data } = await apiClient.post<Envelope<NotificationRecord>>(
    `/recruiter/candidates/${candidateId}/invite`,
    { jobId },
  );
  return data.data;
}
