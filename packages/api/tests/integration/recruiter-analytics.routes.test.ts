import { randomUUID } from "crypto";
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
import { closeRealtime } from "@starter-kit/shared/realtime";
import { app } from "../../app";
import { initializeDatabase } from "../../src/lib/db";
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

const DAY_MS = 24 * 60 * 60 * 1000;

let company: Company;
let emptyCompany: Company;
let recruiter: User;
let emptyCompanyRecruiter: User;
let candidate: User;
let candidateProfile: CandidateProfile;
let recruiterToken: string;
let emptyCompanyRecruiterToken: string;
let candidateToken: string;

const createdCompanyIds: string[] = [];
const createdUserIds: string[] = [];
const createdCandidateProfileIds: string[] = [];
const createdJobIds: string[] = [];
let databaseInitialized = false;

async function createJob(companyId: string, createdById: string): Promise<Job> {
  const job = await Job.create({
    companyId,
    createdById,
    title: `Analytics Job ${randomUUID()}`,
    description: "Analytics integration-test job",
    location: "Remote",
    status: "OPEN",
  });
  createdJobIds.push(job.id);
  return job;
}

/** One application per job, since a candidate may only apply to a job once. */
async function seedApplication(input: {
  companyId?: string;
  stage: "APPLIED" | "REVIEWED" | "INTERVIEWING" | "OFFER" | "HIRED" | "REJECTED";
  fitScore?: number | null;
  submittedDaysAgo?: number;
  hiredDaysAgo?: number;
}): Promise<Application> {
  const job = await createJob(
    input.companyId ?? company.id,
    input.companyId === emptyCompany.id ? emptyCompanyRecruiter.id : recruiter.id,
  );
  const submittedAt = new Date(
    Date.now() - (input.submittedDaysAgo ?? 30) * DAY_MS,
  );

  return Application.create({
    jobId: job.id,
    candidateProfileId: candidateProfile.id,
    stage: input.stage,
    submittedAt,
    fitScore: input.fitScore ?? null,
    aiScoringStatus: input.fitScore == null ? "failed" : "completed",
    hiredAt:
      input.hiredDaysAgo === undefined
        ? null
        : new Date(Date.now() - input.hiredDaysAgo * DAY_MS),
  });
}

beforeAll(async () => {
  await initializeDatabase();
  databaseInitialized = true;

  const suffix = randomUUID();

  company = await Company.create({ name: `Analytics Company ${suffix}` });
  createdCompanyIds.push(company.id);

  emptyCompany = await Company.create({
    name: `Analytics Empty Company ${suffix}`,
  });
  createdCompanyIds.push(emptyCompany.id);

  recruiter = await User.create({
    email: `analytics-recruiter-${suffix}@example.com`,
    passwordHash: "unused-in-these-tests",
    name: "Analytics Recruiter",
    role: "RECRUITER",
    companyId: company.id,
  });
  createdUserIds.push(recruiter.id);

  emptyCompanyRecruiter = await User.create({
    email: `analytics-empty-recruiter-${suffix}@example.com`,
    passwordHash: "unused-in-these-tests",
    name: "Empty Company Recruiter",
    role: "RECRUITER",
    companyId: emptyCompany.id,
  });
  createdUserIds.push(emptyCompanyRecruiter.id);

  candidate = await User.create({
    email: `analytics-candidate-${suffix}@example.com`,
    passwordHash: "unused-in-these-tests",
    name: "Analytics Candidate",
    role: "CANDIDATE",
  });
  createdUserIds.push(candidate.id);

  candidateProfile = await CandidateProfile.create({
    userId: candidate.id,
    headline: "Analytics Candidate",
  });
  createdCandidateProfileIds.push(candidateProfile.id);

  recruiterToken = tokenFor(recruiter);
  emptyCompanyRecruiterToken = tokenFor(emptyCompanyRecruiter);
  candidateToken = tokenFor(candidate);
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

describe("GET /api/recruiter/analytics", () => {
  it("requires an authenticated recruiter", async () => {
    const unauthenticated = await request(app).get("/api/recruiter/analytics");
    expect(unauthenticated.status).toBe(401);

    const candidateAttempt = await request(app)
      .get("/api/recruiter/analytics")
      .set("Cookie", cookie(candidateToken));
    expect(candidateAttempt.status).toBe(403);
  });

  it("returns a well-formed empty result for a company with no applications", async () => {
    const res = await request(app)
      .get("/api/recruiter/analytics")
      .set("Cookie", cookie(emptyCompanyRecruiterToken));

    expect(res.status).toBe(200);
    expect(res.body.data.totalApplications).toBe(0);
    // No division by zero anywhere in the empty case.
    expect(
      res.body.data.funnel.stages.every(
        (stage: { reachedPercentage: number }) =>
          Number.isFinite(stage.reachedPercentage),
      ),
    ).toBe(true);
    expect(res.body.data.timeToHire).toMatchObject({
      hiredCount: 0,
      averageDays: null,
      medianDays: null,
      trend: [],
    });
    expect(res.body.data.scoreDistribution).toMatchObject({
      scoredCount: 0,
      averageScore: null,
      medianScore: null,
    });
    expect(res.body.data.scoreDistribution.buckets).toHaveLength(5);
  });

  it("computes funnel reach and conversion from real rows", async () => {
    await seedApplication({ stage: "APPLIED", fitScore: 30 });
    await seedApplication({ stage: "REVIEWED", fitScore: 55 });
    await seedApplication({ stage: "INTERVIEWING", fitScore: 70 });
    await seedApplication({ stage: "OFFER", fitScore: 90 });
    await seedApplication({ stage: "REJECTED", fitScore: 15 });

    const res = await request(app)
      .get("/api/recruiter/analytics")
      .set("Cookie", cookie(recruiterToken));

    expect(res.status).toBe(200);
    expect(res.body.data.totalApplications).toBe(5);

    const stages = res.body.data.funnel.stages as Array<{
      stage: string;
      count: number;
      reached: number;
      conversionFromPrevious: number | null;
    }>;
    const byStage = Object.fromEntries(
      stages.map((stage) => [stage.stage, stage]),
    );

    // Reach counts anyone who got at least this far. All 5 applications
    // reached APPLIED — including the rejected one, which was submitted like
    // any other. Only its later progress is unknown without stage history.
    expect(byStage.APPLIED).toMatchObject({
      count: 1,
      reached: 5,
      conversionFromPrevious: null,
    });
    expect(byStage.REVIEWED).toMatchObject({ count: 1, reached: 3 });
    expect(byStage.REVIEWED.conversionFromPrevious).toBe(60);
    expect(byStage.INTERVIEWING).toMatchObject({ count: 1, reached: 2 });
    expect(byStage.OFFER).toMatchObject({ count: 1, reached: 1 });
    expect(byStage.HIRED).toMatchObject({ count: 0, reached: 0 });
    expect(res.body.data.funnel.rejected).toBe(1);

    // Seeded directly, so these rows have no recorded transitions: the
    // rejection cannot be attributed to the stage it left from.
    expect(res.body.data.funnel.unattributedRejections).toBe(1);

    // Reach must never increase down the funnel, or a conversion above 100%
    // becomes possible.
    const reaches = stages.map((stage) => stage.reached);
    for (let index = 1; index < reaches.length; index += 1) {
      expect(reaches[index]).toBeLessThanOrEqual(reaches[index - 1]);
    }
  });

  it("buckets fit scores and reports scored versus unscored", async () => {
    const res = await request(app)
      .get("/api/recruiter/analytics")
      .set("Cookie", cookie(recruiterToken));

    const distribution = res.body.data.scoreDistribution as {
      buckets: Array<{ label: string; count: number }>;
      scoredCount: number;
      unscoredCount: number;
      averageScore: number;
      medianScore: number;
    };
    const byLabel = Object.fromEntries(
      distribution.buckets.map((bucket) => [bucket.label, bucket.count]),
    );

    // 15, 30, 55, 70, 90 across contiguous 20-point bands.
    expect(byLabel["0–20"]).toBe(1);
    expect(byLabel["21–40"]).toBe(1);
    expect(byLabel["41–60"]).toBe(1);
    expect(byLabel["61–80"]).toBe(1);
    expect(byLabel["81–100"]).toBe(1);
    expect(distribution.scoredCount).toBe(5);
    expect(distribution.unscoredCount).toBe(0);
    expect(distribution.averageScore).toBe(52);
    expect(distribution.medianScore).toBe(55);

    const bucketTotal = distribution.buckets.reduce(
      (sum, bucket) => sum + bucket.count,
      0,
    );
    expect(bucketTotal).toBe(distribution.scoredCount);
  });

  it("reports no time-to-hire until an application is actually hired", async () => {
    const res = await request(app)
      .get("/api/recruiter/analytics")
      .set("Cookie", cookie(recruiterToken));

    // Five applications exist, none hired — the metric must be absent, not 0.
    expect(res.body.data.timeToHire).toMatchObject({
      hiredCount: 0,
      averageDays: null,
      medianDays: null,
    });
  });

  it("measures time-to-hire from submission to the hire itself", async () => {
    await seedApplication({
      stage: "HIRED",
      fitScore: 88,
      submittedDaysAgo: 40,
      hiredDaysAgo: 20,
    });
    await seedApplication({
      stage: "HIRED",
      fitScore: 76,
      submittedDaysAgo: 30,
      hiredDaysAgo: 20,
    });

    const res = await request(app)
      .get("/api/recruiter/analytics")
      .set("Cookie", cookie(recruiterToken));

    const timeToHire = res.body.data.timeToHire as {
      hiredCount: number;
      averageDays: number;
      medianDays: number;
      fastestDays: number;
      slowestDays: number;
      trend: Array<{ month: string; hires: number; averageDays: number }>;
    };

    // 20 days and 10 days.
    expect(timeToHire.hiredCount).toBe(2);
    expect(timeToHire.averageDays).toBe(15);
    expect(timeToHire.medianDays).toBe(15);
    expect(timeToHire.fastestDays).toBe(10);
    expect(timeToHire.slowestDays).toBe(20);
    expect(timeToHire.trend.length).toBeGreaterThan(0);
    expect(
      timeToHire.trend.reduce((sum, point) => sum + point.hires, 0),
    ).toBe(2);
  });

  it("never leaks another company's applications", async () => {
    const mine = await request(app)
      .get("/api/recruiter/analytics")
      .set("Cookie", cookie(recruiterToken));
    const theirs = await request(app)
      .get("/api/recruiter/analytics")
      .set("Cookie", cookie(emptyCompanyRecruiterToken));

    expect(mine.body.data.totalApplications).toBe(7);
    // The other company's recruiter still sees nothing despite seven rows
    // existing in the table.
    expect(theirs.body.data.totalApplications).toBe(0);
    expect(theirs.body.data.timeToHire.hiredCount).toBe(0);
    expect(theirs.body.data.scoreDistribution.scoredCount).toBe(0);
  });
});
