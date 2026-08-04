import { apiClient } from "../../lib/api-client";
import type { InterviewerAssignment } from "../../types/interviewer";

interface Envelope<T> {
  data: T;
}

export async function getMyAssignments(): Promise<InterviewerAssignment[]> {
  const { data } = await apiClient.get<Envelope<InterviewerAssignment[]>>(
    "/interviewer/assignments/me",
  );
  return data.data;
}
