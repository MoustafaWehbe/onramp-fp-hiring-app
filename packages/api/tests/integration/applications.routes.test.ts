import { randomUUID } from "crypto";
import request from "supertest";
import { signAccessToken } from "@starter-kit/shared/auth";
import {
  Application,
  CandidateProfile,
  Company,
  Job,
  User,
  getSequelize,
} from "@starter-kit/shared/db";
import type { ApplicationStage } from "@starter-kit/shared/db";
import { app } from "../../app";
import { initializeDatabase } from "../../src/lib/db";

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

const APPLICATION_KEYS = [
  "id",
  "jobId",
  "stage",
  "coverLetter",
  "resumeUrl",
  "submittedAt",
  "createdAt",
  "updatedAt",
  "job",
].sort();

const JOB_KEYS = [
  "id",
  "title",
  "description",
  "location",
  "status",
  "createdAt",
  "company",
].sort();

const COMPANY_KEYS = ["id", "name", "website", "logoUrl"].sort();

let company: Company;
let recruiter: User;
let candidateA: User;
let candidateB: User;
let draftOnlyCandidate: User;
let candidateWithoutProfile: User;
let candidateProfileA: CandidateProfile;
let candidateProfileB: CandidateProfile;
let draftOnlyCandidateProfile: CandidateProfile;
let recruiterToken: string;
let candidateAToken: string;
let candidateBToken: string;
let candidateWithoutProfileToken: string;

let ownDraftApplication: Application;
let ownHistoricalApplication: Application;
let otherCandidateApplication: Application;
let transitionDraftApplication: Application;
let submittedDuplicateApplication: Application;
let concurrentDraftApplication: Application;
let pipelineDraftApplication: Application;
let pipelineSubmittedApplication: Application;
let draftOnlyProfileApplication: Application;

let historicalClosedJob: Job;
let newApplicationJob: Job;
let transitionDraftJob: Job;
let submittedDuplicateJob: Job;
let closedApplicationJob: Job;
let concurrentApplicationJob: Job;
let concurrentDraftJob: Job;
let pipelineJob: Job;
let draftOnlyProfileJob: Job;

const createdCompanyIds: string[] = [];
const createdUserIds: string[] = [];
const createdCandidateProfileIds: string[] = [];
const createdJobIds: string[] = [];
let databaseInitialized = false;

async function createTrackedJob(input: {
  title: string;
  status?: "OPEN" | "CLOSED";
}): Promise<Job> {
  const job = await Job.create({
    companyId: company.id,
    createdById: recruiter.id,
    title: input.title,
    description: `${input.title} integration-test description`,
    location: "Remote",
    status: input.status ?? "OPEN",
  });
  createdJobIds.push(job.id);
  return job;
}

async function createApplication(input: {
  jobId: string;
  candidateProfileId: string;
  stage: ApplicationStage;
  coverLetter?: string;
  resumeUrl?: string;
  submittedAt?: Date;
}): Promise<Application> {
  return Application.create(input);
}

beforeAll(async () => {
  await initializeDatabase();
  databaseInitialized = true;

  const suffix = randomUUID();

  company = await Company.create({
    name: `Applications Company ${suffix}`,
    website: "https://applications.example.com",
    description: "Internal company description",
    logoUrl: "https://applications.example.com/logo.png",
  });
  createdCompanyIds.push(company.id);

  recruiter = await User.create({
    email: `applications-recruiter-${suffix}@example.com`,
    passwordHash: "unused-in-these-tests",
    name: "Applications Recruiter",
    role: "RECRUITER",
    companyId: company.id,
  });
  createdUserIds.push(recruiter.id);

  candidateA = await User.create({
    email: `applications-candidate-a-${suffix}@example.com`,
    passwordHash: "unused-in-these-tests",
    name: "Applications Candidate A",
    role: "CANDIDATE",
  });
  createdUserIds.push(candidateA.id);

  candidateB = await User.create({
    email: `applications-candidate-b-${suffix}@example.com`,
    passwordHash: "unused-in-these-tests",
    name: "Applications Candidate B",
    role: "CANDIDATE",
  });
  createdUserIds.push(candidateB.id);

  draftOnlyCandidate = await User.create({
    email: `applications-draft-only-${suffix}@example.com`,
    passwordHash: "unused-in-these-tests",
    name: "Applications Draft-Only Candidate",
    role: "CANDIDATE",
  });
  createdUserIds.push(draftOnlyCandidate.id);

  candidateWithoutProfile = await User.create({
    email: `applications-no-profile-${suffix}@example.com`,
    passwordHash: "unused-in-these-tests",
    name: "Applications Candidate Without Profile",
    role: "CANDIDATE",
  });
  createdUserIds.push(candidateWithoutProfile.id);

  candidateProfileA = await CandidateProfile.create({
    userId: candidateA.id,
    headline: "Candidate A",
    resumeUrl: "/uploads/resumes/candidate-a.pdf",
  });
  createdCandidateProfileIds.push(candidateProfileA.id);

  candidateProfileB = await CandidateProfile.create({
    userId: candidateB.id,
    headline: "Candidate B",
    resumeUrl: "/uploads/resumes/candidate-b.pdf",
  });
  createdCandidateProfileIds.push(candidateProfileB.id);

  draftOnlyCandidateProfile = await CandidateProfile.create({
    userId: draftOnlyCandidate.id,
    headline: "Draft-only candidate",
  });
  createdCandidateProfileIds.push(draftOnlyCandidateProfile.id);

  recruiterToken = tokenFor(recruiter);
  candidateAToken = tokenFor(candidateA);
  candidateBToken = tokenFor(candidateB);
  candidateWithoutProfileToken = tokenFor(candidateWithoutProfile);

  historicalClosedJob = await createTrackedJob({
    title: `Historical Closed Job ${suffix}`,
    status: "CLOSED",
  });
  const ownDraftJob = await createTrackedJob({
    title: `Own Draft Job ${suffix}`,
  });
  const otherCandidateJob = await createTrackedJob({
    title: `Other Candidate Job ${suffix}`,
  });
  newApplicationJob = await createTrackedJob({
    title: `New Application Job ${suffix}`,
  });
  transitionDraftJob = await createTrackedJob({
    title: `Transition Draft Job ${suffix}`,
  });
  submittedDuplicateJob = await createTrackedJob({
    title: `Submitted Duplicate Job ${suffix}`,
  });
  closedApplicationJob = await createTrackedJob({
    title: `Closed Application Job ${suffix}`,
    status: "CLOSED",
  });
  concurrentApplicationJob = await createTrackedJob({
    title: `Concurrent Application Job ${suffix}`,
  });
  concurrentDraftJob = await createTrackedJob({
    title: `Concurrent Draft Job ${suffix}`,
  });
  pipelineJob = await createTrackedJob({
    title: `Pipeline Job ${suffix}`,
  });
  draftOnlyProfileJob = await createTrackedJob({
    title: `Draft-Only Profile Job ${suffix}`,
  });

  ownDraftApplication = await createApplication({
    jobId: ownDraftJob.id,
    candidateProfileId: candidateProfileA.id,
    stage: "DRAFT",
    coverLetter: "Candidate-only draft",
  });
  ownHistoricalApplication = await createApplication({
    jobId: historicalClosedJob.id,
    candidateProfileId: candidateProfileA.id,
    stage: "APPLIED",
    coverLetter: "Historical submitted application",
    resumeUrl: candidateProfileA.resumeUrl,
    submittedAt: new Date("2025-01-02T03:04:05.000Z"),
  });
  otherCandidateApplication = await createApplication({
    jobId: otherCandidateJob.id,
    candidateProfileId: candidateProfileB.id,
    stage: "APPLIED",
    coverLetter: "Candidate B application",
    resumeUrl: candidateProfileB.resumeUrl,
    submittedAt: new Date("2025-02-03T04:05:06.000Z"),
  });
  transitionDraftApplication = await createApplication({
    jobId: transitionDraftJob.id,
    candidateProfileId: candidateProfileA.id,
    stage: "DRAFT",
    coverLetter: "Original draft cover letter",
    resumeUrl: "/uploads/resumes/stale-draft.pdf",
  });
  submittedDuplicateApplication = await createApplication({
    jobId: submittedDuplicateJob.id,
    candidateProfileId: candidateProfileA.id,
    stage: "REVIEWED",
    coverLetter: "Already submitted",
    resumeUrl: candidateProfileA.resumeUrl,
    submittedAt: new Date("2025-03-04T05:06:07.000Z"),
  });
  concurrentDraftApplication = await createApplication({
    jobId: concurrentDraftJob.id,
    candidateProfileId: candidateProfileA.id,
    stage: "DRAFT",
    coverLetter: "Concurrent draft",
  });
  pipelineDraftApplication = await createApplication({
    jobId: pipelineJob.id,
    candidateProfileId: candidateProfileA.id,
    stage: "DRAFT",
    coverLetter: "Must remain candidate-only",
  });
  pipelineSubmittedApplication = await createApplication({
    jobId: pipelineJob.id,
    candidateProfileId: candidateProfileB.id,
    stage: "APPLIED",
    coverLetter: "Visible pipeline application",
    resumeUrl: candidateProfileB.resumeUrl,
    submittedAt: new Date("2025-04-05T06:07:08.000Z"),
  });
  draftOnlyProfileApplication = await createApplication({
    jobId: draftOnlyProfileJob.id,
    candidateProfileId: draftOnlyCandidateProfile.id,
    stage: "DRAFT",
    coverLetter: "This must not expose the candidate to recruiters",
  });
});

afterAll(async () => {
  if (!databaseInitialized) {
    return;
  }

  try {
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
    await getSequelize().close();
  }
});

describe("GET /api/applications/me", () => {
  it("requires authentication and the CANDIDATE role", async () => {
    const unauthenticated = await request(app).get("/api/applications/me");
    expect(unauthenticated.status).toBe(401);

    const forbidden = await request(app)
      .get("/api/applications/me")
      .set("Cookie", cookie(recruiterToken));
    expect(forbidden.status).toBe(403);
    expect(forbidden.body.error).toBe("Insufficient permissions");

    const missingProfile = await request(app)
      .get("/api/applications/me")
      .set("Cookie", cookie(candidateWithoutProfileToken));
    expect(missingProfile.status).toBe(404);
    expect(missingProfile.body.error).toBe("Candidate profile not found");
  });

  it("returns only the caller's applications, including DRAFT and historical CLOSED jobs", async () => {
    const res = await request(app)
      .get("/api/applications/me")
      .set("Cookie", cookie(candidateAToken));

    expect(res.status).toBe(200);

    const applications = res.body.data as Array<{
      id: string;
      stage: string;
      job: {
        id: string;
        status: string;
        company: { id: string };
      };
    }>;
    const ids = applications.map((application) => application.id);

    expect(ids).toEqual(
      expect.arrayContaining([
        ownDraftApplication.id,
        ownHistoricalApplication.id,
      ]),
    );
    expect(ids).not.toContain(otherCandidateApplication.id);

    expect(
      applications.find(
        (application) => application.id === ownDraftApplication.id,
      )?.stage,
    ).toBe("DRAFT");
    expect(
      applications.find(
        (application) => application.id === ownHistoricalApplication.id,
      )?.job.status,
    ).toBe("CLOSED");
  });

  it("uses the candidate-safe application, job, and company response shape", async () => {
    const res = await request(app)
      .get("/api/applications/me")
      .set("Cookie", cookie(candidateAToken));

    expect(res.status).toBe(200);

    const application = res.body.data.find(
      (item: { id: string }) => item.id === ownHistoricalApplication.id,
    );
    expect(application).toBeDefined();
    expect(Object.keys(application).sort()).toEqual(APPLICATION_KEYS);
    expect(Object.keys(application.job).sort()).toEqual(JOB_KEYS);
    expect(Object.keys(application.job.company).sort()).toEqual(COMPANY_KEYS);
    expect(application).toMatchObject({
      id: ownHistoricalApplication.id,
      jobId: historicalClosedJob.id,
      stage: "APPLIED",
      job: {
        id: historicalClosedJob.id,
        title: historicalClosedJob.title,
        status: "CLOSED",
        company: {
          id: company.id,
          name: company.name,
          website: company.website,
          logoUrl: company.logoUrl,
        },
      },
    });
    expect(application).not.toHaveProperty("candidateProfileId");
    expect(application.job).not.toHaveProperty("companyId");
    expect(application.job).not.toHaveProperty("createdById");
    expect(application.job.company).not.toHaveProperty("description");
  });

  it("resolves scope independently for another candidate", async () => {
    const res = await request(app)
      .get("/api/applications/me")
      .set("Cookie", cookie(candidateBToken));

    expect(res.status).toBe(200);

    const ids = res.body.data.map((application: { id: string }) => application.id);
    expect(ids).toContain(otherCandidateApplication.id);
    expect(ids).toContain(pipelineSubmittedApplication.id);
    expect(ids).not.toContain(ownDraftApplication.id);
    expect(ids).not.toContain(ownHistoricalApplication.id);
  });
});

describe("POST /api/applications", () => {
  it("creates an APPLIED application for an OPEN job with server-controlled fields", async () => {
    const beforeSubmission = Date.now();
    const res = await request(app)
      .post("/api/applications")
      .set("Cookie", cookie(candidateAToken))
      .send({
        jobId: newApplicationJob.id,
        coverLetter: "A newly submitted application",
        candidateProfileId: candidateProfileB.id,
        stage: "HIRED",
        resumeUrl: "/uploads/resumes/client-controlled.pdf",
        submittedAt: "2000-01-01T00:00:00.000Z",
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      jobId: newApplicationJob.id,
      candidateProfileId: candidateProfileA.id,
      stage: "APPLIED",
      coverLetter: "A newly submitted application",
      resumeUrl: candidateProfileA.resumeUrl,
    });

    const submittedAt = Date.parse(res.body.data.submittedAt);
    expect(submittedAt).toBeGreaterThanOrEqual(beforeSubmission);
    expect(submittedAt).toBeLessThanOrEqual(Date.now());

    const persisted = await Application.findByPk(res.body.data.id);
    expect(persisted).not.toBeNull();
    expect(persisted).toMatchObject({
      jobId: newApplicationJob.id,
      candidateProfileId: candidateProfileA.id,
      stage: "APPLIED",
      resumeUrl: candidateProfileA.resumeUrl,
    });
    expect(persisted!.submittedAt!.getTime()).toBe(submittedAt);
  });

  it("submits an existing DRAFT in place and returns 200", async () => {
    const res = await request(app)
      .post("/api/applications")
      .set("Cookie", cookie(candidateAToken))
      .send({
        jobId: transitionDraftJob.id,
        coverLetter: "Final cover letter",
      });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      id: transitionDraftApplication.id,
      jobId: transitionDraftJob.id,
      candidateProfileId: candidateProfileA.id,
      stage: "APPLIED",
      coverLetter: "Final cover letter",
      resumeUrl: candidateProfileA.resumeUrl,
    });
    expect(res.body.data.submittedAt).toBeTruthy();

    const rows = await Application.findAll({
      where: {
        jobId: transitionDraftJob.id,
        candidateProfileId: candidateProfileA.id,
      },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(transitionDraftApplication.id);
    expect(rows[0].stage).toBe("APPLIED");
  });

  it("returns 409 when the candidate already submitted for the job", async () => {
    const res = await request(app)
      .post("/api/applications")
      .set("Cookie", cookie(candidateAToken))
      .send({
        jobId: submittedDuplicateJob.id,
        coverLetter: "Duplicate submission",
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe("You have already applied for this job");

    await submittedDuplicateApplication.reload();
    expect(submittedDuplicateApplication.stage).toBe("REVIEWED");
    expect(submittedDuplicateApplication.coverLetter).toBe("Already submitted");
  });

  it("returns 404 when applying to a CLOSED job", async () => {
    const res = await request(app)
      .post("/api/applications")
      .set("Cookie", cookie(candidateAToken))
      .send({ jobId: closedApplicationJob.id });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Job not found");
    expect(
      await Application.count({
        where: {
          jobId: closedApplicationJob.id,
          candidateProfileId: candidateProfileA.id,
        },
      }),
    ).toBe(0);
  });

  it("allows exactly one create under concurrent duplicate submissions", async () => {
    const responses = await Promise.all([
      request(app)
        .post("/api/applications")
        .set("Cookie", cookie(candidateAToken))
        .send({ jobId: concurrentApplicationJob.id }),
      request(app)
        .post("/api/applications")
        .set("Cookie", cookie(candidateAToken))
        .send({ jobId: concurrentApplicationJob.id }),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([
      201, 409,
    ]);

    const created = responses.find((response) => response.status === 201)!;
    const duplicate = responses.find((response) => response.status === 409)!;
    expect(created.body.data.stage).toBe("APPLIED");
    expect(duplicate.body.error).toBe(
      "You have already applied for this job",
    );

    const rows = await Application.findAll({
      where: {
        jobId: concurrentApplicationJob.id,
        candidateProfileId: candidateProfileA.id,
      },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(created.body.data.id);
    expect(rows[0].stage).toBe("APPLIED");
  });

  it("allows exactly one submission of an existing DRAFT", async () => {
    const responses = await Promise.all([
      request(app)
        .post("/api/applications")
        .set("Cookie", cookie(candidateAToken))
        .send({
          jobId: concurrentDraftJob.id,
          coverLetter: "First concurrent draft submission",
        }),
      request(app)
        .post("/api/applications")
        .set("Cookie", cookie(candidateAToken))
        .send({
          jobId: concurrentDraftJob.id,
          coverLetter: "Second concurrent draft submission",
        }),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([
      200, 409,
    ]);

    await concurrentDraftApplication.reload();
    expect(concurrentDraftApplication.stage).toBe("APPLIED");
    expect(concurrentDraftApplication.submittedAt).toBeDefined();
    expect(
      await Application.count({
        where: {
          jobId: concurrentDraftJob.id,
          candidateProfileId: candidateProfileA.id,
        },
      }),
    ).toBe(1);
  });
});

describe("recruiter application pipeline", () => {
  it("shows a newly submitted application in the owning recruiter's pipeline", async () => {
    const job = await createTrackedJob({
      title: `New Pipeline Submission ${randomUUID()}`,
    });

    const submission = await request(app)
      .post("/api/applications")
      .set("Cookie", cookie(candidateAToken))
      .send({
        jobId: job.id,
        coverLetter: "Ready for recruiter review",
      });

    expect(submission.status).toBe(201);
    expect(submission.body.data).toMatchObject({
      jobId: job.id,
      candidateProfileId: candidateProfileA.id,
      stage: "APPLIED",
    });

    const pipeline = await request(app)
      .get(`/api/applications/job/${job.id}`)
      .set("Cookie", cookie(recruiterToken));

    expect(pipeline.status).toBe(200);

    const application = pipeline.body.data.find(
      (item: { id: string }) => item.id === submission.body.data.id,
    );
    expect(application).toMatchObject({
      id: submission.body.data.id,
      jobId: job.id,
      candidateProfileId: candidateProfileA.id,
      stage: "APPLIED",
      coverLetter: "Ready for recruiter review",
      candidateProfile: {
        id: candidateProfileA.id,
        user: {
          id: candidateA.id,
          name: candidateA.name,
          email: candidateA.email,
        },
      },
    });
  });

  it("excludes DRAFT applications from the job pipeline", async () => {
    const res = await request(app)
      .get(`/api/applications/job/${pipelineJob.id}`)
      .set("Cookie", cookie(recruiterToken));

    expect(res.status).toBe(200);

    const ids = res.body.data.map((application: { id: string }) => application.id);
    expect(ids).toContain(pipelineSubmittedApplication.id);
    expect(ids).not.toContain(pipelineDraftApplication.id);
    expect(
      res.body.data.every(
        (application: { stage: string }) => application.stage !== "DRAFT",
      ),
    ).toBe(true);
  });

  it("404s when a recruiter attempts to mutate a DRAFT application", async () => {
    const res = await request(app)
      .patch(`/api/applications/${pipelineDraftApplication.id}/stage`)
      .set("Cookie", cookie(recruiterToken))
      .send({ stage: "REVIEWED" });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("Application not found");

    await pipelineDraftApplication.reload();
    expect(pipelineDraftApplication.stage).toBe("DRAFT");
  });

  it("does not expose a candidate whose only application is a DRAFT", async () => {
    const list = await request(app)
      .get("/api/candidate-profiles")
      .set("Cookie", cookie(recruiterToken));

    expect(list.status).toBe(200);
    expect(
      list.body.data.map((profile: { id: string }) => profile.id),
    ).not.toContain(draftOnlyCandidateProfile.id);

    const detail = await request(app)
      .get(`/api/candidate-profiles/${draftOnlyCandidateProfile.id}`)
      .set("Cookie", cookie(recruiterToken));

    expect(detail.status).toBe(404);
    expect(detail.body.error).toBe("Candidate profile not found");

    await draftOnlyProfileApplication.reload();
    expect(draftOnlyProfileApplication.stage).toBe("DRAFT");
  });
});
