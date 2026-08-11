import { randomUUID } from "crypto";
import request from "supertest";
import { signAccessToken } from "@starter-kit/shared/auth";
import {
  Application,
  CandidateProfile,
  Company,
  Job,
  RecruiterCalendarConnection,
  User,
  getSequelize,
} from "@starter-kit/shared/db";
import { app } from "../../app";
import { initializeDatabase } from "../../src/lib/db";
import { decryptSecret, encryptSecret } from "../../src/lib/secret-encryption";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const CALENDAR_URL =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";

function cookie(user: User): string[] {
  return [
    `accessToken=${signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      sessionId: randomUUID(),
    })}`,
  ];
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function futureDate(days = 7): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

const suffix = randomUUID().slice(0, 8);
const originalFetch = globalThis.fetch;
const originalGoogleClientId = process.env.GOOGLE_CLIENT_ID;
const originalGoogleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const originalEncryptionKey = process.env.CALENDAR_TOKEN_ENCRYPTION_KEY;

let company: Company;
let otherCompany: Company;
let recruiter: User;
let unconnectedRecruiter: User;
let otherRecruiter: User;
let candidate: User;
let candidateProfile: CandidateProfile;
let createCalls: Array<Record<string, unknown>> = [];
let updateCalls: Array<{ url: string; body: Record<string, unknown> }> = [];
let deleteCalls: string[] = [];
let refreshFails = false;
let eventSequence = 0;

async function applicationFor(title: string): Promise<Application> {
  const job = await Job.create({
    companyId: company.id,
    createdById: recruiter.id,
    title: `${title} ${randomUUID().slice(0, 6)}`,
    description: "Calendar integration role",
    isRemote: true,
    status: "OPEN",
  });
  return Application.create({
    jobId: job.id,
    candidateProfileId: candidateProfile.id,
    stage: "APPLIED",
    submittedAt: new Date(),
  });
}

async function connectDirectly(user = recruiter): Promise<void> {
  await RecruiterCalendarConnection.upsert({
    recruiterId: user.id,
    googleRefreshToken: encryptSecret("stored-google-refresh-token"),
    googleEmail: `${user.email}.google`,
    connectedAt: new Date(),
  });
}

beforeAll(async () => {
  await initializeDatabase();
  process.env.GOOGLE_CLIENT_ID = "calendar-integration-client";
  process.env.GOOGLE_CLIENT_SECRET = "calendar-integration-secret";
  process.env.CALENDAR_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 11).toString(
    "base64",
  );

  company = await Company.create({ name: `Calendar Company ${suffix}` });
  otherCompany = await Company.create({ name: `Other Calendar Co ${suffix}` });
  recruiter = await User.create({
    email: `calendar-recruiter-${suffix}@example.com`,
    name: "Calendar Recruiter",
    passwordHash: "unused-test-hash",
    role: "RECRUITER",
    companyId: company.id,
  });
  unconnectedRecruiter = await User.create({
    email: `calendar-unconnected-${suffix}@example.com`,
    name: "Unconnected Recruiter",
    passwordHash: "unused-test-hash",
    role: "RECRUITER",
    companyId: company.id,
  });
  otherRecruiter = await User.create({
    email: `calendar-other-${suffix}@example.com`,
    name: "Other Recruiter",
    passwordHash: "unused-test-hash",
    role: "RECRUITER",
    companyId: otherCompany.id,
  });
  candidate = await User.create({
    email: `calendar-candidate-${suffix}@example.com`,
    name: "Calendar Candidate",
    passwordHash: "unused-test-hash",
    role: "CANDIDATE",
  });
  candidateProfile = await CandidateProfile.create({ userId: candidate.id });

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.startsWith(TOKEN_URL)) {
      const form = new URLSearchParams(String(init?.body ?? ""));
      if (form.get("grant_type") === "authorization_code") {
        return json(200, {
          access_token: "calendar-access-token",
          refresh_token: "oauth-calendar-refresh-token",
        });
      }
      if (refreshFails) {
        return json(400, {
          error: "invalid_grant",
          error_description: "Token has been expired or revoked.",
        });
      }
      return json(200, { access_token: "refreshed-calendar-access-token" });
    }
    if (url.startsWith(USERINFO_URL)) {
      return json(200, { email: "calendar.owner@example.com" });
    }
    if (url === `${CALENDAR_URL}?conferenceDataVersion=1&sendUpdates=all`) {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      createCalls.push(body);
      eventSequence += 1;
      return json(200, {
        id: `google-event-${eventSequence}`,
        hangoutLink: `https://meet.google.com/event-${eventSequence}`,
      });
    }
    if (url.startsWith(`${CALENDAR_URL}/`) && init?.method === "PATCH") {
      updateCalls.push({
        url,
        body: JSON.parse(String(init.body)) as Record<string, unknown>,
      });
      const eventId = decodeURIComponent(
        url.slice(`${CALENDAR_URL}/`.length).split("?")[0],
      );
      return json(200, {
        id: eventId,
        hangoutLink: "https://meet.google.com/updated-event",
      });
    }
    if (url.startsWith(`${CALENDAR_URL}/`) && init?.method === "DELETE") {
      deleteCalls.push(url);
      return new Response(null, { status: 204 });
    }

    throw new Error(`Unexpected outbound request: ${url}`);
  }) as typeof fetch;
});

beforeEach(async () => {
  await RecruiterCalendarConnection.destroy({
    where: { recruiterId: [recruiter.id, unconnectedRecruiter.id] },
  });
  createCalls = [];
  updateCalls = [];
  deleteCalls = [];
  refreshFails = false;
});

afterAll(async () => {
  globalThis.fetch = originalFetch;
  if (originalGoogleClientId === undefined) delete process.env.GOOGLE_CLIENT_ID;
  else process.env.GOOGLE_CLIENT_ID = originalGoogleClientId;
  if (originalGoogleClientSecret === undefined) {
    delete process.env.GOOGLE_CLIENT_SECRET;
  } else process.env.GOOGLE_CLIENT_SECRET = originalGoogleClientSecret;
  if (originalEncryptionKey === undefined) {
    delete process.env.CALENDAR_TOKEN_ENCRYPTION_KEY;
  } else process.env.CALENDAR_TOKEN_ENCRYPTION_KEY = originalEncryptionKey;

  await Company.destroy({ where: { id: [company.id, otherCompany.id] } });
  await User.destroy({ where: { id: candidate.id } });
  await getSequelize().close();
});

describe("Google Calendar connection", () => {
  it("uses separate offline consent and stores only encrypted refresh-token data", async () => {
    const start = await request(app)
      .get("/api/recruiter/calendar/connect")
      .set("Cookie", cookie(recruiter));

    expect(start.status).toBe(302);
    const consent = new URL(start.headers.location);
    expect(consent.origin).toBe("https://accounts.google.com");
    expect(consent.searchParams.get("access_type")).toBe("offline");
    expect(consent.searchParams.get("prompt")).toContain("consent");
    expect(consent.searchParams.get("scope")).toContain("calendar.events");
    expect(consent.searchParams.get("redirect_uri")).toContain(
      "/api/recruiter/calendar/callback",
    );

    const stateCookie = (start.headers["set-cookie"] as unknown as string[])
      .find((value) => value.startsWith("calendarOAuthState="))!
      .split(";")[0];
    const callback = await request(app)
      .get(
        `/api/recruiter/calendar/callback?code=calendar-code&state=${encodeURIComponent(
          consent.searchParams.get("state")!,
        )}`,
      )
      .set("Cookie", [stateCookie]);

    expect(callback.status).toBe(302);
    expect(new URL(callback.headers.location).searchParams.get("calendar")).toBe(
      "connected",
    );
    const stored = await RecruiterCalendarConnection.findByPk(recruiter.id);
    expect(stored?.googleEmail).toBe("calendar.owner@example.com");
    expect(stored?.googleRefreshToken).not.toContain(
      "oauth-calendar-refresh-token",
    );
    expect(decryptSecret(stored!.googleRefreshToken)).toBe(
      "oauth-calendar-refresh-token",
    );
  });

  it("reports connection state without exposing the token", async () => {
    await connectDirectly();
    const response = await request(app)
      .get("/api/recruiter/calendar/connection")
      .set("Cookie", cookie(recruiter));

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      configured: true,
      connected: true,
      googleEmail: `${recruiter.email}.google`,
    });
    expect(JSON.stringify(response.body)).not.toContain("refresh");
  });
});

describe("interview Calendar synchronization", () => {
  it("keeps phase 3 scheduling unchanged for an unconnected recruiter", async () => {
    const application = await applicationFor("Unconnected scheduling");
    const interviewDate = futureDate();
    const response = await request(app)
      .patch(`/api/applications/${application.id}/interview`)
      .set("Cookie", cookie(unconnectedRecruiter))
      .send({ interviewDate });

    expect(response.status).toBe(200);
    expect(response.body.data.interviewDate).toBe(interviewDate);
    expect(response.body.data.calendarSyncStatus).toBe("not_synced");
    expect(response.body.data.googleMeetLink).toBeNull();
    expect(createCalls).toHaveLength(0);
  });

  it("creates once, reschedules the same event, and invites the candidate", async () => {
    await connectDirectly();
    const application = await applicationFor("Create and reschedule");
    const firstDate = futureDate(8);
    const created = await request(app)
      .patch(`/api/applications/${application.id}/interview`)
      .set("Cookie", cookie(recruiter))
      .send({ interviewDate: firstDate });

    expect(created.status).toBe(200);
    expect(created.body.data.calendarSyncStatus).toBe("synced");
    expect(created.body.data.googleMeetLink).toMatch(/^https:\/\/meet.google.com/);
    expect(createCalls).toHaveLength(1);
    expect(createCalls[0].attendees).toEqual([{ email: candidate.email }]);
    expect(createCalls[0].conferenceData).toBeDefined();

    const eventId = (await application.reload()).googleEventId;
    const secondDate = futureDate(9);
    const updated = await request(app)
      .patch(`/api/applications/${application.id}/interview`)
      .set("Cookie", cookie(recruiter))
      .send({ interviewDate: secondDate });

    expect(updated.status).toBe(200);
    expect(createCalls).toHaveLength(1);
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0].url).toContain(encodeURIComponent(eventId!));
    expect((await application.reload()).googleEventId).toBe(eventId);
  });

  it("marks a revoked token failed while preserving the new interview date", async () => {
    await connectDirectly();
    const application = await applicationFor("Revoked token");
    refreshFails = true;
    const interviewDate = futureDate(10);

    const response = await request(app)
      .patch(`/api/applications/${application.id}/interview`)
      .set("Cookie", cookie(recruiter))
      .send({ interviewDate });

    expect(response.status).toBe(200);
    expect(response.body.data.interviewDate).toBe(interviewDate);
    expect(response.body.data.calendarSyncStatus).toBe("failed");
    expect(createCalls).toHaveLength(0);
  });

  it("cancels the existing event when the date is cleared", async () => {
    await connectDirectly();
    const application = await applicationFor("Cancellation");
    await request(app)
      .patch(`/api/applications/${application.id}/interview`)
      .set("Cookie", cookie(recruiter))
      .send({ interviewDate: futureDate(11) });

    const response = await request(app)
      .patch(`/api/applications/${application.id}/interview`)
      .set("Cookie", cookie(recruiter))
      .send({ interviewDate: null });

    expect(response.status).toBe(200);
    expect(response.body.data.interviewDate).toBeNull();
    expect(response.body.data.googleMeetLink).toBeNull();
    expect(deleteCalls).toHaveLength(1);
    await application.reload();
    expect(application.googleEventId).toBeNull();
    expect(application.calendarSyncStatus).toBeNull();
  });

  it("cancels the event when the application is rejected", async () => {
    await connectDirectly();
    const application = await applicationFor("Rejected interview");
    await request(app)
      .patch(`/api/applications/${application.id}/interview`)
      .set("Cookie", cookie(recruiter))
      .send({ interviewDate: futureDate(11) });

    const response = await request(app)
      .patch(`/api/applications/${application.id}/stage`)
      .set("Cookie", cookie(recruiter))
      .send({ stage: "REJECTED" });

    expect(response.status).toBe(200);
    expect(response.body.data.stage).toBe("REJECTED");
    expect(response.body.data.googleMeetLink).toBeNull();
    expect(deleteCalls).toHaveLength(1);
    expect((await application.reload()).googleEventId).toBeNull();
  });

  it("cancels scheduled events when their job closes", async () => {
    await connectDirectly();
    const application = await applicationFor("Closed job interview");
    await request(app)
      .patch(`/api/applications/${application.id}/interview`)
      .set("Cookie", cookie(recruiter))
      .send({ interviewDate: futureDate(11) });

    const response = await request(app)
      .put(`/api/jobs/${application.jobId}`)
      .set("Cookie", cookie(recruiter))
      .send({ status: "CLOSED" });

    expect(response.status).toBe(200);
    expect(deleteCalls).toHaveLength(1);
    expect((await application.reload()).googleEventId).toBeNull();
  });

  it("shows only the caller company's upcoming interviews", async () => {
    await connectDirectly();
    const application = await applicationFor("Company calendar");
    await request(app)
      .patch(`/api/applications/${application.id}/interview`)
      .set("Cookie", cookie(recruiter))
      .send({ interviewDate: futureDate(12) });

    const own = await request(app)
      .get("/api/recruiter/calendar")
      .set("Cookie", cookie(recruiter));
    const other = await request(app)
      .get("/api/recruiter/calendar")
      .set("Cookie", cookie(otherRecruiter));

    expect(own.status).toBe(200);
    expect(own.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ applicationId: application.id }),
      ]),
    );
    expect(other.status).toBe(200);
    expect(other.body.data).toEqual([]);
  });

  it("surfaces the Meet link to the owning candidate only", async () => {
    await connectDirectly();
    const application = await applicationFor("Candidate Meet link");
    await request(app)
      .patch(`/api/applications/${application.id}/interview`)
      .set("Cookie", cookie(recruiter))
      .send({ interviewDate: futureDate(13) });

    const own = await request(app)
      .get(`/api/applications/${application.id}/timeline`)
      .set("Cookie", cookie(candidate));
    expect(own.status).toBe(200);
    expect(own.body.data.googleMeetLink).toMatch(
      /^https:\/\/meet.google.com/,
    );
    expect(own.body.data).not.toHaveProperty("googleEventId");
    expect(own.body.data).not.toHaveProperty("recruiterNotes");
  });
});
