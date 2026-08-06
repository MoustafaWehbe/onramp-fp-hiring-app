import { apiClient } from "../../lib/api-client";
import type {
  InterviewScorecard,
  ScorecardAggregate,
  ScorecardTemplate,
  ScorecardTemplateInput,
  ScorecardTemplateList,
  SubmitScorecardInput,
} from "../../types/scorecards";

interface Envelope<T> {
  data: T;
}

export async function getScorecardTemplates(): Promise<ScorecardTemplateList> {
  const { data } = await apiClient.get<Envelope<ScorecardTemplateList>>(
    "/scorecard-templates",
  );
  return data.data;
}

export async function createScorecardTemplate(
  input: ScorecardTemplateInput,
): Promise<ScorecardTemplate> {
  const { data } = await apiClient.post<Envelope<ScorecardTemplate>>(
    "/scorecard-templates",
    input,
  );
  return data.data;
}

export async function updateScorecardTemplate({
  id,
  input,
}: {
  id: string;
  input: ScorecardTemplateInput;
}): Promise<ScorecardTemplate> {
  const { data } = await apiClient.put<Envelope<ScorecardTemplate>>(
    `/scorecard-templates/${id}`,
    input,
  );
  return data.data;
}

export async function deleteScorecardTemplate(id: string): Promise<void> {
  await apiClient.delete(`/scorecard-templates/${id}`);
}

export async function getApplicationScorecards(
  applicationId: string,
): Promise<ScorecardAggregate> {
  const { data } = await apiClient.get<Envelope<ScorecardAggregate>>(
    `/applications/${applicationId}/scorecards`,
  );
  return data.data;
}

/**
 * PUT, not POST: a recruiter has exactly one scorecard per application, so
 * submitting again replaces their own rather than adding another.
 */
export async function submitScorecard({
  applicationId,
  ...body
}: SubmitScorecardInput): Promise<InterviewScorecard> {
  const { data } = await apiClient.put<Envelope<InterviewScorecard>>(
    `/applications/${applicationId}/scorecard`,
    body,
  );
  return data.data;
}
