import { apiClient } from "../../lib/api-client";
import type {
  RecruiterCalendarConnection,
  RecruiterCalendarInterview,
} from "../../types/calendar";

interface Envelope<T> {
  data: T;
}

export async function getCalendarConnection(): Promise<RecruiterCalendarConnection> {
  const { data } = await apiClient.get<Envelope<RecruiterCalendarConnection>>(
    "/recruiter/calendar/connection",
  );
  return data.data;
}

export async function disconnectCalendar(): Promise<void> {
  await apiClient.delete("/recruiter/calendar/connection");
}

export async function getRecruiterCalendar(): Promise<
  RecruiterCalendarInterview[]
> {
  const { data } = await apiClient.get<Envelope<RecruiterCalendarInterview[]>>(
    "/recruiter/calendar",
  );
  return data.data;
}
