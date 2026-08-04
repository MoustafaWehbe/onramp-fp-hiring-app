import { randomUUID } from "crypto";
import { once } from "events";
import { createServer, get as httpGet, type IncomingMessage } from "http";
import type { AddressInfo } from "net";
import request from "supertest";
import { signAccessToken } from "@starter-kit/shared/auth";
import {
  Application,
  CandidateProfile,
  Company,
  Job,
  Notification,
  User,
  getSequelize,
} from "@starter-kit/shared/db";
import {
  closeRealtime,
  publishRealtime,
  subscribeRealtime,
  type RealtimeMessage,
} from "@starter-kit/shared/realtime";
import { app } from "../../app";
import { initializeDatabase } from "../../src/lib/db";
import { notificationService } from "../../src/services/notifications.service";
import { closeRealtimeClients } from "../../src/services/realtime.service";

function cookie(token: string): string[] {
  return [`accessToken=${token}`];
}

function tokenFor(user: User): string {
  return signAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    sessionId: randomUUID(),
  });
}

/**
 * Collects what a block publishes to the Redis bus, so a test can assert on
 * the exact recipients an event was addressed to.
 *
 * Jest runs suites in parallel against one Redis channel, so the capture is
 * filtered to the application under test — asserting on total bus silence
 * would pick up whatever another suite happened to publish.
 */
async function captureRealtime(
  applicationId: string,
  run: () => Promise<void>,
): Promise<RealtimeMessage[]> {
  const captured: RealtimeMessage[] = [];
  const unsubscribe = subscribeRealtime((message) => {
    const payload = message.event.payload as {
      applicationId?: string;
      relatedApplicationId?: string | null;
    };

    if (
      payload.applicationId === applicationId ||
      payload.relatedApplicationId === applicationId
    ) {
      captured.push(message);
    }
  });

  await run();
  // Pub/sub delivery is asynchronous; give the subscriber a tick to drain.
  await new Promise((resolve) => setTimeout(resolve, 300));
  unsubscribe();

  return captured;
}

let company: Company;
let otherCompany: Company;
let recruiter: User;
let secondRecruiter: User;
let otherCompanyRecruiter: User;
let candidate: User;
let candidateProfile: CandidateProfile;
let recruiterToken: string;
let secondRecruiterToken: string;
let otherCompanyRecruiterToken: string;
let candidateToken: string;

const createdCompanyIds: string[] = [];
const createdUserIds: string[] = [];
const createdCandidateProfileIds: string[] = [];
const createdJobIds: string[] = [];
let databaseInitialized = false;

async function createTrackedJob(): Promise<Job> {
  const created = await Job.create({
    companyId: company.id,
    createdById: recruiter.id,
    title: `Notifications Job ${randomUUID()}`,
    description: "Notifications integration-test job",
    location: "Remote",
    status: "OPEN",
  });
  createdJobIds.push(created.id);
  return created;
}

/**
 * A candidate may hold only one application per job, so each case gets its
 * own job rather than reusing one.
 */
async function createSubmittedApplication(
  stage: "APPLIED" | "DRAFT" = "APPLIED",
): Promise<Application> {
  const ownJob = await createTrackedJob();

  return Application.create({
    jobId: ownJob.id,
    candidateProfileId: candidateProfile.id,
    stage,
    submittedAt: stage === "DRAFT" ? undefined : new Date(),
    aiScoringStatus: "failed",
  });
}

beforeAll(async () => {
  await initializeDatabase();
  databaseInitialized = true;

  const suffix = randomUUID();

  company = await Company.create({
    name: `Notifications Company ${suffix}`,
    website: "https://notifications.example.com",
  });
  createdCompanyIds.push(company.id);

  otherCompany = await Company.create({
    name: `Other Notifications Company ${suffix}`,
    website: "https://other-notifications.example.com",
  });
  createdCompanyIds.push(otherCompany.id);

  recruiter = await User.create({
    email: `notif-recruiter-${suffix}@example.com`,
    passwordHash: "unused-in-these-tests",
    name: "Notifications Recruiter",
    role: "RECRUITER",
    companyId: company.id,
  });
  createdUserIds.push(recruiter.id);

  secondRecruiter = await User.create({
    email: `notif-recruiter-two-${suffix}@example.com`,
    passwordHash: "unused-in-these-tests",
    name: "Second Notifications Recruiter",
    role: "RECRUITER",
    companyId: company.id,
  });
  createdUserIds.push(secondRecruiter.id);

  otherCompanyRecruiter = await User.create({
    email: `notif-other-recruiter-${suffix}@example.com`,
    passwordHash: "unused-in-these-tests",
    name: "Other Company Recruiter",
    role: "RECRUITER",
    companyId: otherCompany.id,
  });
  createdUserIds.push(otherCompanyRecruiter.id);

  candidate = await User.create({
    email: `notif-candidate-${suffix}@example.com`,
    passwordHash: "unused-in-these-tests",
    name: "Notifications Candidate",
    role: "CANDIDATE",
  });
  createdUserIds.push(candidate.id);

  candidateProfile = await CandidateProfile.create({
    userId: candidate.id,
    headline: "Notifications Candidate",
  });
  createdCandidateProfileIds.push(candidateProfile.id);

  recruiterToken = tokenFor(recruiter);
  secondRecruiterToken = tokenFor(secondRecruiter);
  otherCompanyRecruiterToken = tokenFor(otherCompanyRecruiter);
  candidateToken = tokenFor(candidate);
});

afterEach(async () => {
  await Notification.destroy({ where: { userId: createdUserIds } });
});

afterAll(async () => {
  if (!databaseInitialized) {
    return;
  }

  try {
    await Notification.destroy({ where: { userId: createdUserIds } });
    if (createdJobIds.length > 0) {
      await Application.destroy({ where: { jobId: createdJobIds } });
      await Job.destroy({ where: { id: createdJobIds } });
    }
    if (createdCandidateProfileIds.length > 0) {
      await CandidateProfile.destroy({
        where: { id: createdCandidateProfileIds },
      });
    }
    if (createdUserIds.length > 0) {
      await User.destroy({ where: { id: createdUserIds } });
    }
    if (createdCompanyIds.length > 0) {
      await Company.destroy({ where: { id: createdCompanyIds } });
    }
  } finally {
    closeRealtimeClients();
    await closeRealtime();
    await getSequelize().close();
  }
});

describe("notification creation from domain events", () => {
  it("notifies every recruiter at the owning company on a new application", async () => {
    const application = await createSubmittedApplication();

    const messages = await captureRealtime(application.id, async () => {
      await notificationService.recordNewApplication(application.id);
    });

    const rows = await Notification.findAll({
      where: { relatedApplicationId: application.id },
    });

    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.userId).sort()).toEqual(
      [recruiter.id, secondRecruiter.id].sort(),
    );
    expect(rows.every((row) => row.type === "new_application")).toBe(true);
    expect(rows[0].title).toContain(candidate.name);
    expect(rows.every((row) => row.readAt === null)).toBe(true);

    // A recruiter at another company is never even addressed.
    const addressed = new Set(messages.flatMap((message) => message.userIds));
    expect(addressed.has(recruiter.id)).toBe(true);
    expect(addressed.has(secondRecruiter.id)).toBe(true);
    expect(addressed.has(otherCompanyRecruiter.id)).toBe(false);
    expect(addressed.has(candidate.id)).toBe(false);
  });

  it("notifies the owning candidate on a stage change and pushes the row to recruiters", async () => {
    const application = await createSubmittedApplication();
    await application.update({ stage: "INTERVIEWING" });

    const messages = await captureRealtime(application.id, async () => {
      await notificationService.recordStageChange(application.id, "APPLIED");
    });

    const rows = await Notification.findAll({
      where: { relatedApplicationId: application.id },
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      userId: candidate.id,
      type: "stage_change",
      readAt: null,
    });
    expect(rows[0].title).toContain("interviewing");
    expect(rows[0].body).toContain("applied");

    const notificationEvent = messages.find(
      (message) => message.event.name === "notification",
    );
    expect(notificationEvent?.userIds).toEqual([candidate.id]);

    const pipelineEvent = messages.find(
      (message) => message.event.name === "application.changed",
    );
    expect(pipelineEvent?.userIds.sort()).toEqual(
      [recruiter.id, secondRecruiter.id].sort(),
    );
    expect(pipelineEvent?.event.payload).toMatchObject({
      applicationId: application.id,
      jobId: application.jobId,
      stage: "INTERVIEWING",
    });
  });

  it("creates no notification when the stage did not actually change", async () => {
    const application = await createSubmittedApplication();

    await notificationService.recordStageChange(application.id, "APPLIED");

    expect(
      await Notification.count({
        where: { relatedApplicationId: application.id },
      }),
    ).toBe(0);
  });

  it("orders two rapid stage changes correctly and drops neither", async () => {
    const application = await createSubmittedApplication();

    await application.update({ stage: "INTERVIEWING" });
    await notificationService.recordStageChange(application.id, "APPLIED");
    await application.update({ stage: "OFFER" });
    await notificationService.recordStageChange(
      application.id,
      "INTERVIEWING",
    );

    const page = await notificationService.list(candidate.id, {
      limit: 20,
      offset: 0,
      status: "all",
    });

    expect(page.notifications).toHaveLength(2);
    // Newest first: the OFFER move must lead even when both rows share a
    // created_at to the millisecond.
    expect(page.notifications[0].title).toContain("offer");
    expect(page.notifications[1].title).toContain("interviewing");
  });

  it("keeps a DRAFT application invisible to recruiters", async () => {
    const draft = await createSubmittedApplication("DRAFT");

    const messages = await captureRealtime(draft.id, async () => {
      await notificationService.recordNewApplication(draft.id);
      await notificationService.broadcastApplicationChange(draft.id);
    });

    expect(
      await Notification.count({ where: { relatedApplicationId: draft.id } }),
    ).toBe(0);
    expect(messages).toHaveLength(0);
  });
});

describe("GET /api/notifications", () => {
  it("requires authentication", async () => {
    const res = await request(app).get("/api/notifications");
    expect(res.status).toBe(401);
  });

  it("returns only the caller's notifications with an unread count", async () => {
    const application = await createSubmittedApplication();
    await notificationService.recordNewApplication(application.id);

    const mine = await request(app)
      .get("/api/notifications")
      .set("Cookie", cookie(recruiterToken));

    expect(mine.status).toBe(200);
    expect(mine.body.data.notifications).toHaveLength(1);
    expect(mine.body.data).toMatchObject({
      total: 1,
      unreadCount: 1,
      hasMore: false,
    });
    expect(mine.body.data.notifications[0]).toMatchObject({
      type: "new_application",
      relatedApplicationId: application.id,
      relatedJobId: application.jobId,
      readAt: null,
    });

    // Same event, different recipient — each sees exactly their own row.
    const other = await request(app)
      .get("/api/notifications")
      .set("Cookie", cookie(secondRecruiterToken));
    expect(other.body.data.notifications).toHaveLength(1);
    expect(other.body.data.notifications[0].id).not.toBe(
      mine.body.data.notifications[0].id,
    );

    const uninvolved = await request(app)
      .get("/api/notifications")
      .set("Cookie", cookie(otherCompanyRecruiterToken));
    expect(uninvolved.body.data.notifications).toHaveLength(0);
    expect(uninvolved.body.data.unreadCount).toBe(0);
  });

  it("paginates instead of returning every row at once", async () => {
    await Notification.bulkCreate(
      Array.from({ length: 25 }, (_, index) => ({
        userId: recruiter.id,
        type: "new_application" as const,
        title: `Bulk notification ${index}`,
      })),
    );

    const firstPage = await request(app)
      .get("/api/notifications?limit=10")
      .set("Cookie", cookie(recruiterToken));

    expect(firstPage.status).toBe(200);
    expect(firstPage.body.data.notifications).toHaveLength(10);
    expect(firstPage.body.data).toMatchObject({
      total: 25,
      limit: 10,
      offset: 0,
      hasMore: true,
    });

    const lastPage = await request(app)
      .get("/api/notifications?limit=10&offset=20")
      .set("Cookie", cookie(recruiterToken));
    expect(lastPage.body.data.notifications).toHaveLength(5);
    expect(lastPage.body.data.hasMore).toBe(false);

    const overLimit = await request(app)
      .get("/api/notifications?limit=500")
      .set("Cookie", cookie(recruiterToken));
    expect(overLimit.status).toBe(422);
  });

  it("filters by read state", async () => {
    const unread = await Notification.create({
      userId: recruiter.id,
      type: "new_application",
      title: "Still unread",
    });
    await Notification.create({
      userId: recruiter.id,
      type: "new_application",
      title: "Already read",
      readAt: new Date(),
    });

    const unreadOnly = await request(app)
      .get("/api/notifications?status=unread")
      .set("Cookie", cookie(recruiterToken));
    expect(
      unreadOnly.body.data.notifications.map((n: { id: string }) => n.id),
    ).toEqual([unread.id]);

    const readOnly = await request(app)
      .get("/api/notifications?status=read")
      .set("Cookie", cookie(recruiterToken));
    expect(readOnly.body.data.notifications).toHaveLength(1);
    expect(readOnly.body.data.notifications[0].title).toBe("Already read");
  });

  it("returns an empty page rather than an error for a user with none", async () => {
    const res = await request(app)
      .get("/api/notifications")
      .set("Cookie", cookie(candidateToken));

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      notifications: [],
      total: 0,
      unreadCount: 0,
      hasMore: false,
    });
  });

  it("still reports a notification whose application was deleted", async () => {
    const application = await createSubmittedApplication();
    await notificationService.recordNewApplication(application.id);
    await application.destroy();

    const res = await request(app)
      .get("/api/notifications")
      .set("Cookie", cookie(recruiterToken));

    expect(res.status).toBe(200);
    expect(res.body.data.notifications).toHaveLength(1);
    // Nulled by ON DELETE SET NULL, so the client can render it inert
    // instead of linking somewhere that 404s.
    expect(res.body.data.notifications[0]).toMatchObject({
      relatedApplicationId: null,
      relatedJobId: null,
    });
  });
});

describe("marking notifications read", () => {
  it("marks one notification read and refuses another user's", async () => {
    const mine = await Notification.create({
      userId: recruiter.id,
      type: "new_application",
      title: "Mine to read",
    });
    const theirs = await Notification.create({
      userId: secondRecruiter.id,
      type: "new_application",
      title: "Not mine",
    });

    const res = await request(app)
      .patch(`/api/notifications/${mine.id}/read`)
      .set("Cookie", cookie(recruiterToken));

    expect(res.status).toBe(200);
    expect(res.body.data.readAt).not.toBeNull();
    await mine.reload();
    expect(mine.readAt).toBeInstanceOf(Date);

    const forbidden = await request(app)
      .patch(`/api/notifications/${theirs.id}/read`)
      .set("Cookie", cookie(recruiterToken));
    expect(forbidden.status).toBe(404);

    await theirs.reload();
    expect(theirs.readAt).toBeNull();

    const missing = await request(app)
      .patch(`/api/notifications/${randomUUID()}/read`)
      .set("Cookie", cookie(recruiterToken));
    expect(missing.status).toBe(404);
  });

  it("marks all of the caller's unread notifications and no one else's", async () => {
    await Notification.bulkCreate([
      { userId: recruiter.id, type: "new_application", title: "One" },
      { userId: recruiter.id, type: "new_application", title: "Two" },
      { userId: secondRecruiter.id, type: "new_application", title: "Theirs" },
    ]);

    const res = await request(app)
      .patch("/api/notifications/read-all")
      .set("Cookie", cookie(recruiterToken));

    expect(res.status).toBe(200);
    expect(res.body.data.updated).toBe(2);

    expect(
      await Notification.count({
        where: { userId: recruiter.id, readAt: null },
      }),
    ).toBe(0);
    expect(
      await Notification.count({
        where: { userId: secondRecruiter.id, readAt: null },
      }),
    ).toBe(1);

    const after = await request(app)
      .get("/api/notifications")
      .set("Cookie", cookie(recruiterToken));
    expect(after.body.data.unreadCount).toBe(0);
  });
});

describe("SSE stream", () => {
  it("requires authentication", async () => {
    const res = await request(app).get("/api/notifications/stream");
    expect(res.status).toBe(401);
  });

  it("streams an event addressed to the connected user and nothing else", async () => {
    // supertest buffers whole responses, which never completes for a stream
    // that stays open — so this drives a real listening server directly.
    const server = createServer(app).listen(0);
    await once(server, "listening");
    const { port } = server.address() as AddressInfo;

    const received: string[] = [];
    const response = await new Promise<IncomingMessage>((resolve, reject) => {
      const req = httpGet(
        {
          host: "127.0.0.1",
          port,
          path: "/api/notifications/stream",
          headers: {
            Cookie: `accessToken=${recruiterToken}`,
            Accept: "text/event-stream",
          },
        },
        resolve,
      );
      req.on("error", reject);
    });

    response.setEncoding("utf8");
    response.on("data", (chunk: string) => received.push(chunk));

    try {
      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toContain("text/event-stream");

      // Let the handshake register the connection before publishing.
      await new Promise((resolve) => setTimeout(resolve, 300));

      const notification = (title: string) => ({
        id: randomUUID(),
        type: "new_application" as const,
        title,
        body: null,
        relatedApplicationId: null,
        relatedJobId: null,
        readAt: null,
        createdAt: new Date().toISOString(),
      });

      await publishRealtime({
        userIds: [secondRecruiter.id],
        event: {
          name: "notification",
          payload: notification("Addressed to someone else"),
        },
      });
      await publishRealtime({
        userIds: [recruiter.id],
        event: {
          name: "notification",
          payload: notification("Addressed to the connected recruiter"),
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 700));

      const body = received.join("");
      expect(body).toContain("event: ready");
      expect(body).toContain("event: notification");
      expect(body).toContain("Addressed to the connected recruiter");
      // Delivery is addressed, not filtered client-side: an event for another
      // user never reaches this socket at all.
      expect(body).not.toContain("Addressed to someone else");
    } finally {
      response.destroy();
      closeRealtimeClients();
      await new Promise((resolve) => server.close(resolve));
    }
  }, 20_000);
});
