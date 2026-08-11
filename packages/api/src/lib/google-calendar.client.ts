import { randomUUID } from "crypto";
import { getProviderCredentials } from "./oauth/providers";

const GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const GOOGLE_CALENDAR_API =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";
const REQUEST_TIMEOUT_MS = 10_000;

export const GOOGLE_CALENDAR_SCOPE =
  "https://www.googleapis.com/auth/calendar.events";

export class GoogleCalendarApiError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "GoogleCalendarApiError";
    this.status = status;
  }
}

export function googleCalendarCredentials() {
  return getProviderCredentials("google");
}

export function calendarOAuthCallbackUri(): string {
  const base =
    process.env.OAUTH_CALLBACK_BASE_URL ??
    process.env.CORS_ORIGIN ??
    "http://localhost:5173";
  return `${base.replace(/\/$/, "")}/api/recruiter/calendar/callback`;
}

export function googleCalendarAuthorizeUrl(state: string): string {
  const credentials = googleCalendarCredentials();
  if (!credentials) {
    throw new GoogleCalendarApiError("Google OAuth is not configured");
  }

  const url = new URL(GOOGLE_AUTHORIZE_URL);
  url.searchParams.set("client_id", credentials.clientId);
  url.searchParams.set("redirect_uri", calendarOAuthCallbackUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set(
    "scope",
    `openid email ${GOOGLE_CALENDAR_SCOPE}`,
  );
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "consent select_account");
  url.searchParams.set("state", state);
  return url.toString();
}

async function responseBody(response: Response): Promise<Record<string, unknown>> {
  return (await response.json().catch(() => ({}))) as Record<string, unknown>;
}

async function providerFetch(
  url: string,
  init: RequestInit,
): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new GoogleCalendarApiError(
      error instanceof Error ? error.message : "Google request failed",
    );
  }

  const body = await responseBody(response);
  if (!response.ok) {
    const nested = body.error;
    const detail =
      nested && typeof nested === "object" && "message" in nested
        ? String((nested as { message?: unknown }).message)
        : typeof body.error_description === "string"
          ? body.error_description
          : `Google responded with status ${response.status}`;
    throw new GoogleCalendarApiError(detail, response.status);
  }

  return body;
}

function requiredString(
  value: unknown,
  message: string,
): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new GoogleCalendarApiError(message);
  }
  return value;
}

export interface GoogleCalendarTokens {
  accessToken: string;
  refreshToken: string;
}

export async function exchangeCalendarAuthorizationCode(
  code: string,
): Promise<GoogleCalendarTokens> {
  const credentials = googleCalendarCredentials();
  if (!credentials) {
    throw new GoogleCalendarApiError("Google OAuth is not configured");
  }

  const body = await providerFetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: calendarOAuthCallbackUri(),
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
    }).toString(),
  });

  return {
    accessToken: requiredString(
      body.access_token,
      "Google token exchange returned no access token",
    ),
    refreshToken: requiredString(
      body.refresh_token,
      "Google returned no refresh token; reconnect with calendar consent",
    ),
  };
}

export async function refreshGoogleAccessToken(
  refreshToken: string,
): Promise<string> {
  const credentials = googleCalendarCredentials();
  if (!credentials) {
    throw new GoogleCalendarApiError("Google OAuth is not configured");
  }

  const body = await providerFetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
    }).toString(),
  });

  return requiredString(
    body.access_token,
    "Google token refresh returned no access token",
  );
}

export async function fetchGoogleEmail(accessToken: string): Promise<string> {
  const body = await providerFetch(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  return requiredString(body.email, "Google userinfo returned no email");
}

export interface CalendarEventInput {
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  interviewDate: Date;
}

export interface CalendarEventResult {
  eventId: string;
  meetLink: string | null;
}

function eventBody(input: CalendarEventInput, requestMeet: boolean) {
  const end = new Date(input.interviewDate.getTime() + 60 * 60 * 1000);
  return {
    summary: `Interview: ${input.candidateName} — ${input.jobTitle}`,
    description: `HireFlow interview for ${input.candidateName} and the ${input.jobTitle} role.`,
    start: { dateTime: input.interviewDate.toISOString() },
    end: { dateTime: end.toISOString() },
    attendees: [{ email: input.candidateEmail }],
    ...(requestMeet
      ? {
          conferenceData: {
            createRequest: {
              requestId: randomUUID().replace(/-/g, ""),
              conferenceSolutionKey: { type: "hangoutsMeet" },
            },
          },
        }
      : {}),
  };
}

function eventResult(body: Record<string, unknown>): CalendarEventResult {
  const eventId = requiredString(body.id, "Google Calendar returned no event id");
  const hangoutLink =
    typeof body.hangoutLink === "string" ? body.hangoutLink : null;
  const conferenceData = body.conferenceData;
  const entryPoints =
    conferenceData &&
    typeof conferenceData === "object" &&
    Array.isArray((conferenceData as { entryPoints?: unknown }).entryPoints)
      ? (conferenceData as { entryPoints: Array<Record<string, unknown>> })
          .entryPoints
      : [];
  const video = entryPoints.find(
    (entry) => entry.entryPointType === "video" && typeof entry.uri === "string",
  );

  return {
    eventId,
    meetLink: hangoutLink ?? (typeof video?.uri === "string" ? video.uri : null),
  };
}

export class GoogleCalendarClient {
  async createEvent(
    accessToken: string,
    input: CalendarEventInput,
  ): Promise<CalendarEventResult> {
    const body = await providerFetch(
      `${GOOGLE_CALENDAR_API}?conferenceDataVersion=1&sendUpdates=all`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(eventBody(input, true)),
      },
    );
    return eventResult(body);
  }

  async updateEvent(
    accessToken: string,
    eventId: string,
    input: CalendarEventInput,
  ): Promise<CalendarEventResult> {
    const encodedId = encodeURIComponent(eventId);
    const body = await providerFetch(
      `${GOOGLE_CALENDAR_API}/${encodedId}?conferenceDataVersion=1&sendUpdates=all`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(eventBody(input, false)),
      },
    );
    return eventResult(body);
  }

  async deleteEvent(accessToken: string, eventId: string): Promise<void> {
    const encodedId = encodeURIComponent(eventId);
    try {
      await providerFetch(
        `${GOOGLE_CALENDAR_API}/${encodedId}?sendUpdates=all`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
        },
      );
    } catch (error) {
      if (
        error instanceof GoogleCalendarApiError &&
        (error.status === 404 || error.status === 410)
      ) {
        return;
      }
      throw error;
    }
  }
}

export const googleCalendarClient = new GoogleCalendarClient();
